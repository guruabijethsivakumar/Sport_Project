export const DecisionTypes = {
  RECOMMENDATION: 'recommendation',
  TEAM_BALANCING: 'team_balancing',
  RATING_ADJUSTMENT: 'rating_adjustment',
  ELIGIBILITY_CHECK: 'eligibility_check',
  RELIABILITY_SCORE: 'reliability_score',
} as const;

export type DecisionType = (typeof DecisionTypes)[keyof typeof DecisionTypes];

export const FactorImpacts = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
} as const;

export type FactorImpact = (typeof FactorImpacts)[keyof typeof FactorImpacts];

export const EXPLAINABILITY_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SUMMARY_MAX_LENGTH: 300,
} as const;
