import type { NotificationsListResponse } from './contract.js';
import type { ApiClient } from '../../client/api-client.js';

/**
 * Fetches the current user's notification list and unread count.
 * GET /api/v1/notifications
 *
 * The ApiClient already unwraps the { success: true, data: T } envelope.
 */
export async function getLiveNotifications(
  client: ApiClient,
): Promise<NotificationsListResponse> {
  const data = await client.get<NotificationsListResponse>('/notifications');
  return data as NotificationsListResponse;
}
