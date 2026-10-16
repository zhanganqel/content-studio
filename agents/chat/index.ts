import OpenAI from 'openai';
import { Agent, OpenAIChatCompletionsModel, run } from '@openai/agents';
import {
  buildAttachmentContext,
  normalizeKnowledgeAttachments,
  toSourceEvent,
} from '../_shared/attachments';
import { createLogger } from '../_shared/logger';
import { COPILOT_SYSTEM_PROMPT } from '../_shared/prompt';
import { createEdgeOneSession } from '../_shared/session';
import { createSseResponse, type CopilotSseEvent } from '../_shared/sse';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const logger = createLogger('content-studio-chat');

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    status,
  });
}

function pickString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function deriveTitle(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();
  return normalized.length > 36 ? `${normalized.slice(0, 36)}...` : normalized;
}

async function readBody(context: any): Promise<Record<string, unknown>> {
  if (context.request?.body && typeof context.request.body === 'object') {
    return context.request.body as Record<string, unknown>;
  }
  try {
    const data = await context.request.json();
    return data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export async function onRequest(context: any) {
  const body = await readBody(context);
  const message = pickString(body.message);
  const projectId = pickString(body.projectId);
  const userId = pickString(body.userId);
  const requestedConversationId = pickString(body.conversationId);
  const conversationId = pickString(context.conversation_id);
  const signal: AbortSignal | undefined = context.request?.signal;

  if (!message || !projectId || !userId || !requestedConversationId || !conversationId) {
    return jsonResponse({
      error: 'Makers-Conversation-Id, conversationId, projectId, userId, and message are required.',
    }, 400);
  }
  if (!UUID_PATTERN.test(conversationId)) {
    return jsonResponse({ error: 'conversationId must be a UUID.' }, 400);
  }
  if (requestedConversationId !== conversationId) {
    return jsonResponse({ error: 'Conversation ID does not match Makers-Conversation-Id.' }, 409);
  }

  let attachments;
  try {
    attachments = normalizeKnowledgeAttachments(body.attachments);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
  }

  logger.log(`[request] project=${projectId}, conversation=${conversationId}, attachments=${attachments.length}`);

  const env = context.env as Record<string, string | undefined>;
  if (!env.AI_GATEWAY_API_KEY || !env.AI_GATEWAY_BASE_URL) {
    return jsonResponse({ error: 'The AI gateway is not configured.' }, 503);
  }

  const client = new OpenAI({
    apiKey: env.AI_GATEWAY_API_KEY,
    baseURL: env.AI_GATEWAY_BASE_URL,
  });
  const modelName = env.AI_GATEWAY_MODEL || DEFAULT_MODEL;
  const model = new OpenAIChatCompletionsModel(client, modelName);
  const agent = new Agent({
    instructions: COPILOT_SYSTEM_PROMPT,
    model,
    name: 'Content Studio Copilot',
    tools: [],
  });
  // context.store 是 EdgeOne 托管会话存储，聊天消息不会写入浏览器业务草稿。
  const session = createEdgeOneSession({
    attachments,
    conversationId,
    projectId,
    store: context.store,
    title: deriveTitle(message),
    userId,
  });
  const attachmentContext = buildAttachmentContext(attachments);
  const prompt = attachmentContext ? `${message}\n\n${attachmentContext}` : message;

  return createSseResponse(
    async function* (): AsyncGenerator<CopilotSseEvent, void, unknown> {
      yield {
        agentId: 'copilot',
        content: '正在分析当前请求和已选择的参考资料。',
        kind: 'analysis',
        sequence: 1,
        type: 'process_delta',
      };

      for (const attachment of attachments) {
        yield {
          agentId: 'copilot',
          source: toSourceEvent(attachment),
          type: 'source',
        };
      }

      const result = await run(agent, prompt, { session, signal, stream: true });
      for await (const event of result.toStream()) {
        if (signal?.aborted) break;
        if (event.type === 'raw_model_stream_event' && event.data?.type === 'output_text_delta') {
          yield {
            agentId: 'copilot',
            content: String(event.data.delta || ''),
            type: 'message_delta',
          };
        }
      }

      yield {
        agentId: 'copilot',
        content: `已由 ${modelName} 完成本轮回复。`,
        kind: 'summary',
        sequence: 2,
        type: 'process_delta',
      };
    },
    { logger, signal },
  );
}
