import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { globalLimiter } from './rate-limiters';

const app = express();
export const prisma = new PrismaClient();

// Re-export for backward compat
export { globalLimiter, authLimiter, llmLimiter } from './rate-limiters';

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:9000').split(',');
allowedOrigins.push('http://localhost:3005', 'http://localhost:3000');

// Middlewares
app.use(helmet());
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(globalLimiter);

// Basic healthcheck route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import routes from './modules/routes';
app.use('/api', routes);

export default app;
