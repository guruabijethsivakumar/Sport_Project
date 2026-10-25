import { Router } from 'express';
import * as NotificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  getNotificationsSchema,
  markNotificationReadSchema,
} from '../validators/notification.validators.js';

const router = Router();

// GET /notifications - Fetch paginated notifications for authenticated user
router.get(
  '/',
  authenticate,
  validateRequest(getNotificationsSchema),
  NotificationController.getNotifications,
);

// PATCH /notifications/read-all - Mark all notifications as read (must be before :id route)
router.patch(
  '/read-all',
  authenticate,
  NotificationController.markAllAsRead,
);

// PATCH /notifications/:id/read - Mark a specific notification as read
router.patch(
  '/:id/read',
  authenticate,
  validateRequest(markNotificationReadSchema),
  NotificationController.markAsRead,
);

// DELETE /notifications/clear-all - Clear all notifications for user
router.delete(
  '/clear-all',
  authenticate,
  NotificationController.clearAllNotifications,
);

// DELETE /notifications/:id - Clear / delete a specific notification
router.delete(
  '/:id',
  authenticate,
  validateRequest(markNotificationReadSchema),
  NotificationController.deleteNotification,
);

export const notificationRoutes = router;
