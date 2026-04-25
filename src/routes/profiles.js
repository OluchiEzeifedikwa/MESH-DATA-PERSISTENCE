import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireApiVersion } from '../middleware/apiVersion.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  createProfileHandler,
  getProfileByIdHandler,
  getProfilesHandler,
  searchProfilesHandler,
  exportProfilesHandler,
  deleteProfileHandler,
} from '../controllers/profileController.js';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);
router.use(requireApiVersion);
router.use(csrfProtection);

router.post('/', requireRole('admin'), createProfileHandler);
router.get('/export', requireRole('admin', 'analyst'), exportProfilesHandler);
router.get('/search', requireRole('admin', 'analyst'), searchProfilesHandler);
router.get('/', requireRole('admin', 'analyst'), getProfilesHandler);
router.get('/:id', requireRole('admin', 'analyst'), getProfileByIdHandler);
router.delete('/:id', requireRole('admin'), deleteProfileHandler);

export default router;
