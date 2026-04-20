import { Router } from 'express';
import {
  createProfileHandler,
  getProfileByIdHandler,
  getProfilesHandler,
  searchProfilesHandler,
  deleteProfileHandler,
} from '../controllers/profileController.js';

const router = Router();

router.post('/', createProfileHandler);
router.get('/search', searchProfilesHandler);
router.get('/', getProfilesHandler);
router.get('/:id', getProfileByIdHandler);
router.delete('/:id', deleteProfileHandler);

export default router;
