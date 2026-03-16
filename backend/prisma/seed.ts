import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);

  const users = [
    { email: 'admin@credsystem.com', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'security@credsystem.com', name: 'Analista AppSec', role: 'SEGURANCA' as const },
    { email: 'gestor@credsystem.com', name: 'Gestor de Segurança', role: 'GESTOR' as const },
    { email: 'squad@credsystem.com', name: 'Dev Squad Backend', role: 'SQUAD' as const },
    { email: 'leitor@credsystem.com', name: 'Auditor Externo', role: 'LEITURA' as const },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hash, active: true },
    });
    console.log(`✅ ${u.role}: ${user.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
