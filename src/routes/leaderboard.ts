import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { getLeaderboard, getCategoryLeaderboard } from '../controllers/leaderboardController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getLeaderboard);
router.get('/category/:category', getCategoryLeaderboard);

export default router;
