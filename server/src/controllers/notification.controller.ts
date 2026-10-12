import type { Request, Response, NextFunction } from 'express';
import * as NotificationService from '../services/notification.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { ErrorCodes } from '../constants/error-codes.js';
import { Messages } from '../constants/messages.js';

export async function getNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const data = await NotificationService.getNotifications(userId, page, limit);
    sendSuccess(res, data, Messages.NOTIFICATIONS.FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await NotificationService.markAsRead(id, userId);

    if (!result) {
      throw new AppError(
        Messages.NOTIFICATIONS.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ErrorCodes.NOTIFICATION_NOT_FOUND,
      );
    }

    sendSuccess(res, result, Messages.NOTIFICATIONS.MARKED_READ);
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await NotificationService.markAllAsRead(userId);
    sendSuccess(res, result, Messages.NOTIFICATIONS.MARKED_ALL_READ);
  } catch (err) {
    next(err);
  }
}
