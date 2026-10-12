import { z } from 'zod';

export const NotificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    'system',
    'game_update',
    'team_invite',
    'rating_change',
    'rating_updated',
    'game_invitation',
    'game_joined',
    'game_cancelled',
    'game_confirmed',
    'result_submitted',
    'result_verified',
    'result_disputed',
    'feedback_received',
  ]),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
  data: z.record(z.unknown()).optional(),
});

export const NotificationsListResponseSchema = z.object({
  notifications: z.array(NotificationItemSchema),
  unreadCount: z.number().int().min(0),
});

export const RealtimeNotificationEventSchema = z.object({
  eventType: z.literal('notification.received'),
  notification: NotificationItemSchema,
});

export type NotificationItem = z.infer<typeof NotificationItemSchema>;
export type NotificationsListResponse = z.infer<typeof NotificationsListResponseSchema>;
export type RealtimeNotificationEvent = z.infer<typeof RealtimeNotificationEventSchema>;
