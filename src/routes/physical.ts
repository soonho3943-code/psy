import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getPhysicalRecords,
  createPhysicalRecord,
  updatePhysicalRecord,
  deletePhysicalRecord,
  getLatestPhysicalInfo
} from '../controllers/physicalController';

const router = express.Router();

router.use(authenticateToken);

router.get('/records', getPhysicalRecords);
router.post('/records', createPhysicalRecord);
router.put('/records/:id', updatePhysicalRecord);
router.delete('/records/:id', deletePhysicalRecord);
router.get('/latest', getLatestPhysicalInfo);

export default router;
