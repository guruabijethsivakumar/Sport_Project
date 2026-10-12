import {
  DecisionTypes,
  FactorImpacts,
} from '../../constants/explainability-constants.js';
import type {
  UnifiedExplanation,
  UnifiedExplanationFactor,
} from './interfaces.js';

export function formatEligibilityExplanation(
  gameId: string,
  eligibility: {
    eligible: boolean;
    reasons?: string[];
    isRatingEligible?: boolean;
    hasScheduleConflict?: boolean;
    isSportInProfile?: boolean;
    isHost?: boolean;
    isAlreadyParticipant?: boolean;
    isGameOpen?: boolean;
  },
): UnifiedExplanation {
  const codes = eligibility.reasons || [];
  const factors: UnifiedExplanationFactor[] = [];
  const reasons: string[] = [];

  if (eligibility.isSportInProfile !== undefined) {
    factors.push({
      name: 'Sport in Profile',
      value: eligibility.isSportInProfile ? 1 : 0,
      impact: eligibility.isSportInProfile
        ? FactorImpacts.POSITIVE
        : FactorImpacts.NEGATIVE,
    });
    if (!eligibility.isSportInProfile) {
      reasons.push('This sport is not added to your active sports profile.');
    }
  }

  if (eligibility.isRatingEligible !== undefined) {
    factors.push({
      name: 'Rating Range Fit',
      value: eligibility.isRatingEligible ? 1 : 0,
      impact: eligibility.isRatingEligible
        ? FactorImpacts.POSITIVE
        : FactorImpacts.NEGATIVE,
    });
    if (!eligibility.isRatingEligible) {
      reasons.push('Your rating falls outside the game restrict range.');
    }
  }

  if (eligibility.hasScheduleConflict !== undefined) {
    factors.push({
      name: 'Schedule Availability',
      value: eligibility.hasScheduleConflict ? 0 : 1,
      impact: eligibility.hasScheduleConflict
        ? FactorImpacts.NEGATIVE
        : FactorImpacts.POSITIVE,
    });
    if (eligibility.hasScheduleConflict) {
      reasons.push('You have an existing confirmed game during this time.');
    }
  }

  if (eligibility.eligible && reasons.length === 0) {
    reasons.push('You satisfy all participation criteria for this game.');
  }

  const summary = eligibility.eligible
    ? 'You are fully eligible to join this game.'
    : 'You do not currently satisfy eligibility requirements for this game.';

  return {
    decisionType: DecisionTypes.ELIGIBILITY_CHECK,
    subjectId: gameId,
    summary,
    codes,
    factors,
    metrics: {
      eligible: eligibility.eligible,
      reasonCount: codes.length,
    },
    reasons,
  };
}

export function formatRatingExplanation(
  eventId: string,
  event: {
    delta?: number;
    newRating?: number;
    oldRating?: number;
    explanation?: {
      codes?: string[];
      metrics?: Record<string, number | string | boolean>;
      explanationText?: string;
    };
  },
): UnifiedExplanation {
  const exp = event.explanation || {};
  const metrics = exp.metrics || {};
  const codes = exp.codes || [];
  const delta = event.delta ?? Number(metrics.delta ?? 0);

  const factors: UnifiedExplanationFactor[] = [];
  if (metrics.winProbabilityPercent !== undefined) {
    const winProb = Number(metrics.winProbabilityPercent) / 100;
    factors.push({
      name: 'Win Expectation',
      value: Math.round(winProb * 100) / 100,
      impact: winProb > 0.5 ? FactorImpacts.POSITIVE : FactorImpacts.NEUTRAL,
    });
  }
  if (metrics.kFactorUsed !== undefined) {
    factors.push({
      name: 'K-Factor Weight',
      value: Number(metrics.kFactorUsed),
      impact: FactorImpacts.NEUTRAL,
    });
  }
  if (metrics.marginMultiplier !== undefined && Number(metrics.marginMultiplier) > 1) {
    factors.push({
      name: 'Margin of Victory Boost',
      value: Number(metrics.marginMultiplier),
      impact: FactorImpacts.POSITIVE,
    });
  }

  const summary =
    delta >= 0
      ? `Rating increased by +${delta} points.`
      : `Rating adjusted by ${delta} points.`;

  const explanationText = exp.explanationText || '';
  const reasons = explanationText
    ? explanationText.split(/(?<=\.)\s+/).filter(Boolean)
    : [summary];

  return {
    decisionType: DecisionTypes.RATING_ADJUSTMENT,
    subjectId: eventId,
    summary,
    codes,
    factors,
    metrics: {
      delta,
      ...metrics,
    },
    reasons,
  };
}

export function formatTeamBalancingExplanation(
  gameId: string,
  formation: {
    balance: { difference: number; method: string };
    reasons: string[];
    teams: Array<{ name: string; ratingAverage: number; ratingTotal: number }>;
  },
): UnifiedExplanation {
  const diff = formation.balance.difference;
  const factors: UnifiedExplanationFactor[] = [
    {
      name: 'Rating Differential',
      value: diff,
      impact: diff <= 50 ? FactorImpacts.POSITIVE : FactorImpacts.NEUTRAL,
    },
  ];

  const summary = `Teams balanced via ${formation.balance.method} with a rating gap of ${diff} points.`;

  return {
    decisionType: DecisionTypes.TEAM_BALANCING,
    subjectId: gameId,
    summary,
    codes: [formation.balance.method],
    factors,
    metrics: {
      difference: diff,
      method: formation.balance.method,
      teamCount: formation.teams.length,
    },
    reasons: formation.reasons,
  };
}

export function formatRecommendationExplanation(
  gameId: string,
  recommendation: {
    score: number;
    confidence: string;
    factors: Array<{ name: string; value: number; weight: number }>;
    reasons: string[];
  },
): UnifiedExplanation {
  const factors: UnifiedExplanationFactor[] = recommendation.factors.map(
    (f) => ({
      name: f.name,
      value: f.value,
      weight: f.weight,
      impact:
        f.value >= 0.7
          ? FactorImpacts.POSITIVE
          : f.value >= 0.4
            ? FactorImpacts.NEUTRAL
            : FactorImpacts.NEGATIVE,
    }),
  );

  const percent = Math.round(recommendation.score * 100);
  const summary = `Game recommended with match score of ${percent}% (${recommendation.confidence} confidence).`;

  return {
    decisionType: DecisionTypes.RECOMMENDATION,
    subjectId: gameId,
    summary,
    codes: [recommendation.confidence],
    factors,
    metrics: {
      score: recommendation.score,
      confidence: recommendation.confidence,
    },
    reasons: recommendation.reasons,
  };
}
