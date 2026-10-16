import type { AgentInputItem, Session } from '@openai/agents';
import type { CopilotKnowledgeAttachment } from './attachments';

const validRoles = new Set(['assistant', 'system', 'tool', 'user']);

interface StoredMessage {
  content?: unknown;
  messageId?: string;
  metadata?: Record<string, unknown>;
  role?: string;
}

interface EdgeOneAgentStore {
  appendMessage(input: Record<string, unknown>): Promise<string>;
  clearMessages(input: { conversationId: string }): Promise<void>;
  deleteMessage(input: { conversationId: string; messageId: string }): Promise<void>;
  getConversation(input: { conversationId: string }): Promise<Record<string, any>>;
  getMessages(input: Record<string, unknown>): Promise<StoredMessage[]>;
  updateConversation(input: Record<string, unknown>): Promise<unknown>;
}

function normalizeItem(item: AgentInputItem) {
  if (item && typeof item === 'object') return item as Record<string, unknown>;
  return { content: String(item), role: 'tool' };
}

function roleForItem(item: Record<string, unknown>) {
  if (typeof item.role === 'string' && validRoles.has(item.role)) return item.role;
  if (item.type === 'function_call_output' || item.type === 'computer_call_output') return 'tool';
  return 'assistant';
}

function storedMessageToItem(message: StoredMessage): AgentInputItem | null {
  if (message.metadata?.contentStudioIndexOnly === true) return null;
  if (message.metadata?.agent_sdk_session === true && message.content && typeof message.content === 'object') {
    return message.content as AgentInputItem;
  }
  if (message.role && validRoles.has(message.role)) {
    return { content: message.content ?? '', role: message.role } as AgentInputItem;
  }
  return null;
}

function attachmentMetadata(attachments: CopilotKnowledgeAttachment[]) {
  return attachments.map(({ content: _content, ...attachment }) => attachment);
}

// 将 Agent SDK 会话映射到 EdgeOne 托管存储，持久化会话元数据和消息记录。
export function createEdgeOneSession({
  attachments,
  conversationId,
  projectId,
  store,
  title,
  userId,
}: {
  attachments: CopilotKnowledgeAttachment[];
  conversationId: string;
  projectId: string;
  store: EdgeOneAgentStore;
  title: string;
  userId: string;
}): Session {
  const selectedAttachments = attachmentMetadata(attachments);
  let wroteUserAttachmentMetadata = false;
  let wroteAssistantSourceMetadata = false;

  async function updateMetadata() {
    const conversation = await store.getConversation({ conversationId });
    const currentMetadata = conversation.metadata && typeof conversation.metadata === 'object'
      ? conversation.metadata
      : {};
    await store.updateConversation({
      conversationId,
      metadata: {
        ...currentMetadata,
        projectId,
        title: currentMetadata.title || title,
      },
    });
  }

  return {
    async addItems(items) {
      for (const rawItem of items) {
        const item = normalizeItem(rawItem);
        const role = roleForItem(item);
        const metadata: Record<string, unknown> = {
          agent_sdk_session: true,
          item_type: typeof item.type === 'string' ? item.type : undefined,
        };

        if (role === 'user' && selectedAttachments.length && !wroteUserAttachmentMetadata) {
          metadata.contentStudioAttachments = selectedAttachments;
          wroteUserAttachmentMetadata = true;
        }
        if (role === 'assistant' && selectedAttachments.length && !wroteAssistantSourceMetadata) {
          metadata.contentStudioSources = attachments.map((attachment) => ({
            id: attachment.id,
            snippet: attachment.content.slice(0, 240),
            title: attachment.title,
            type: attachment.kind,
            url: attachment.sourceUrl,
          }));
          wroteAssistantSourceMetadata = true;
        }

        // 每条 Agent 输入输出都写入 EdgeOne 会话存储，供历史记录和后续上下文恢复使用。
        await store.appendMessage({
          content: item,
          conversationId,
          metadata,
          role,
          userId,
        });
      }
      if (items.length) await updateMetadata();
    },

    async clearSession() {
      await store.clearMessages({ conversationId });
    },

    async getItems(limit = 80) {
      // 从 EdgeOne 会话存储读取最近消息，恢复 Agent SDK 的连续上下文。
      const messages = await store.getMessages({
        conversationId,
        limit: Math.min(Math.max(limit, 1), 100),
        order: 'desc',
      });
      return messages.reverse().map(storedMessageToItem).filter((item): item is AgentInputItem => Boolean(item));
    },

    async getSessionId() {
      return conversationId;
    },

    async popItem() {
      const messages = await store.getMessages({ conversationId, limit: 100, order: 'desc' });
      for (const message of messages) {
        const item = storedMessageToItem(message);
        if (!item || !message.messageId) continue;
        await store.deleteMessage({ conversationId, messageId: message.messageId });
        return item;
      }
      return undefined;
    },
  };
}
