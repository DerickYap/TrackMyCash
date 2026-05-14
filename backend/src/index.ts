import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { rateLimiter } from './middleware/rateLimiter';
import quoteRouter from './routes/quote';
import searchRouter from './routes/search';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// In dev the Vite dev server handles the frontend; only allow its origin.
// In production the frontend is served from this same Express instance,
// so all requests are same-origin and CORS is not needed.
if (!IS_PROD) {
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  app.use(cors({ origin: ALLOWED_ORIGIN }));
}

app.use(express.json());
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/quote', quoteRouter);
app.use('/api/search', searchRouter);

// Serve the built React app in production
if (IS_PROD) {
  const distPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Track My Cash running on http://localhost:${PORT}`);
});
