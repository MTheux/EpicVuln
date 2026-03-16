import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalido.'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token e obrigatorio.' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
