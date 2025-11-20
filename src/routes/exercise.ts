import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  getStatistics
} from '../controllers/exerciseController';

const router = express.Router();

router.use(authenticateToken);

router.get('/records', getRecords);
router.post('/records', createRecord);
router.put('/records/:id', updateRecord);
router.delete('/records/:id', deleteRecord);
router.get('/statistics', getStatistics);

export default router;
