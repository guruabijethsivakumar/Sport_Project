import { Router } from 'express';
import * as ExplainabilityController from '../controllers/explainability.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireOnboardingComplete } from '../middleware/require-onboarding-complete.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  gameIdParamSchema,
  eventIdParamSchema,
  decisionIdParamSchema,
  listDecisionLogsQuerySchema,
} from '../validators/explainability.validators.js';

const router = Router();

router.use(authenticate, requireOnboardingComplete);

// 1. Explain game eligibility for caller
router.get(
  '/games/:gameId/eligibility',
  validateRequest(gameIdParamSchema),
  ExplainabilityController.explainGameEligibility,
);

// 2. Explain balanced team formation for game
router.get(
  '/games/:gameId/teams',
  validateRequest(gameIdParamSchema),
  ExplainabilityController.explainTeamFormation,
);

// 3. Explain rating delta from a rating event
router.get(
  '/ratings/:eventId',
  validateRequest(eventIdParamSchema),
  ExplainabilityController.explainRatingDelta,
);

// 4. Explain why a game was recommended
router.get(
  '/recommendations/:gameId',
  validateRequest(gameIdParamSchema),
  ExplainabilityController.explainRecommendation,
);

// 5. List decision logs for caller
router.get(
  '/decisions',
  validateRequest(listDecisionLogsQuerySchema),
  ExplainabilityController.listMyDecisionLogs,
);

// 6. Get single decision log by ID
router.get(
  '/decisions/:id',
  validateRequest(decisionIdParamSchema),
  ExplainabilityController.getDecisionLog,
);

export const explainabilityRoutes = router;
