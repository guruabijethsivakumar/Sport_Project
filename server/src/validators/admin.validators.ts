import { z } from 'zod';
import { ALL_ROLES } from '../constants/roles.js';
import { ALL_USER_STATUSES } from '../constants/user-status.js';
import { GameStatuses } from '../constants/game-constants.js';
import { DisputeResolutionActions } from '../constants/admin-constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const adminListUsersSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
      status: z.enum(ALL_USER_STATUSES as [string, ...string[]]).optional(),
      search: z.string().trim().optional(),
    })
    .optional(),
});

export const adminSuspendUserSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid userId format'),
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const adminReinstateUserSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid userId format'),
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const adminUpdateUserRoleSchema = z.object({
  params: z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid userId format'),
  }),
  body: z.object({
    role: z.enum(ALL_ROLES as [string, ...string[]]),
  }),
});

export const adminListGamesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z
        .enum(Object.values(GameStatuses) as [string, ...string[]])
        .optional(),
      sportKey: z.string().trim().toLowerCase().optional(),
    })
    .optional(),
});

export const adminCancelGameSchema = z.object({
  params: z.object({
    gameId: z.string().regex(objectIdRegex, 'Invalid gameId format'),
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const adminListDisputesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .optional(),
});

export const adminResolveDisputeSchema = z.object({
  params: z.object({
    gameId: z.string().regex(objectIdRegex, 'Invalid gameId format'),
  }),
  body: z
    .object({
      action: z
        .enum(
          Object.values(DisputeResolutionActions) as [string, ...string[]],
        )
        .default(DisputeResolutionActions.ACCEPT_PROPOSAL),
      scores: z
        .array(
          z.object({
            sideKey: z.string().min(1),
            score: z.number().int().min(0),
            winner: z.boolean(),
          }),
        )
        .optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const adminVoidDisputeSchema = z.object({
  params: z.object({
    gameId: z.string().regex(objectIdRegex, 'Invalid gameId format'),
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const adminListVenuesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      status: z.string().trim().optional(),
      search: z.string().trim().optional(),
    })
    .optional(),
});
