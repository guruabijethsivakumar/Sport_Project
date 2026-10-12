import type { Request, Response, NextFunction } from 'express';
import { ExplainabilityService } from '../services/explainability.service.js';
import { sendSuccess } from '../utils/api-response.js';
import { Messages } from '../constants/messages.js';
import { defaultClock } from '../utils/clock.js';
import type { ListDecisionLogsQuery } from '../validators/explainability.validators.js';

export async function explainGameEligibility(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ExplainabilityService.explainGameEligibility(
      req.params.gameId,
      req.user!.id,
      defaultClock,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.ELIGIBILITY_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function explainTeamFormation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ExplainabilityService.explainTeamFormation(
      req.params.gameId,
      req.user!.id,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.TEAMS_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function explainRatingDelta(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ExplainabilityService.explainRatingDelta(
      req.params.eventId,
      req.user!.id,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.RATING_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function explainRecommendation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ExplainabilityService.explainRecommendation(
      req.params.gameId,
      req.user!.id,
      defaultClock,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.RECOMMENDATION_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function getDecisionLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await ExplainabilityService.getDecisionLog(
      req.params.id,
      req.user!.id,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.DECISION_LOG_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}

export async function listMyDecisionLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListDecisionLogsQuery;
    const data = await ExplainabilityService.listMyDecisionLogs(
      req.user!.id,
      query,
    );
    sendSuccess(res, data, Messages.EXPLAINABILITY.DECISION_LOGS_FETCH_SUCCESS);
  } catch (err) {
    next(err);
  }
}
