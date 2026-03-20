import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@credsystem.com.br', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'security@credsystem.com.br', name: 'Analista AppSec', role: 'SEGURANCA' as const },
    { email: 'gestor@credsystem.com.br', name: 'Gestor de Seguranca', role: 'GESTOR' as const },
    { email: 'squad@credsystem.com.br', name: 'Dev Squad Backend', role: 'SQUAD' as const },
    { email: 'leitor@credsystem.com.br', name: 'Auditor Externo', role: 'LEITURA' as const },
  ];

  // Em producao, use SEED_ADMIN_PASSWORD env var. Em dev, gera senhas aleatorias.
  const envPassword = process.env.SEED_ADMIN_PASSWORD;

  console.log('\n=== VulnControl Seed - Credenciais Iniciais ===\n');

  for (const u of users) {
    const password = envPassword || crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hash, active: true },
    });

    console.log(`[${u.role}] ${user.email} => Senha: ${envPassword ? '(definida via SEED_ADMIN_PASSWORD)' : password}`);
  }

  console.log('\n=== IMPORTANTE: Anote as senhas acima. Elas nao serao exibidas novamente. ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
