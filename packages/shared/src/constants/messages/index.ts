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

export const AUTH_MESSAGES = {
  loginTitle: 'Welcome back',
  loginSubtitle: 'Enter your credentials to access your PlayMatch account',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  signInButton: 'Sign in',
  signingInButton: 'Signing in...',
  invalidCredentials: 'Email or password is incorrect.',
  accountLocked: 'Email or password is incorrect.', // Explicitly generic to prevent account enumeration
  rateLimited: 'Too many attempts. Please try again in a few minutes.',
  networkError: 'Unable to connect to server. Please check your internet connection.',
  unknownError: 'An unexpected error occurred. Please try again.',
  forgotPasswordLink: 'Forgot password?',
  noAccountPrompt: "Don't have an account?",
  signUpLink: 'Sign up',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
} as const;

export const LEADERBOARD_MESSAGES = {
  title: 'Leaderboard',
  subtitle: 'Official Elo ratings and player standings across sports',
  sportFilterLabel: 'Sport',
  allSports: 'All Sports',
  rankColumn: 'Rank',
  playerColumn: 'Player',
  ratingColumn: 'Rating',
  gamesPlayedColumn: 'Games Played',
  winRateColumn: 'Win Rate',
  wins: 'W',
  losses: 'L',
  draws: 'D',
  provisionalBadge: 'Provisional',
  provisionalTooltip: 'Player has completed fewer than 5 rated games.',
  emptyTitle: 'No players found',
  emptyDescription: 'No ranked players found for this sport yet. Complete games to appear on the leaderboard!',
  loadMore: 'Load more players',
  anonymousPlayer: 'Anonymous Player',
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_UNAUTHORIZED: 'Please sign in to access this data.',
  AUTH_INVALID_CREDENTIALS: 'Email or password is incorrect.',
  AUTH_ACCOUNT_LOCKED: 'Email or password is incorrect.',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again in a few minutes.',
  FORBIDDEN_ACCESS: 'You do not have permission to perform this action.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  GAME_FULL: 'This game has reached its maximum player capacity.',
  GAME_LOCKED: 'This game is locked and no further changes are permitted.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  NETWORK_ERROR: 'Could not connect to the server. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};
