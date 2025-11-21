import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getUsers, getStudents, getUserProfile, updateStudent } from '../controllers/userController';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getUserProfile);
router.get('/students', getStudents);
router.get('/', requireRole('admin', 'teacher'), getUsers);
router.put('/students/:id', updateStudent);

export default router;
