import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import profilesRouter from './src/routes/profiles.js';
import authRouter from './src/routes/auth.js';
import { requestLogger } from './src/middleware/requestLogger.js';
import { authenticate } from './src/middleware/authenticate.js';
import { meHandler } from './src/controllers/authController.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use('/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.get('/api/users/me', authenticate, meHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
