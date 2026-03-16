import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@credsystem.com.br' },
    update: {},
    create: {
      email: 'admin@credsystem.com.br',
      name: 'Administrador',
      password: passwordHash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('✅ Usuário admin criado:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
