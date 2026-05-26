import dotenv from 'dotenv';
dotenv.config({ override: true });
import app from './app';
import { prisma } from './app';
import { startScheduler } from './services/sla-scheduler.service';
import { bootstrapRag } from './modules/rag/rag.service';
import bcrypt from 'bcryptjs';

async function ensureAdminUser(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const hash = await bcrypt.hash('admin@123', 10);
      await prisma.user.upsert({
        where: { email: 'admin@unisys.com' },
        update: { password: hash, role: 'ADMIN', active: true },
        create: {
          email: 'admin@unisys.com',
          password: hash,
          name: 'Administrador',
          role: 'ADMIN',
          active: true,
        }
      });
      console.log('Admin user ready: admin@unisys.com / admin@123');
      return;
    } catch (err) {
      console.error(`Failed to ensure admin user (attempt ${i + 1}/${retries}):`, err);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
}

const PORT = process.env.PORT || 9001;

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT} - [UnisysGuard]`);
    await ensureAdminUser();
    await bootstrapRag();
    startScheduler();
});
