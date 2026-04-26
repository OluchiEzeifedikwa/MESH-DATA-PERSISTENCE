import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import profilesRouter from './src/routes/profiles.js';
import authRouter from './src/routes/auth.js';
import { requestLogger } from './src/middleware/requestLogger.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use('/auth', authRouter);
app.use('/api/profiles', profilesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
