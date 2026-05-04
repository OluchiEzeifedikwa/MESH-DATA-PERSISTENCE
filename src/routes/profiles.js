import { Router } from 'express';
import multer from 'multer';
import os from 'os';
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
  ingestProfilesHandler,
} from '../controllers/profileController.js';

// Disk storage: multer writes the upload to a temp file instead of holding it in memory.
// The controller streams from the temp path and deletes it when done.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `ingest-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);
router.use(apiLimiter);
router.use(requireApiVersion);
router.use(csrfProtection);

router.post('/', requireRole('admin'), createProfileHandler);
router.post('/ingest', requireRole('admin'), upload.single('file'), ingestProfilesHandler);
router.get('/export', requireRole('admin', 'analyst'), exportProfilesHandler);
router.get('/search', requireRole('admin', 'analyst'), searchProfilesHandler);
router.get('/', requireRole('admin', 'analyst'), getProfilesHandler);
router.get('/:id', requireRole('admin', 'analyst'), getProfileByIdHandler);
router.delete('/:id', requireRole('admin'), deleteProfileHandler);

export default router;
