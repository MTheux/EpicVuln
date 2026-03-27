import dotenv from 'dotenv';
dotenv.config({ override: true });
import app from './app';
import { prisma } from './app';
import { startScheduler } from './services/sla-scheduler.service';
import bcrypt from 'bcryptjs';

async function ensureAdminUser() {
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
    console.log('Admin user ready: admin@unisys.com');
  } catch (err) {
    console.error('Failed to ensure admin user:', err);
  }
}

const PORT = process.env.PORT || 9001;

app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT} - [EpicVuln v2]`);
    await ensureAdminUser();
    startScheduler();
});
