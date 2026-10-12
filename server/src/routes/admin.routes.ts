import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateRequest } from '../middleware/validate-request.js';
import { Roles } from '../constants/roles.js';
import {
  adminListUsersSchema,
  adminSuspendUserSchema,
  adminReinstateUserSchema,
  adminUpdateUserRoleSchema,
  adminListGamesSchema,
  adminCancelGameSchema,
  adminListDisputesSchema,
  adminResolveDisputeSchema,
  adminVoidDisputeSchema,
} from '../validators/admin.validators.js';

const router = Router();

// Secure all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize(Roles.ADMIN));

// Platform dashboard statistics
router.get('/dashboard/stats', AdminController.getDashboardStats);

// User moderation
router.get(
  '/users',
  validateRequest(adminListUsersSchema),
  AdminController.listUsers,
);
router.post(
  '/users/:userId/suspend',
  validateRequest(adminSuspendUserSchema),
  AdminController.suspendUser,
);
router.post(
  '/users/:userId/reinstate',
  validateRequest(adminReinstateUserSchema),
  AdminController.reinstateUser,
);
router.patch(
  '/users/:userId/role',
  validateRequest(adminUpdateUserRoleSchema),
  AdminController.updateUserRole,
);

// Game moderation
router.get(
  '/games',
  validateRequest(adminListGamesSchema),
  AdminController.listGames,
);
router.post(
  '/games/:gameId/cancel',
  validateRequest(adminCancelGameSchema),
  AdminController.cancelGame,
);

// Dispute resolution
router.get(
  '/disputes',
  validateRequest(adminListDisputesSchema),
  AdminController.listDisputes,
);
router.post(
  '/disputes/:gameId/resolve',
  validateRequest(adminResolveDisputeSchema),
  AdminController.resolveDispute,
);
router.post(
  '/disputes/:gameId/void',
  validateRequest(adminVoidDisputeSchema),
  AdminController.voidDispute,
);

export const adminRoutes = router;
