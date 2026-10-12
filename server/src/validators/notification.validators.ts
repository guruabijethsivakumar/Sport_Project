import { z } from 'zod';
import {
  NOTIFICATION_PAGE_SIZE_DEFAULT,
  NOTIFICATION_PAGE_SIZE_MAX,
} from '../constants/notification-constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(NOTIFICATION_PAGE_SIZE_MAX)
      .default(NOTIFICATION_PAGE_SIZE_DEFAULT),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: z
      .string()
      .trim()
      .regex(objectIdRegex, 'id must be a valid 24-character hexadecimal ObjectId'),
  }),
});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>['query'];
export type MarkNotificationReadParams = z.infer<typeof markNotificationReadSchema>['params'];
