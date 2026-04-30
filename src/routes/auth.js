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

// Apply rate limiting to all auth endpoints (10 requests per minute)
router.use(authLimiter);

router.get('/github', githubAuthHandler);              // Step 1: start OAuth — redirect to GitHub
router.get('/github/callback', githubCallbackHandler); // Step 2: GitHub redirects back here with code
router.post('/github/token', githubCliTokenHandler);   // CLI only: exchange code + code_verifier for tokens
router.post('/refresh', refreshHandler);               // Issue new access + refresh token pair
router.post('/logout', logoutHandler);                 // Invalidate refresh token
router.all('/logout', (req, res) => res.status(405).json({ status: 'error', message: 'Method not allowed' })); // Block non-POST methods
router.get('/csrf-token', csrfTokenHandler);           // Issue CSRF token for web portal
router.get('/me', authenticate, meHandler);            // Get current authenticated user

export default router;
