import { z } from 'zod';
import { DecisionTypes } from '../constants/explainability-constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const gameIdParamSchema = z.object({
  params: z.object({
    gameId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'gameId must be a valid 24-character hexadecimal ObjectId'),
  }),
});

export const eventIdParamSchema = z.object({
  params: z.object({
    eventId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'eventId must be a valid 24-character hexadecimal ObjectId'),
  }),
});

export const decisionIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .trim()
      .regex(objectIdRegex, 'id must be a valid 24-character hexadecimal ObjectId'),
  }),
});

export const listDecisionLogsQuerySchema = z.object({
  query: z.object({
    decisionType: z.enum(Object.values(DecisionTypes) as [string, ...string[]]).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('20'),
    skip: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(0))
      .optional()
      .default('0'),
  }),
});

export type ListDecisionLogsQuery = z.infer<
  typeof listDecisionLogsQuerySchema
>['query'];
