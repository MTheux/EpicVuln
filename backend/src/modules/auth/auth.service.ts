import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../app';
import { z } from 'zod';
import { env } from '../../config/env';

export class AuthService {
  async login(email: string, passwordUnencrypted: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(passwordUnencrypted, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.active) {
      throw new Error('User is disable');
    }

    const jwtSecret = env.JWT_SECRET;
    const jwtExpiresIn = env.JWT_EXPIRES_IN;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn as any } // Cast to any to handle type mismatch in older jsonwebtoken types or env var
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      }
    });

    if (!user) throw new Error('User not found');
    return user;
  }
}
