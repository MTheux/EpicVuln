import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@unisys.com', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'security@unisys.com', name: 'Analista AppSec', role: 'SEGURANCA' as const },
    { email: 'gestor@unisys.com', name: 'Gestor de Seguranca', role: 'GESTOR' as const },
    { email: 'squad@unisys.com', name: 'Dev Squad Backend', role: 'SQUAD' as const },
    { email: 'leitor@unisys.com', name: 'Auditor Externo', role: 'LEITURA' as const },
  ];

  // Create admin user with fixed password
  const adminPassword = await bcrypt.hash('admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@unisys.com' },
    update: { password: adminPassword, active: true },
    create: {
      email: 'admin@unisys.com',
      name: 'Administrador',
      role: 'ADMIN',
      password: adminPassword,
      active: true,
    },
  });
  console.log(`[ADMIN] ${adminUser.email} => Senha: admin@123`);

  // Em producao, use SEED_ADMIN_PASSWORD env var. Em dev, gera senhas aleatorias.
  const envPassword = process.env.SEED_ADMIN_PASSWORD;

  console.log('\n=== EpicVuln Seed - Credenciais Iniciais ===\n');

  for (const u of users) {
    const password = envPassword || crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash, active: true },
      create: { ...u, password: hash, active: true },
    });

    console.log(`[${u.role}] ${user.email} => Senha: ${envPassword ? '(definida via SEED_ADMIN_PASSWORD)' : password}`);
  }

  console.log('\n=== IMPORTANTE: Anote as senhas acima. Elas nao serao exibidas novamente. ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
