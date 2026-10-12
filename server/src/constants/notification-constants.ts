export const NotificationTypes = {
  SYSTEM: 'system',
  GAME_UPDATE: 'game_update',
  TEAM_INVITE: 'team_invite',
  RATING_CHANGE: 'rating_change',
  RATING_UPDATED: 'rating_updated',
  GAME_INVITATION: 'game_invitation',
  GAME_JOINED: 'game_joined',
  GAME_CANCELLED: 'game_cancelled',
  GAME_CONFIRMED: 'game_confirmed',
  RESULT_SUBMITTED: 'result_submitted',
  RESULT_VERIFIED: 'result_verified',
  RESULT_DISPUTED: 'result_disputed',
  FEEDBACK_RECEIVED: 'feedback_received',
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NOTIFICATION_TITLE_MAX_LENGTH = 200;
export const NOTIFICATION_MESSAGE_MAX_LENGTH = 1000;
export const NOTIFICATION_PAGE_SIZE_DEFAULT = 20;
export const NOTIFICATION_PAGE_SIZE_MAX = 50;
