// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import apiRoutes from './routes/api';
import { startBatchWorker } from './services/cronWorker';

const app = express();
const PORT = process.env.PORT || 5000;

// Simulation Config Layer - Globally visible throughout app engine contexts (Feature #2)
app.set('isFastForwardEnabled', false);

// 🔥 FIX: CORS Allow both 3000 and 5173
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('COMPANY API Server is running successfully!');
});

app.use('/api', apiRoutes);

// Pass Express app state to background monitor processes
startBatchWorker(app);

app.listen(PORT, () => {
    console.log(`🚀 COMPANY API Server live on http://localhost:${PORT}`);
});