import { Types } from 'mongoose';
import {
  Game,
  GameTeamFormation,
  RatingEvent,
  DecisionLog,
  GameParticipant,
} from '../models/index.js';
import { ParticipantStatuses } from '../constants/game-constants.js';
import { DecisionTypes } from '../constants/explainability-constants.js';
import { ErrorCodes } from '../constants/error-codes.js';
import { Messages } from '../constants/messages.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { defaultClock, type Clock } from '../utils/clock.js';
import { checkEligibility } from './game-eligibility.service.js';
import { buildRatingExplanation } from '../engine/rating/explanation-builder.js';
import { RecommendationService } from './recommendation.service.js';
import {
  formatEligibilityExplanation,
  formatRatingExplanation,
  formatTeamBalancingExplanation,
  formatRecommendationExplanation,
  type UnifiedExplanation,
} from '../engine/explainability/index.js';
import type { ListDecisionLogsQuery } from '../validators/explainability.validators.js';

export class ExplainabilityService {
  /**
   * Records an audit decision log entry into MongoDB
   */
  static async recordDecision(params: {
    decisionType: any;
    subjectId: string;
    actorId: Types.ObjectId | string;
    inputSnapshot?: Record<string, unknown>;
    outputDecision?: Record<string, unknown>;
    explanation: UnifiedExplanation;
  }): Promise<void> {
    const actorObjectId =
      typeof params.actorId === 'string'
        ? new Types.ObjectId(params.actorId)
        : params.actorId;

    await DecisionLog.create({
      decisionType: params.decisionType,
      subjectId: params.subjectId,
      actorId: actorObjectId,
      inputSnapshot: params.inputSnapshot || {},
      outputDecision: params.outputDecision || {},
      factors: params.explanation.factors,
      metrics: params.explanation.metrics,
      codes: params.explanation.codes,
      summary: params.explanation.summary,
      reasons: params.explanation.reasons,
    });
  }

  /**
   * Explains why a user is or is not eligible for a specific game
   */
  static async explainGameEligibility(
    gameId: string,
    viewerId: Types.ObjectId | string,
    clock: Clock = defaultClock,
  ): Promise<UnifiedExplanation> {
    const gId = new Types.ObjectId(gameId);
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    const game = await Game.findById(gId);
    if (!game) {
      throw new AppError(
        Messages.GAMES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.GAME_NOT_FOUND,
      );
    }

    const eligResult = await checkEligibility(vId, game, clock);
    const explanation = formatEligibilityExplanation(gameId, {
      eligible: eligResult.eligible,
      reasons: eligResult.reasons,
      isRatingEligible: !eligResult.reasons.includes('outside_rating_range' as any),
      hasScheduleConflict: eligResult.reasons.includes('schedule_conflict' as any),
      isSportInProfile: !eligResult.reasons.includes('sport_profile_missing' as any),
    });

    // Record decision log
    await this.recordDecision({
      decisionType: DecisionTypes.ELIGIBILITY_CHECK,
      subjectId: gameId,
      actorId: vId,
      inputSnapshot: { gameId, sportKey: game.sportKey },
      outputDecision: { eligible: eligResult.eligible },
      explanation,
    });

    return explanation;
  }

  /**
   * Explains why teams in a game were formed and balanced in a particular configuration
   */
  static async explainTeamFormation(
    gameId: string,
    viewerId: Types.ObjectId | string,
  ): Promise<UnifiedExplanation> {
    const gId = new Types.ObjectId(gameId);
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    const game = await Game.findById(gId);
    if (!game) {
      throw new AppError(
        Messages.GAMES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.GAME_NOT_FOUND,
      );
    }

    // Access check: host or joined participant
    const isHost = game.hostId.toString() === vId.toString();
    if (!isHost) {
      const participant = await GameParticipant.findOne({
        gameId: gId,
        userId: vId,
        status: ParticipantStatuses.JOINED,
      });
      if (!participant) {
        throw new AppError(
          Messages.FORBIDDEN,
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN_ACCESS,
        );
      }
    }

    const formation = await GameTeamFormation.findOne({ gameId: gId });
    if (!formation) {
      throw new AppError(
        Messages.TEAMS.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.TEAMS_NOT_FOUND,
      );
    }

    const explanation = formatTeamBalancingExplanation(gameId, {
      balance: formation.balance,
      reasons: formation.reasons,
      teams: formation.teams,
    });

    await this.recordDecision({
      decisionType: DecisionTypes.TEAM_BALANCING,
      subjectId: gameId,
      actorId: vId,
      inputSnapshot: { gameId, teamCount: formation.teams.length },
      outputDecision: { balance: formation.balance },
      explanation,
    });

    return explanation;
  }

  /**
   * Explains a player's Elo rating movement after a match result
   */
  static async explainRatingDelta(
    eventId: string,
    viewerId: Types.ObjectId | string,
  ): Promise<UnifiedExplanation> {
    const eId = new Types.ObjectId(eventId);
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    const event = await RatingEvent.findById(eId);
    if (!event) {
      throw new AppError(
        Messages.RATING_EVENT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.RATING_EVENT_NOT_FOUND,
      );
    }

    if (event.user.toString() !== vId.toString()) {
      throw new AppError(
        Messages.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN_ACCESS,
      );
    }

    const rawExplanation = buildRatingExplanation({
      oldRating: event.oldRating,
      newRating: event.newRating,
      delta: event.delta,
      expectedScore: event.expectedScore,
      outcomeScore: event.outcomeScore,
      ownTeamRating: event.ownTeamRating,
      opponentTeamRating: event.opponentTeamRating,
      kUsed: event.kUsed,
      kBaseTier: event.kBaseTier,
      inactivityMultiplier: event.inactivityMultiplier,
      movMultiplier: event.movMultiplier,
      gamesPlayedBefore: event.gamesPlayedBefore,
      bandBefore: event.bandBefore,
      bandAfter: event.bandAfter,
    });

    const explanation = formatRatingExplanation(eventId, {
      delta: event.delta,
      newRating: event.newRating,
      oldRating: event.oldRating,
      explanation: rawExplanation,
    });

    await this.recordDecision({
      decisionType: DecisionTypes.RATING_ADJUSTMENT,
      subjectId: eventId,
      actorId: vId,
      inputSnapshot: { eventId, delta: event.delta },
      outputDecision: { newRating: event.newRating },
      explanation,
    });

    return explanation;
  }

  /**
   * Explains why a game was recommended to the viewer
   */
  static async explainRecommendation(
    gameId: string,
    viewerId: Types.ObjectId | string,
    clock: Clock = defaultClock,
  ): Promise<UnifiedExplanation> {
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    // Retrieve recommendations for caller
    const recPayload = await RecommendationService.getRecommendations(
      vId,
      { limit: 50 },
      clock,
    );

    const match = recPayload.items.find((item) => item.gameId === gameId);
    if (!match) {
      throw new AppError(
        Messages.EXPLAINABILITY.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.EXPLANATION_NOT_FOUND,
      );
    }

    const explanation = formatRecommendationExplanation(gameId, match);

    await this.recordDecision({
      decisionType: DecisionTypes.RECOMMENDATION,
      subjectId: gameId,
      actorId: vId,
      inputSnapshot: { gameId },
      outputDecision: { score: match.score, confidence: match.confidence },
      explanation,
    });

    return explanation;
  }

  /**
   * Retrieves a single persisted decision log by ID
   */
  static async getDecisionLog(
    id: string,
    viewerId: Types.ObjectId | string,
  ): Promise<any> {
    const logId = new Types.ObjectId(id);
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    const log = await DecisionLog.findById(logId);
    if (!log) {
      throw new AppError(
        Messages.EXPLAINABILITY.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.DECISION_LOG_NOT_FOUND,
      );
    }

    if (log.actorId.toString() !== vId.toString()) {
      throw new AppError(
        Messages.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN_ACCESS,
      );
    }

    return log;
  }

  /**
   * Lists persisted decision logs for the viewer
   */
  static async listMyDecisionLogs(
    viewerId: Types.ObjectId | string,
    query: ListDecisionLogsQuery,
  ): Promise<{ logs: any[]; total: number }> {
    const vId =
      typeof viewerId === 'string' ? new Types.ObjectId(viewerId) : viewerId;

    const filter: Record<string, unknown> = { actorId: vId };
    if (query.decisionType) {
      filter.decisionType = query.decisionType;
    }

    const limit = query.limit || 20;
    const skip = query.skip || 0;

    const [logs, total] = await Promise.all([
      DecisionLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      DecisionLog.countDocuments(filter),
    ]);

    return { logs, total };
  }
}
