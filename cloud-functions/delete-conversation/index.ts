import { jsonResponse, pickString, readJsonBody } from '../_shared/http';
import { canAccessConversation } from '../_shared/access';

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
    // 删除 EdgeOne 托管存储中的会话索引及其关联消息记录。
    await context.agent.store.deleteConversation({ conversationId, userId });
    return jsonResponse({ conversationId, status: 'ok' });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
