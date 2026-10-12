export const AdminModerationActions = {
  USER_SUSPEND: 'user_suspend',
  USER_REINSTATE: 'user_reinstate',
  USER_ROLE_CHANGE: 'user_role_change',
  GAME_CANCEL: 'game_cancel',
  DISPUTE_RESOLVE: 'dispute_resolve',
  DISPUTE_VOID: 'dispute_void',
} as const;

export type AdminModerationAction =
  (typeof AdminModerationActions)[keyof typeof AdminModerationActions];

export const DisputeResolutionActions = {
  ACCEPT_PROPOSAL: 'accept_proposal',
  CUSTOM_SCORE: 'custom_score',
} as const;

export type DisputeResolutionAction =
  (typeof DisputeResolutionActions)[keyof typeof DisputeResolutionActions];
