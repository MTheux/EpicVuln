import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email('Email invalido.'),
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres.'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres.'),
  role: z.nativeEnum(Role).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres.').optional(),
  email: z.string().email('Email invalido.').optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
