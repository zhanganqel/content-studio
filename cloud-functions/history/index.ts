import { jsonResponse, pickString, readJsonBody } from '../_shared/http';
import { canAccessConversation } from '../_shared/access';
import { normalizeStoredMessages } from '../_shared/messages';

export async function onRequestPost(context: any) {
  const body = await readJsonBody(context);
  const conversationId = pickString(body, 'conversationId', 'conversation_id');
  const userId = pickString(body, 'userId', 'user_id');

  if (!conversationId || !userId) {
    return jsonResponse({ error: 'conversationId and userId are required.' }, 400);
  }

  try {
    if (!await canAccessConversation(context.agent.store, conversationId, userId)) {
      return jsonResponse({ error: 'Conversation not found.' }, 404);
    }
    // 从 EdgeOne 托管存储读取指定会话的持久化消息历史。
    const items = await context.agent.store.getMessages({
      conversationId,
      limit: 100,
      order: 'asc',
    });
    return jsonResponse({
      conversationId,
      messages: normalizeStoredMessages(Array.isArray(items) ? items : []),
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
