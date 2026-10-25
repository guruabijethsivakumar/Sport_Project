import mongoose, { Types } from 'mongoose';
import { Game } from '../models/game.model.js';
import { GameParticipant } from '../models/game-participant.model.js';
import { GameTeamFormation } from '../models/game-team-formation.model.js';
import { Sport } from '../models/sport.model.js';
import { Rating } from '../models/rating.model.js';
import {
  GameResult,
  type IGameResultDocument,
  type IGameResultScore,
} from '../models/game-result.model.js';
import {
  ResultStatuses,
  RatingStatuses,
} from '../constants/result-constants.js';
import {
  GameStatuses,
  ParticipantStatuses,
} from '../constants/game-constants.js';
import { MatchSourceTypes } from '../constants/match-sources.js';
import { ratingEngineService } from './rating-engine.service.js';
import { transitionGame } from './game-transition.service.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { ErrorCodes } from '../constants/error-codes.js';
import { Messages } from '../constants/messages.js';
import { type Clock, defaultClock } from '../utils/clock.js';
import { TransactionEventBuffer } from '../utils/domain-events.js';

export interface SubmitResultDTO {
  scores: IGameResultScore[];
  notes?: string;
}

/**
 * Normalize side keys across different conventions ('team_a', 'side_a', 'teamA', 'sideA', etc.)
 */
export function normalizeSideKey(key?: string): string {
  if (!key) return '';
  const cleaned = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (
    cleaned === 'sidea' ||
    cleaned === 'teama' ||
    cleaned === 'a' ||
    cleaned === 'side1' ||
    cleaned === 'team1' ||
    cleaned === '1'
  ) {
    return 'side_a';
  }
  if (
    cleaned === 'sideb' ||
    cleaned === 'teamb' ||
    cleaned === 'b' ||
    cleaned === 'side2' ||
    cleaned === 'team2' ||
    cleaned === '2'
  ) {
    return 'side_b';
  }
  return cleaned;
}

export function areSidesEqual(side1?: string, side2?: string): boolean {
  if (!side1 || !side2) return false;
  if (side1 === side2) return true;
  return normalizeSideKey(side1) === normalizeSideKey(side2);
}

export class GameResultService {
  /**
   * Helper to build a map of joined participant userId -> sideKey
   */
  private static async getPlayerSideMap(
    gameId: Types.ObjectId,
    participations: Array<{ userId: Types.ObjectId; sideKey?: string }>,
    scores: IGameResultScore[],
  ): Promise<Map<string, string>> {
    const playerSideMap = new Map<string, string>();

    // 1. Check if team formation snapshot exists (Module 7)
    const teamFormation = await GameTeamFormation.findOne({ gameId });
    if (teamFormation && teamFormation.teams && teamFormation.teams.length > 0) {
      for (let i = 0; i < teamFormation.teams.length; i++) {
        const team = teamFormation.teams[i];
        // Target sideKey from scores if available at this index, else team.sideKey
        const sideKey = scores[i]?.sideKey || team.sideKey;
        for (const player of team.players) {
          playerSideMap.set(player.userId.toString(), sideKey);
        }
      }
    }

    // 2. Check individual participant sideKey properties
    for (const p of participations) {
      if (p.sideKey) {
        playerSideMap.set(p.userId.toString(), p.sideKey);
      }
    }

    // 3. Fallback: if no side assignments exist, split participants evenly across score sideKeys
    const unassigned = participations.filter(
      (p) => !playerSideMap.has(p.userId.toString()),
    );
    if (unassigned.length > 0 && scores.length >= 2) {
      const half = Math.ceil(unassigned.length / 2);
      unassigned.forEach((p, idx) => {
        const assignedSide =
          idx < half ? scores[0].sideKey : scores[1].sideKey;
        playerSideMap.set(p.userId.toString(), assignedSide);
      });
    }

    return playerSideMap;
  }

  /**
   * Submit a new match result proposal for host/opposing player verification
   */
  static async submitResult(
    gameId: Types.ObjectId | string,
    submitterId: Types.ObjectId | string,
    dto: SubmitResultDTO,
    clock: Clock = defaultClock,
  ): Promise<IGameResultDocument> {
    const gId = typeof gameId === 'string' ? new Types.ObjectId(gameId) : gameId;
    const uId =
      typeof submitterId === 'string'
        ? new Types.ObjectId(submitterId)
        : submitterId;

    const game = await Game.findById(gId);
    if (!game) {
      throw new AppError(
        Messages.GAMES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.GAME_NOT_FOUND,
      );
    }

    if (
      game.status === GameStatuses.CANCELLED ||
      game.status === GameStatuses.EXPIRED
    ) {
      throw new AppError(
        Messages.GAMES.ALREADY_TERMINAL,
        HttpStatus.CONFLICT,
        ErrorCodes.GAME_ALREADY_TERMINAL,
      );
    }

    // 1. Verify balanced teams have been formed
    const teamFormation = await GameTeamFormation.findOne({ gameId: gId });
    if (!teamFormation || !teamFormation.teams || teamFormation.teams.length < 2) {
      throw new AppError(
        'Balanced teams must be generated and finalized before submitting match scores.',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 2. Verify match has ended (completed or past endsAt)
    const currentTime = clock.now();
    const isMatchEnded =
      game.status === GameStatuses.COMPLETED ||
      (game.endsAt && currentTime >= game.endsAt);

    if (!isMatchEnded) {
      throw new AppError(
        'Score submission is only permitted after the match has concluded.',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 3. Verify caller is a JOINED participant
    const participations = await GameParticipant.find({
      gameId: gId,
      status: ParticipantStatuses.JOINED,
    });

    const callerParticipation = participations.find(
      (p) => p.userId.toString() === uId.toString(),
    );
    if (!callerParticipation) {
      throw new AppError(
        Messages.RESULTS.NOT_PARTICIPANT,
        HttpStatus.FORBIDDEN,
        ErrorCodes.AUTH_FORBIDDEN,
      );
    }

    // 2. Check existing result status
    const existingResult = await GameResult.findOne({ gameId: gId });
    if (existingResult) {
      if (existingResult.status === ResultStatuses.VERIFIED) {
        throw new AppError(
          Messages.RESULTS.ALREADY_VERIFIED,
          HttpStatus.CONFLICT,
          ErrorCodes.RESULT_ALREADY_VERIFIED,
        );
      }
      if (existingResult.status === ResultStatuses.PENDING_CONFIRMATION) {
        throw new AppError(
          Messages.RESULTS.ALREADY_SUBMITTED,
          HttpStatus.CONFLICT,
          ErrorCodes.RESULT_ALREADY_SUBMITTED,
        );
      }
    }

    // 3. Identify sideKey of the user submitting the score & whoMustActNext
    const playerSideMap = await GameResultService.getPlayerSideMap(
      gId,
      participations,
      dto.scores,
    );

    let submitterSideKey = playerSideMap.get(uId.toString());
    if (!submitterSideKey) {
      submitterSideKey = dto.scores[0].sideKey;
      playerSideMap.set(uId.toString(), submitterSideKey);
    }

    // All joined participants on a DIFFERENT side must verify
    let opposingParticipants = participations.filter((p) => {
      const side = playerSideMap.get(p.userId.toString());
      if (!side) return p.userId.toString() !== uId.toString();
      return !areSidesEqual(side, submitterSideKey);
    });

    // Fallback safety: if nobody is opposite, include all other participants
    if (opposingParticipants.length === 0) {
      opposingParticipants = participations.filter(
        (p) => p.userId.toString() !== uId.toString(),
      );
    }

    const whoMustActNext = opposingParticipants.map((p) => p.userId);

    // 4. Transition Game to COMPLETED if not already completed
    const session = await mongoose.startSession();
    const eventBuffer = new TransactionEventBuffer();
    const now = clock.now();
    let savedResult: IGameResultDocument;

    try {
      await session.withTransaction(async () => {
        if (game.status !== GameStatuses.COMPLETED) {
          if (
            game.status === GameStatuses.OPEN ||
            game.status === GameStatuses.FULL
          ) {
            await transitionGame(game, {
              toStatus: GameStatuses.CONFIRMED,
              actorId: uId,
              actorRole: 'participant',
              reason: 'Game confirmed for result submission',
              session,
              eventBuffer,
              clock,
            });
          }
          if (game.status === GameStatuses.CONFIRMED) {
            await transitionGame(game, {
              toStatus: GameStatuses.IN_PROGRESS,
              actorId: uId,
              actorRole: 'participant',
              reason: 'Game started for result submission',
              session,
              eventBuffer,
              clock,
            });
          }
          if (game.status === GameStatuses.IN_PROGRESS) {
            await transitionGame(game, {
              toStatus: GameStatuses.COMPLETED,
              actorId: uId,
              actorRole: 'participant',
              reason: 'Game completed on result submission',
              session,
              eventBuffer,
              clock,
            });
          }
        }

        const proposal = {
          proposedByUserId: uId,
          proposedAt: now,
          scores: dto.scores,
          notes: dto.notes,
        };

        if (existingResult) {
          existingResult.status = ResultStatuses.PENDING_CONFIRMATION;
          existingResult.ratingStatus = RatingStatuses.NOT_PROCESSED;
          existingResult.proposal = proposal;
          existingResult.whoMustActNext = whoMustActNext;
          existingResult.disputedAt = undefined;
          existingResult.disputedByUserId = undefined;
          savedResult = await existingResult.save({ session });
        } else {
          const [created] = await GameResult.create(
            [
              {
                gameId: gId,
                status: ResultStatuses.PENDING_CONFIRMATION,
                ratingStatus: RatingStatuses.NOT_PROCESSED,
                proposal,
                whoMustActNext,
              },
            ],
            { session },
          );
          savedResult = created;
        }

        // Domain event: game.result_submitted
        eventBuffer.buffer({
          type: 'game.result_submitted',
          gameId: gId.toString(),
          actorId: uId.toString(),
          timestamp: now,
          data: {
            gameId: gId.toString(),
            proposedByUserId: uId.toString(),
            scores: dto.scores,
            whoMustActNext: whoMustActNext.map((id) => id.toString()),
          },
        });
      });
    } finally {
      await session.endSession();
    }

    eventBuffer.commit();
    return savedResult!;
  }

  /**
   * Confirm and verify a proposed score, clearing whoMustActNext and applying Elo ratings
   */
  static async verifyResult(
    gameId: Types.ObjectId | string,
    verifierUserId: Types.ObjectId | string,
    clock: Clock = defaultClock,
  ): Promise<IGameResultDocument> {
    const gId = typeof gameId === 'string' ? new Types.ObjectId(gameId) : gameId;
    const vId =
      typeof verifierUserId === 'string'
        ? new Types.ObjectId(verifierUserId)
        : verifierUserId;

    const gameResult = await GameResult.findOne({ gameId: gId });
    if (!gameResult) {
      throw new AppError(
        Messages.RESULTS.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.RESULT_NOT_FOUND,
      );
    }

    if (gameResult.status === ResultStatuses.VERIFIED) {
      throw new AppError(
        Messages.RESULTS.ALREADY_VERIFIED,
        HttpStatus.CONFLICT,
        ErrorCodes.RESULT_ALREADY_VERIFIED,
      );
    }

    if (gameResult.status !== ResultStatuses.PENDING_CONFIRMATION) {
      throw new AppError(
        'Result is not pending confirmation',
        HttpStatus.CONFLICT,
        ErrorCodes.GAME_STATUS_INVALID,
      );
    }

    // Only players in whoMustActNext can verify
    const isAuthorized = gameResult.whoMustActNext.some(
      (id) => id.toString() === vId.toString(),
    );
    if (!isAuthorized) {
      throw new AppError(
        Messages.RESULTS.NOT_ALLOWED_TO_VERIFY,
        HttpStatus.FORBIDDEN,
        ErrorCodes.AUTH_FORBIDDEN,
      );
    }

    const game = await Game.findById(gId);
    if (!game) {
      throw new AppError(
        Messages.GAMES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.GAME_NOT_FOUND,
      );
    }

    const participations = await GameParticipant.find({
      gameId: gId,
      status: ParticipantStatuses.JOINED,
    });

    const playerSideMap = await GameResultService.getPlayerSideMap(
      gId,
      participations,
      gameResult.proposal.scores,
    );

    // Map scores and participant assignments to ApplyMatchResultDTO
    const sides = gameResult.proposal.scores.map((scoreItem, idx) => {
      let playerIds = participations
        .filter((p) => {
          const pSide = playerSideMap.get(p.userId.toString());
          if (!pSide) return false;
          return pSide === scoreItem.sideKey || areSidesEqual(pSide, scoreItem.sideKey);
        })
        .map((p) => p.userId.toString());

      // Fallback: if playerIds empty for a side, map submitter vs verifier safely
      if (playerIds.length === 0) {
        const submitterStr = gameResult.proposal.proposedByUserId.toString();
        const verifierStr = vId.toString();
        const submitterSide = playerSideMap.get(submitterStr);

        const isSubmitterOnThisSide = submitterSide
          ? submitterSide === scoreItem.sideKey || areSidesEqual(submitterSide, scoreItem.sideKey)
          : idx === 0;

        if (isSubmitterOnThisSide) {
          playerIds = [submitterStr];
        } else {
          playerIds = [verifierStr];
        }
      }

      return {
        sideKey: scoreItem.sideKey,
        playerIds,
        score: scoreItem.score,
      };
    });

    // Ensure sides are strictly disjoint so no player can appear on opposing sides
    if (sides.length === 2) {
      const side0Set = new Set(sides[0].playerIds);
      sides[1].playerIds = sides[1].playerIds.filter((id) => !side0Set.has(id));
      if (sides[1].playerIds.length === 0) {
        sides[1].playerIds = [vId.toString()];
        sides[0].playerIds = sides[0].playerIds.filter((id) => id !== vId.toString());
      }
    }

    // Ensure all participating players have an active Rating document for the game's sport
    const sport = await Sport.findOne({ key: game.sportKey.toLowerCase().trim() });
    if (sport) {
      const allPlayerIds = [...sides[0].playerIds, ...sides[1].playerIds];
      const existingRatings = await Rating.find({
        sport: sport._id,
        user: { $in: allPlayerIds.map((id) => new Types.ObjectId(id)) },
      });
      const existingUserIds = new Set(existingRatings.map((r) => r.user.toString()));

      for (const pId of allPlayerIds) {
        if (!existingUserIds.has(pId)) {
          const defaultBand = sport.skillBands?.[0];
          const seedRating = defaultBand?.seedRating || 1000;
          await Rating.create({
            user: new Types.ObjectId(pId),
            sport: sport._id,
            rating: seedRating,
            seedRating,
            seedBandKey: defaultBand?.key || 'beginner',
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            history: [],
          });
        }
      }
    }

    // Apply match rating deltas atomically via rating engine
    await ratingEngineService.applyMatchResult(
      {
        sportKey: game.sportKey,
        source: {
          type: MatchSourceTypes.GAME,
          id: gId.toString(),
        },
        sides,
      },
      vId.toString(),
    );

    // Save result status within MongoDB transaction
    const session = await mongoose.startSession();
    const eventBuffer = new TransactionEventBuffer();
    const now = clock.now();

    try {
      await session.withTransaction(async () => {
        gameResult.status = ResultStatuses.VERIFIED;
        gameResult.ratingStatus = RatingStatuses.APPLIED;
        gameResult.verifiedAt = now;
        gameResult.whoMustActNext = [];
        await gameResult.save({ session });

        // Ensure game is marked completed
        if (game.status !== GameStatuses.COMPLETED) {
          game.status = GameStatuses.COMPLETED;
          await game.save({ session });
        }

        // Domain event: game.result_verified
        eventBuffer.buffer({
          type: 'game.result_verified',
          gameId: gId.toString(),
          actorId: vId.toString(),
          timestamp: now,
          data: {
            gameId: gId.toString(),
            verifiedByUserId: vId.toString(),
            status: ResultStatuses.VERIFIED,
            ratingStatus: RatingStatuses.APPLIED,
          },
        });
      });
    } finally {
      await session.endSession();
    }

    eventBuffer.commit();
    return gameResult;
  }

  /**
   * Dispute a proposed score
   */
  static async disputeResult(
    gameId: Types.ObjectId | string,
    disputerUserId: Types.ObjectId | string,
    reason?: string,
    clock: Clock = defaultClock,
  ): Promise<IGameResultDocument> {
    const gId = typeof gameId === 'string' ? new Types.ObjectId(gameId) : gameId;
    const dId =
      typeof disputerUserId === 'string'
        ? new Types.ObjectId(disputerUserId)
        : disputerUserId;

    const gameResult = await GameResult.findOne({ gameId: gId });
    if (!gameResult) {
      throw new AppError(
        Messages.RESULTS.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.RESULT_NOT_FOUND,
      );
    }

    if (gameResult.status !== ResultStatuses.PENDING_CONFIRMATION) {
      throw new AppError(
        'Result is not pending confirmation',
        HttpStatus.CONFLICT,
        ErrorCodes.GAME_STATUS_INVALID,
      );
    }

    // Only players in whoMustActNext can dispute
    const isAuthorized = gameResult.whoMustActNext.some(
      (id) => id.toString() === dId.toString(),
    );
    if (!isAuthorized) {
      throw new AppError(
        Messages.RESULTS.NOT_ALLOWED_TO_VERIFY,
        HttpStatus.FORBIDDEN,
        ErrorCodes.AUTH_FORBIDDEN,
      );
    }

    const session = await mongoose.startSession();
    const eventBuffer = new TransactionEventBuffer();
    const now = clock.now();

    try {
      await session.withTransaction(async () => {
        gameResult.status = ResultStatuses.DISPUTED;
        gameResult.disputedAt = now;
        gameResult.disputedByUserId = dId;
        await gameResult.save({ session });

        // Domain event: game.result_disputed
        eventBuffer.buffer({
          type: 'game.result_disputed',
          gameId: gId.toString(),
          actorId: dId.toString(),
          timestamp: now,
          data: {
            gameId: gId.toString(),
            disputedByUserId: dId.toString(),
            reason,
          },
        });
      });
    } finally {
      await session.endSession();
    }

    eventBuffer.commit();
    return gameResult;
  }

  /**
   * Get result for a game
   */
  static async getResult(
    gameId: Types.ObjectId | string,
  ): Promise<IGameResultDocument> {
    const gId = typeof gameId === 'string' ? new Types.ObjectId(gameId) : gameId;
    const gameResult = await GameResult.findOne({ gameId: gId });
    if (!gameResult) {
      throw new AppError(
        Messages.RESULTS.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.RESULT_NOT_FOUND,
      );
    }
    return gameResult;
  }
}
