import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  githubAuthHandler,
  githubCallbackHandler,
  githubCliTokenHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  csrfTokenHandler,
} from '../controllers/authController.js';

const router = Router();

router.use(authLimiter);

router.get('/github', githubAuthHandler);
router.get('/github/callback', githubCallbackHandler);
router.post('/github/token', githubCliTokenHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);
router.get('/csrf-token', csrfTokenHandler);
router.get('/me', authenticate, meHandler);

export default router;
