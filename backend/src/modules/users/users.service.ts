import { prisma } from '../../app';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) throw new Error('User not found');
    return user;
  }

  async create(data: { name: string; email: string; password?: string; role?: Role; active?: boolean }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email already in use');

    const rawPassword = data.password || 'Mudar@123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'LEITURA',
        active: data.active ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }

  async update(id: string, data: { name?: string; role?: Role; active?: boolean; password?: string }) {
    let updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });
  }
}
