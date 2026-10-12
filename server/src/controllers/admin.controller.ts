import type { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { Messages } from '../constants/messages.js';

export class AdminController {
  static async listUsers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await AdminService.listUsers(req.query as any);
      sendSuccess(res, result, Messages.ADMIN.USERS_FETCH_SUCCESS);
    } catch (err) {
      next(err);
    }
  }

  static async suspendUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const targetUserId = req.params.userId;
      const adminId = req.user!.id;
      const reason = req.body?.reason;
      const user = await AdminService.suspendUser(targetUserId, adminId, reason);
      sendSuccess(res, user, Messages.ADMIN.USER_SUSPENDED);
    } catch (err) {
      next(err);
    }
  }

  static async reinstateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const targetUserId = req.params.userId;
      const adminId = req.user!.id;
      const reason = req.body?.reason;
      const user = await AdminService.reinstateUser(
        targetUserId,
        adminId,
        reason,
      );
      sendSuccess(res, user, Messages.ADMIN.USER_REINSTATED);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const targetUserId = req.params.userId;
      const newRole = req.body.role;
      const adminId = req.user!.id;
      const user = await AdminService.updateUserRole(
        targetUserId,
        newRole,
        adminId,
      );
      sendSuccess(res, user, Messages.ADMIN.USER_ROLE_UPDATED);
    } catch (err) {
      next(err);
    }
  }

  static async listGames(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await AdminService.listGames(req.query as any);
      sendSuccess(res, result, Messages.ADMIN.GAMES_FETCH_SUCCESS);
    } catch (err) {
      next(err);
    }
  }

  static async cancelGame(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const gameId = req.params.gameId;
      const adminId = req.user!.id;
      const reason = req.body?.reason;
      const game = await AdminService.cancelGame(gameId, adminId, reason);
      sendSuccess(res, game, Messages.ADMIN.GAME_CANCELLED);
    } catch (err) {
      next(err);
    }
  }

  static async listDisputes(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await AdminService.listDisputes(req.query as any);
      sendSuccess(res, result, Messages.ADMIN.DISPUTES_FETCH_SUCCESS);
    } catch (err) {
      next(err);
    }
  }

  static async resolveDispute(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const gameId = req.params.gameId;
      const adminId = req.user!.id;
      const result = await AdminService.resolveDispute(
        gameId,
        adminId,
        req.body,
      );
      sendSuccess(res, result, Messages.ADMIN.DISPUTE_RESOLVED);
    } catch (err) {
      next(err);
    }
  }

  static async voidDispute(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const gameId = req.params.gameId;
      const adminId = req.user!.id;
      const reason = req.body?.reason;
      const result = await AdminService.voidDispute(gameId, adminId, reason);
      sendSuccess(res, result, Messages.ADMIN.DISPUTE_VOIDED);
    } catch (err) {
      next(err);
    }
  }

  static async getDashboardStats(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      sendSuccess(res, stats, Messages.ADMIN.STATS_FETCH_SUCCESS);
    } catch (err) {
      next(err);
    }
  }
}
