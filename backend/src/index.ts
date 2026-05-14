import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimiter } from './middleware/rateLimiter';
import quoteRouter from './routes/quote';
import searchRouter from './routes/search';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/quote', quoteRouter);
app.use('/api/search', searchRouter);

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`);
});
