import { Router } from 'express';
import { createProfileHandler } from '../controllers/profileController.js';

const router = Router();

router.post('/', createProfileHandler);

export default router;
