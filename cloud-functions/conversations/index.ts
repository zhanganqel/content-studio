import { jsonResponse, pickString, readJsonBody } from '../_shared/http';

function pickItems(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.conversations)) return value.conversations;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeConversation(value: any) {
  const id = String(value?.id ?? value?.conversationId ?? value?.conversation_id ?? '').trim();
  if (!id) return null;
  const metadata = value?.metadata && typeof value.metadata === 'object' ? value.metadata : {};
  const createdAt = value?.createdAt ?? value?.created_at ?? new Date().toISOString();
  const updatedAt = value?.lastMessageAt ?? value?.last_message_at ?? value?.updatedAt ?? value?.updated_at ?? createdAt;
  return {
    createdAt,
    id,
    messageCount: Number(value?.messageCount ?? value?.message_count ?? 0),
    preview: String(value?.preview ?? value?.lastMessage ?? value?.last_message ?? ''),
    projectId: String(metadata.projectId ?? ''),
    title: String(value?.title ?? metadata.title ?? 'New conversation'),
    updatedAt,
  };
}

export async function onRequestPost(context: any) {
  const body = await readJsonBody(context);
  const userId = pickString(body, 'userId', 'user_id');
  const projectId = pickString(body, 'projectId', 'project_id');
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 100);

  if (!userId || !projectId) {
    return jsonResponse({ error: 'userId and projectId are required.' }, 400);
  }

  try {
    // 从 EdgeOne 托管存储读取当前用户的会话索引，再按项目筛选。
    const result = await context.agent.store.listConversations({
      limit,
      order: 'desc',
      userId,
    });
    const conversations = pickItems(result)
      .map(normalizeConversation)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => !item.projectId || item.projectId === projectId);

    return jsonResponse({ conversations });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
