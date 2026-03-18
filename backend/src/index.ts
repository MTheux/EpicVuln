import dotenv from 'dotenv';
dotenv.config({ override: true });
import app from './app';
import { startScheduler } from './services/sla-scheduler.service';

const PORT = process.env.PORT || 9001;

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT} - [Scorecard Refined v2]`);
    startScheduler();
});
