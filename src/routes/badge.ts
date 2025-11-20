import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getAllBadges,
  getStudentBadges,
  getBadgesSummary,
  getStudentBadgeProgress,
  getBadgeStats
} from '../controllers/badgeController';

const router = express.Router();

router.use(authenticateToken);

router.get('/all', getAllBadges);
router.get('/student/:student_id', getStudentBadges);
router.get('/student/:student_id/progress', getStudentBadgeProgress);
router.get('/student/:student_id/stats', getBadgeStats);
router.get('/summary', getBadgesSummary);

export default router;
