import express from 'express';
import { getProfileStats } from '../../controller/Profile/profileStatsController.js';
import {protect} from '../../MiddleWare/authMiddleware.js'
const router = express.Router();

router.get('/stats/:userId', protect, getProfileStats);

export default router;
