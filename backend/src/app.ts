import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { globalLimiter } from './rate-limiters';

const app = express();
export const prisma = new PrismaClient();

// Re-export for backward compat
export { globalLimiter, authLimiter, llmLimiter } from './rate-limiters';

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:9000').split(',');
allowedOrigins.push('http://localhost:3005', 'http://localhost:3000');

// Function to check if an origin is allowed based on patterns
function isOriginAllowed(origin: string): boolean {
    // Check exact match from env/config
    if (allowedOrigins.includes(origin)) return true;

    // Allow localhost on any port
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;

    // Allow private network IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    if (/^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
    if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
    if (/^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin)) return true;

    return false;
}

// Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
        }
    }
}));
app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (server-to-server, curl, etc.)
        if (!origin) {
            callback(null, true);
            return;
        }
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            // Log blocked origin for debugging, but don't leak info in error
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);

// Health & readiness probes
const startedAt = Date.now();
app.get('/health', async (_req, res) => {
    const uptime = Math.round((Date.now() - startedAt) / 1000);
    let db: 'ok' | 'down' = 'down';
    let dbLatencyMs: number | null = null;
    try {
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - t0;
        db = 'ok';
    } catch {}
    const status = db === 'ok' ? 'ok' : 'degraded';
    res.status(status === 'ok' ? 200 : 503).json({
        status,
        service: 'unisysguard-backend',
        version: '1.0.0',
        uptimeSeconds: uptime,
        timestamp: new Date().toISOString(),
        checks: { db: { status: db, latencyMs: dbLatencyMs } },
    });
});
app.get('/readiness', (_req, res) => res.json({ status: 'ready' }));
app.get('/liveness', (_req, res) => res.json({ status: 'alive' }));

import routes from './modules/routes';
app.use('/api', routes);

export default app;
