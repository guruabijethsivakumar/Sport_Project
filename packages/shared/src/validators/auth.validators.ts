import { z } from 'zod';

/**
 * Login Form Schema
 * - Email: trimmed and lowercased, valid email format
 * - Password: non-empty required (no strength policy enforced on login to prevent lockout/leakage)
 */
export const loginFormSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type LoginFormValues = LoginFormData;
