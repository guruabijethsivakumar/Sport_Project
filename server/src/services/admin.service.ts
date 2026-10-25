import { Types } from 'mongoose';
import { User, type IUserDocument } from '../models/user.model.js';
import { RefreshSession } from '../models/refresh-session.model.js';
import { Game, type IGameDocument } from '../models/game.model.js';
import { Venue } from '../models/venue.model.js';
import {
  GameResult,
  type IGameResultDocument,
  type IGameResultScore,
} from '../models/game-result.model.js';
import { GameParticipant } from '../models/game-participant.model.js';
import { GameTeamFormation } from '../models/game-team-formation.model.js';
import { MatchResult } from '../models/match-result.model.js';
import { ratingEngineService } from './rating-engine.service.js';
import { GameService } from './game.service.js';
import { areSidesEqual } from './game-result.service.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { ErrorCodes } from '../constants/error-codes.js';
import { Messages } from '../constants/messages.js';
import { type Role } from '../constants/roles.js';
import { UserStatuses } from '../constants/user-status.js';
import {
  GameStatuses,
  CancellationReasonCodes,
  ParticipantStatuses,
} from '../constants/game-constants.js';
import { VenueStatuses } from '../constants/venue-constants.js';
import {
  ResultStatuses,
  RatingStatuses,
} from '../constants/result-constants.js';
import { MatchSourceTypes } from '../constants/match-sources.js';
import {
  DisputeResolutionActions,
  type DisputeResolutionAction,
} from '../constants/admin-constants.js';
import { type Clock, defaultClock } from '../utils/clock.js';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface ListGamesAdminQuery {
  page?: number;
  limit?: number;
  status?: string;
  sportKey?: string;
}

export interface ListDisputesQuery {
  page?: number;
  limit?: number;
}

export interface ListVenuesAdminQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface ResolveDisputeDTO {
  action?: DisputeResolutionAction;
  scores?: IGameResultScore[];
  notes?: string;
}

export class AdminService {
  /**
   * Helper to map joined participants to sideKeys
   */
  private static async getPlayerSideMap(
    gameId: Types.ObjectId,
    participations: Array<{ userId: Types.ObjectId; sideKey?: string }>,
    scores: IGameResultScore[],
  ): Promise<Map<string, string>> {
    const playerSideMap = new Map<string, string>();

    // 1. Check if team formation snapshot exists
    const teamFormation = await GameTeamFormation.findOne({ gameId });
    if (teamFormation && teamFormation.teams && teamFormation.teams.length > 0) {
      for (let i = 0; i < teamFormation.teams.length; i++) {
        const team = teamFormation.teams[i];
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

    // 3. Fallback: split participants evenly across score sideKeys
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
   * List users with optional role, status, and search filters
   */
  static async listUsers(query: ListUsersQuery = {}): Promise<{
    users: IUserDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Suspend a user account and immediately revoke all active refresh tokens
   */
  static async suspendUser(
    targetUserId: string,
    adminId: string,
    _reason?: string,
  ): Promise<IUserDocument> {
    if (targetUserId === adminId) {
      throw new AppError(
        Messages.ADMIN.CANNOT_MODERATE_SELF,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CANNOT_MODERATE_SELF,
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError(
        Messages.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.USER_NOT_FOUND,
      );
    }

    if (user.status === UserStatuses.SUSPENDED) {
      throw new AppError(
        Messages.ADMIN.USER_ALREADY_SUSPENDED,
        HttpStatus.CONFLICT,
        ErrorCodes.USER_ALREADY_SUSPENDED,
      );
    }

    user.status = UserStatuses.SUSPENDED;
    await user.save();

    // Revoke all active refresh sessions for this user
    await RefreshSession.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() },
    );

    return user;
  }

  /**
   * Reinstate a suspended user account
   */
  static async reinstateUser(
    targetUserId: string,
    _adminId: string,
    _reason?: string,
  ): Promise<IUserDocument> {
    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError(
        Messages.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.USER_NOT_FOUND,
      );
    }

    if (user.status !== UserStatuses.SUSPENDED) {
      throw new AppError(
        Messages.ADMIN.USER_NOT_SUSPENDED,
        HttpStatus.CONFLICT,
        ErrorCodes.USER_NOT_SUSPENDED,
      );
    }

    user.status = UserStatuses.ACTIVE;
    await user.save();

    return user;
  }

  /**
   * Update role of a user
   */
  static async updateUserRole(
    targetUserId: string,
    newRole: Role,
    adminId: string,
  ): Promise<IUserDocument> {
    if (targetUserId === adminId) {
      throw new AppError(
        Messages.ADMIN.CANNOT_MODIFY_OWN_ROLE,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CANNOT_MODIFY_OWN_ROLE,
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      throw new AppError(
        Messages.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.USER_NOT_FOUND,
      );
    }

    user.role = newRole;
    await user.save();

    return user;
  }

  /**
   * List games for admin moderation
   */
  static async listGames(query: ListGamesAdminQuery = {}): Promise<{
    games: IGameDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.sportKey) filter.sportKey = query.sportKey;

    const [games, total] = await Promise.all([
      Game.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Game.countDocuments(filter),
    ]);

    return {
      games,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin force-cancel a game
   */
  static async cancelGame(
    gameId: string,
    adminId: string,
    reason?: string,
    clock: Clock = defaultClock,
  ): Promise<IGameDocument> {
    return GameService.cancelGame(
      gameId,
      adminId,
      {
        reasonCode: CancellationReasonCodes.ADMIN_ACTION,
        reasonText: reason || 'Cancelled by platform administrator',
      },
      'admin',
      clock,
    );
  }

  /**
   * List disputed match results
   */
  static async listDisputes(query: ListDisputesQuery = {}): Promise<{
    disputes: IGameResultDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter = { status: ResultStatuses.DISPUTED };

    const [disputes, total] = await Promise.all([
      GameResult.find(filter)
        .sort({ disputedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GameResult.countDocuments(filter),
    ]);

    return {
      disputes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Force resolve a disputed match result by applying rating calculations
   */
  static async resolveDispute(
    gameId: string,
    adminId: string,
    dto: ResolveDisputeDTO = {},
    clock: Clock = defaultClock,
  ): Promise<IGameResultDocument> {
    const gId = new Types.ObjectId(gameId);

    const gameResult = await GameResult.findOne({ gameId: gId });
    if (!gameResult) {
      throw new AppError(
        Messages.ADMIN.DISPUTE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.DISPUTE_NOT_FOUND,
      );
    }

    if (gameResult.status !== ResultStatuses.DISPUTED) {
      throw new AppError(
        Messages.ADMIN.DISPUTE_ALREADY_RESOLVED,
        HttpStatus.CONFLICT,
        ErrorCodes.DISPUTE_ALREADY_RESOLVED,
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

    const scoresToApply =
      dto.action === DisputeResolutionActions.CUSTOM_SCORE &&
      dto.scores &&
      dto.scores.length > 0
        ? dto.scores
        : gameResult.proposal.scores;

    const participations = await GameParticipant.find({
      gameId: gId,
      status: ParticipantStatuses.JOINED,
    });

    const playerSideMap = await AdminService.getPlayerSideMap(
      gId,
      participations,
      scoresToApply,
    );

    const sides = scoresToApply.map((scoreItem, idx) => {
      let playerIds = participations
        .filter((p) => {
          const pSide = playerSideMap.get(p.userId.toString());
          if (!pSide) return false;
          return pSide === scoreItem.sideKey || areSidesEqual(pSide, scoreItem.sideKey);
        })
        .map((p) => p.userId.toString());

      if (playerIds.length === 0) {
        const submitterStr =
          gameResult.proposal.proposedByUserId.toString();
        const opponentStr = gameResult.disputedByUserId
          ? gameResult.disputedByUserId.toString()
          : participations.find((p) => p.userId.toString() !== submitterStr)?.userId.toString() || '';

        const submitterSide = playerSideMap.get(submitterStr);
        const isSubmitterOnThisSide = submitterSide
          ? submitterSide === scoreItem.sideKey || areSidesEqual(submitterSide, scoreItem.sideKey)
          : idx === 0;

        if (isSubmitterOnThisSide) {
          playerIds = [submitterStr];
        } else if (opponentStr) {
          playerIds = [opponentStr];
        }
      }

      return {
        sideKey: scoreItem.sideKey,
        playerIds,
        score: scoreItem.score,
      };
    });

    if (sides.length === 2) {
      const side0Set = new Set(sides[0].playerIds);
      sides[1].playerIds = sides[1].playerIds.filter((id) => !side0Set.has(id));
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
      adminId,
    );

    const now = clock.now();
    gameResult.status = ResultStatuses.RESOLVED;
    gameResult.ratingStatus = RatingStatuses.APPLIED;
    gameResult.resolvedAt = now;
    gameResult.whoMustActNext = [];
    if (dto.notes) {
      gameResult.proposal.notes = gameResult.proposal.notes
        ? `${gameResult.proposal.notes} | Admin: ${dto.notes}`
        : `Admin: ${dto.notes}`;
    }
    if (
      dto.action === DisputeResolutionActions.CUSTOM_SCORE &&
      dto.scores &&
      dto.scores.length > 0
    ) {
      gameResult.proposal.scores = dto.scores;
    }

    await gameResult.save();
    return gameResult;
  }

  /**
   * Void a disputed match result
   */
  static async voidDispute(
    gameId: string,
    adminId: string,
    reason?: string,
    clock: Clock = defaultClock,
  ): Promise<IGameResultDocument> {
    const gId = new Types.ObjectId(gameId);

    const gameResult = await GameResult.findOne({ gameId: gId });
    if (!gameResult) {
      throw new AppError(
        Messages.ADMIN.DISPUTE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.DISPUTE_NOT_FOUND,
      );
    }

    if (
      gameResult.status === ResultStatuses.VOIDED ||
      gameResult.status === ResultStatuses.NO_RESULT
    ) {
      throw new AppError(
        Messages.ADMIN.DISPUTE_ALREADY_RESOLVED,
        HttpStatus.CONFLICT,
        ErrorCodes.DISPUTE_ALREADY_RESOLVED,
      );
    }

    // If rating had already been applied, rollback via rating engine
    if (gameResult.ratingStatus === RatingStatuses.APPLIED) {
      const matchResult = await MatchResult.findOne({
        'source.type': MatchSourceTypes.GAME,
        'source.id': gId.toString(),
      });
      if (matchResult) {
        await ratingEngineService.voidMatchResult(
          matchResult._id.toString(),
          adminId,
        );
      }
    }

    const now = clock.now();
    gameResult.status = ResultStatuses.VOIDED;
    gameResult.ratingStatus = RatingStatuses.VOIDED;
    gameResult.resolvedAt = now;
    gameResult.whoMustActNext = [];
    if (reason) {
      gameResult.proposal.notes = gameResult.proposal.notes
        ? `${gameResult.proposal.notes} | Voided: ${reason}`
        : `Voided: ${reason}`;
    }

    await gameResult.save();
    return gameResult;
  }

  /**
   * List all venues with optional status filter for administrative moderation
   */
  static async listVenues(
    query: ListVenuesAdminQuery = {},
  ): Promise<{
    venues: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [venues, total] = await Promise.all([
      Venue.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Venue.countDocuments(filter),
    ]);

    return {
      venues: venues.map((v) => ({
        ...v,
        id: v._id.toString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Aggregate platform-wide statistics for the admin dashboard
   */
  static async getDashboardStats(): Promise<{
    users: {
      total: number;
      active: number;
      suspended: number;
    };
    games: {
      total: number;
      open: number;
      confirmed: number;
      inProgress: number;
      completed: number;
      cancelled: number;
    };
    venues: {
      total: number;
      pendingApproval: number;
      active: number;
      suspended: number;
    };
    disputes: {
      open: number;
    };
  }> {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalGames,
      openGames,
      confirmedGames,
      inProgressGames,
      completedGames,
      cancelledGames,
      totalVenues,
      pendingVenues,
      activeVenues,
      suspendedVenues,
      openDisputes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: UserStatuses.ACTIVE }),
      User.countDocuments({ status: UserStatuses.SUSPENDED }),
      Game.countDocuments(),
      Game.countDocuments({ status: GameStatuses.OPEN }),
      Game.countDocuments({ status: GameStatuses.CONFIRMED }),
      Game.countDocuments({ status: GameStatuses.IN_PROGRESS }),
      Game.countDocuments({ status: GameStatuses.COMPLETED }),
      Game.countDocuments({ status: GameStatuses.CANCELLED }),
      Venue.countDocuments(),
      Venue.countDocuments({ status: VenueStatuses.PENDING_APPROVAL }),
      Venue.countDocuments({ status: VenueStatuses.ACTIVE }),
      Venue.countDocuments({ status: VenueStatuses.SUSPENDED }),
      GameResult.countDocuments({ status: ResultStatuses.DISPUTED }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      games: {
        total: totalGames,
        open: openGames,
        confirmed: confirmedGames,
        inProgress: inProgressGames,
        completed: completedGames,
        cancelled: cancelledGames,
      },
      venues: {
        total: totalVenues,
        pendingApproval: pendingVenues,
        active: activeVenues,
        suspended: suspendedVenues,
      },
      disputes: {
        open: openDisputes,
      },
    };
  }
}
