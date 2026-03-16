import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

const app = express();
export const prisma = new PrismaClient();

// Rate limiters
export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});

export const llmLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many LLM requests, please try again later.' },
});

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
