import dotenv from 'dotenv';
dotenv.config({ override: true });
import app from './app';
import { prisma } from './app';
import { startScheduler } from './services/sla-scheduler.service';
import bcrypt from 'bcryptjs';

async function ensureTestUser() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: 'teste@gmail.com.br' } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: 'teste@gmail.com.br',
          password: await bcrypt.hash('teste@123', 10),
          name: 'Usuário Teste',
          role: 'ADMIN',
          active: true,
        }
      });
      console.log('Test user created: teste@gmail.com.br');
    }
  } catch (err) {
    console.error('Failed to ensure test user:', err);
  }
}

const PORT = process.env.PORT || 9001;

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT} - [Scorecard Refined v2]`);
    await ensureTestUser();
    startScheduler();
});
