import { Response } from 'express';
import db from '../utils/database';
import { AuthRequest } from '../middleware/auth';

// 신체 기록 조회
export const getPhysicalRecords = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { student_id, start_date, end_date } = req.query;

    let targetStudentId: number;

    // 학생인 경우 자신의 기록만 조회
    if (role === 'student') {
      targetStudentId = userId;
    } else {
      // 교사/관리자/학부모인 경우 student_id 파라미터 사용
      if (!student_id) {
        return res.status(400).json({ error: '학생 ID가 필요합니다' });
      }
      targetStudentId = parseInt(student_id as string);
    }

    let query = `
      SELECT * FROM physical_records
      WHERE student_id = ?
    `;
    const params: any[] = [targetStudentId];

    if (start_date) {
      query += ` AND date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND date <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY date DESC`;

    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    console.error('Get physical records error:', error);
    res.status(500).json({ error: '신체 기록 조회 중 오류가 발생했습니다' });
  }
};

// 신체 기록 추가
export const createPhysicalRecord = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { student_id, date, height, weight, notes } = req.body;

    let targetStudentId: number;

    // 학생인 경우 자신의 기록만 추가 가능
    if (role === 'student') {
      targetStudentId = userId;
    } else {
      // 교사/관리자인 경우 student_id 사용
      if (!student_id) {
        return res.status(400).json({ error: '학생 ID가 필요합니다' });
      }
      targetStudentId = parseInt(student_id);
    }

    // 필수 항목 체크
    if (!date || !height || !weight) {
      return res.status(400).json({ error: '날짜, 키, 몸무게는 필수 항목입니다' });
    }

    const stmt = db.prepare(`
      INSERT INTO physical_records (student_id, date, height, weight, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(targetStudentId, date, height, weight, notes || null);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: '신체 기록이 추가되었습니다'
    });
  } catch (error: any) {
    console.error('Create physical record error:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: '해당 날짜의 기록이 이미 존재합니다' });
    } else {
      res.status(500).json({ error: '신체 기록 추가 중 오류가 발생했습니다' });
    }
  }
};

// 신체 기록 수정
export const updatePhysicalRecord = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    const { height, weight, notes } = req.body;

    // 기존 기록 확인
    const existing = db.prepare('SELECT * FROM physical_records WHERE id = ?').get(id) as any;

    if (!existing) {
      return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    }

    // 권한 확인 (학생은 자신의 기록만, 교사/관리자는 모든 기록)
    if (role === 'student' && existing.student_id !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const stmt = db.prepare(`
      UPDATE physical_records
      SET height = ?, weight = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(height, weight, notes || null, id);

    res.json({ message: '신체 기록이 수정되었습니다' });
  } catch (error) {
    console.error('Update physical record error:', error);
    res.status(500).json({ error: '신체 기록 수정 중 오류가 발생했습니다' });
  }
};

// 신체 기록 삭제
export const deletePhysicalRecord = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    // 기존 기록 확인
    const existing = db.prepare('SELECT * FROM physical_records WHERE id = ?').get(id) as any;

    if (!existing) {
      return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    }

    // 권한 확인
    if (role === 'student' && existing.student_id !== userId) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const stmt = db.prepare('DELETE FROM physical_records WHERE id = ?');
    stmt.run(id);

    res.json({ message: '신체 기록이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete physical record error:', error);
    res.status(500).json({ error: '신체 기록 삭제 중 오류가 발생했습니다' });
  }
};

// 최근 신체 정보 조회 (대시보드용)
export const getLatestPhysicalInfo = (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { student_id } = req.query;

    let targetStudentId: number;

    if (role === 'student') {
      targetStudentId = userId;
    } else {
      if (!student_id) {
        return res.status(400).json({ error: '학생 ID가 필요합니다' });
      }
      targetStudentId = parseInt(student_id as string);
    }

    const latest = db.prepare(`
      SELECT * FROM physical_records
      WHERE student_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(targetStudentId);

    res.json(latest || null);
  } catch (error) {
    console.error('Get latest physical info error:', error);
    res.status(500).json({ error: '최근 신체 정보 조회 중 오류가 발생했습니다' });
  }
};
