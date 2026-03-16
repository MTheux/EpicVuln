import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';

const app = express();
export const prisma = new PrismaClient();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:9000', 'http://localhost:3005', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Basic healthcheck route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import routes from './modules/routes';
app.use('/api', routes);

export default app;
