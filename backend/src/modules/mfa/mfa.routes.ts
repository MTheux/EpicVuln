import { Router, Request, Response } from 'express';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth.middleware';

/**
 * MFA TOTP (Time-based One-Time Password) — compatível com Google Authenticator,
 * Microsoft Authenticator, Authy, etc.
 *
 * Endpoints:
 *  - POST /setup → gera secret + otpauth URI + QR code PNG base64
 *  - POST /verify → valida código de 6 dígitos e ativa MFA na conta
 *  - POST /disable → desativa MFA (requer código atual)
 *  - POST /reset/:userId → admin reseta MFA de outro user
 *  - GET /status → retorna se MFA está ativo
 *
 * Secret persistido em SystemSettings como `mfa:<userId>` (JSON com secret + enabled).
 * Em prod, mover pra coluna dedicada na tabela User com encryption at rest.
 */

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

authenticator.options = { window: 1, step: 30 };

const mfaKey = (userId: string) => `mfa:${userId}`;

async function getMfaData(userId: string): Promise<{ secret: string; enabled: boolean } | null> {
  const s = await prisma.systemSettings.findUnique({ where: { key: mfaKey(userId) } });
  if (!s) return null;
  try { return JSON.parse(s.value); } catch { return null; }
}

async function setMfaData(userId: string, data: { secret: string; enabled: boolean }) {
  await prisma.systemSettings.upsert({
    where: { key: mfaKey(userId) },
    update: { value: JSON.stringify(data) },
    create: { key: mfaKey(userId), value: JSON.stringify(data) },
  });
}

router.get('/status', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'auth required' });
  const data = await getMfaData(userId);
  res.json({ enabled: !!data?.enabled, configured: !!data });
});

router.post('/setup', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: 'auth required' });

    const secret = authenticator.generateSecret();
    const issuer = 'UnisysGuard';
    const accountName = user.email || user.id;
    const otpauthUri = authenticator.keyuri(accountName, issuer, secret);
    const qrPng = await qrcode.toDataURL(otpauthUri, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

    // Save secret as not-yet-enabled (user must verify first to activate)
    await setMfaData(user.id, { secret, enabled: false });

    res.json({
      secret,           // manual entry fallback
      otpauthUri,       // otpauth://totp/UnisysGuard:user@unisys.com?secret=XXX&issuer=UnisysGuard
      qrPngDataUrl: qrPng,
      issuer,
      accountName,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.body || {};
    if (!user?.id) return res.status(401).json({ error: 'auth required' });
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ error: 'Código TOTP de 6 dígitos obrigatório' });
    }
    const data = await getMfaData(user.id);
    if (!data) return res.status(400).json({ error: 'Execute /setup primeiro' });

    const valid = authenticator.check(String(code), data.secret);
    if (!valid) return res.status(401).json({ ok: false, error: 'Código inválido' });

    await setMfaData(user.id, { secret: data.secret, enabled: true });
    res.json({ ok: true, enabled: true, message: 'MFA ativado com sucesso' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/disable', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code } = req.body || {};
    if (!user?.id) return res.status(401).json({ error: 'auth required' });
    const data = await getMfaData(user.id);
    if (!data?.enabled) return res.status(400).json({ error: 'MFA não está ativo' });

    if (!code || !authenticator.check(String(code), data.secret)) {
      return res.status(401).json({ ok: false, error: 'Código TOTP atual obrigatório pra desativar' });
    }
    await prisma.systemSettings.deleteMany({ where: { key: mfaKey(user.id) } });
    res.json({ ok: true, enabled: false, message: 'MFA desativado' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reset/:userId', async (req: Request, res: Response) => {
  try {
    const me = (req as any).user;
    if (me?.role !== 'ADMIN') return res.status(403).json({ error: 'Apenas ADMIN pode resetar MFA de outros' });
    const targetUserId = String(req.params.userId);
    const result = await prisma.systemSettings.deleteMany({ where: { key: mfaKey(targetUserId) } });
    res.json({ ok: true, reset: result.count > 0, message: `MFA do user ${targetUserId} resetado. Usuário precisará fazer setup novamente.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
