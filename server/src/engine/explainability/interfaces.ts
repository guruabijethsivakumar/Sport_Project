import type {
  DecisionType,
  FactorImpact,
} from '../../constants/explainability-constants.js';

export interface UnifiedExplanationFactor {
  name: string;
  value: number;
  weight?: number;
  impact: FactorImpact;
}

export interface UnifiedExplanation {
  decisionType: DecisionType;
  subjectId: string;
  summary: string;
  codes: string[];
  factors: UnifiedExplanationFactor[];
  metrics: Record<string, number | string | boolean>;
  reasons: string[];
}
