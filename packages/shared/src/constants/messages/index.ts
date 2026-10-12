export const COMMON_MESSAGES = {
  demoData: 'Demo Data',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  retry: 'Try again',
  search: 'Search',
  filter: 'Filter',
  confirm: 'Confirm',
  delete: 'Delete',
  back: 'Back',
  continue: 'Continue',
} as const;

export const GAME_STATUS_MESSAGES = {
  open: 'Open',
  full: 'Full / Waitlist',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
} as const;

export const CONFIDENCE_MESSAGES = {
  high: 'High Confidence',
  medium: 'Moderate Fit',
  low: 'Tentative Match',
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_UNAUTHORIZED: 'Please sign in to access this data.',
  AUTH_INVALID_CREDENTIALS: 'The email or password provided is incorrect.',
  FORBIDDEN_ACCESS: 'You do not have permission to perform this action.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  GAME_FULL: 'This game has reached its maximum player capacity.',
  GAME_LOCKED: 'This game is locked and no further changes are permitted.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  NETWORK_ERROR: 'Could not connect to the server. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};
