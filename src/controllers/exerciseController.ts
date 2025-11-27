import { Response } from 'express';
import db from '../utils/database';
import { AuthRequest } from '../middleware/auth';
import { ExerciseRecord } from '../models/types';
import { checkAndAwardBadges } from '../utils/badgeChecker';

export const getRecords = (req: AuthRequest, res: Response) => {
  try {
    const { student_id, start_date, end_date } = req.query;
    let query = 'SELECT * FROM exercise_records WHERE 1=1';
    const params: any[] = [];

    // 권한 체크
    if (req.user?.role === 'student') {
      query += ' AND student_id = ?';
      params.push(req.user.id);
    } else if (student_id) {
      query += ' AND student_id = ?';
      params.push(student_id);
    }

    if (start_date) {
      query += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date DESC';

    const records = db.prepare(query).all(...params) as ExerciseRecord[];
    res.json(records);
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: '기록 조회 중 오류가 발생했습니다' });
  }
};

export const createRecord = (req: AuthRequest, res: Response) => {
  try {
    const { date, steps, exercise_minutes, calories, distance, notes } = req.body;
    const student_id = req.user?.role === 'student' ? req.user.id : req.body.student_id;

    if (!student_id || !date) {
      return res.status(400).json({ error: '필수 정보를 입력해주세요' });
    }

    const result = db.prepare(`
      INSERT INTO exercise_records (student_id, date, steps, exercise_minutes, calories, distance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(student_id, date, steps || 0, exercise_minutes || 0, calories || 0, distance || 0, notes || null);

    // 뱃지 체크 및 부여
    checkAndAwardBadges(student_id);

    res.status(201).json({
      message: '운동 기록이 저장되었습니다',
      id: result.lastInsertRowid
    });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: '해당 날짜의 기록이 이미 존재합니다' });
    }
    console.error('Create record error:', error);
    res.status(500).json({ error: '기록 저장 중 오류가 발생했습니다' });
  }
};

export const updateRecord = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { steps, exercise_minutes, calories, distance, notes } = req.body;

    // 권한 체크 - 학생은 자신의 기록만 수정 가능
    if (req.user?.role === 'student') {
      const record = db.prepare('SELECT student_id FROM exercise_records WHERE id = ?').get(id) as { student_id: number } | undefined;
      if (!record || record.student_id !== req.user.id) {
        return res.status(403).json({ error: '권한이 없습니다' });
      }
    }

    const record = db.prepare('SELECT student_id FROM exercise_records WHERE id = ?').get(id) as { student_id: number } | undefined;

    const result = db.prepare(`
      UPDATE exercise_records
      SET steps = ?, exercise_minutes = ?, calories = ?, distance = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(steps, exercise_minutes, calories, distance, notes, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    }

    // 뱃지 체크 및 부여
    if (record) {
      checkAndAwardBadges(record.student_id);
    }

    res.json({ message: '기록이 수정되었습니다' });
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ error: '기록 수정 중 오류가 발생했습니다' });
  }
};

export const deleteRecord = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 권한 체크
    if (req.user?.role === 'student') {
      const record = db.prepare('SELECT student_id FROM exercise_records WHERE id = ?').get(id) as { student_id: number } | undefined;
      if (!record || record.student_id !== req.user.id) {
        return res.status(403).json({ error: '권한이 없습니다' });
      }
    }

    const result = db.prepare('DELETE FROM exercise_records WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    }

    res.json({ message: '기록이 삭제되었습니다' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ error: '기록 삭제 중 오류가 발생했습니다' });
  }
};

export const getStatistics = (req: AuthRequest, res: Response) => {
  try {
    const { student_id, period } = req.query;
    let targetStudentId = student_id;

    if (req.user?.role === 'student') {
      targetStudentId = req.user.id.toString();
    }

    if (!targetStudentId) {
      return res.status(400).json({ error: '학생 ID가 필요합니다' });
    }

    const today = new Date().toISOString().split('T')[0];
    let startDate = today;

    if (period === 'week') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      startDate = date.toISOString().split('T')[0];
    } else if (period === 'month') {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_days,
        SUM(steps) as total_steps,
        SUM(exercise_minutes) as total_minutes,
        SUM(calories) as total_calories,
        SUM(distance) as total_distance,
        AVG(steps) as avg_steps,
        AVG(exercise_minutes) as avg_minutes,
        AVG(calories) as avg_calories,
        AVG(distance) as avg_distance
      FROM exercise_records
      WHERE student_id = ? AND date >= ?
    `).get(targetStudentId, startDate);

    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다' });
  }
};

// 교사용: 담임반 학생들의 최근 운동 기록 조회
export const getClassRecentRecords = (req: AuthRequest, res: Response) => {
  try {
    // 교사만 접근 가능
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // 교사의 담임반 정보 가져오기
    const teacher = db.prepare('SELECT class_name FROM users WHERE id = ?').get(req.user.id) as { class_name: string } | undefined;

    if (!teacher || !teacher.class_name) {
      return res.status(400).json({ error: '담임반 정보가 없습니다' });
    }

    // 담임반 학생들의 최근 운동 기록 조회 (학생별로 가장 최근 기록만)
    const records = db.prepare(`
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.class_name,
        u.grade,
        e.date,
        e.steps,
        e.exercise_minutes,
        e.calories,
        e.distance,
        e.notes
      FROM users u
      LEFT JOIN (
        SELECT e1.*
        FROM exercise_records e1
        INNER JOIN (
          SELECT student_id, MAX(date) as max_date
          FROM exercise_records
          GROUP BY student_id
        ) e2 ON e1.student_id = e2.student_id AND e1.date = e2.max_date
      ) e ON u.id = e.student_id
      WHERE u.role = 'student' AND u.class_name = ?
      ORDER BY COALESCE(e.steps, 0) DESC, u.name ASC
    `).all(teacher.class_name);

    res.json(records);
  } catch (error) {
    console.error('Get class recent records error:', error);
    res.status(500).json({ error: '반 학생 기록 조회 중 오류가 발생했습니다' });
  }
};

// 주간 통계 그래프 데이터 조회 (개인 + 학급 평균)
export const getWeeklyChartData = (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.query;
    let targetStudentId = student_id;

    if (req.user?.role === 'student') {
      targetStudentId = req.user.id.toString();
    }

    if (!targetStudentId) {
      return res.status(400).json({ error: '학생 ID가 필요합니다' });
    }

    // 학생의 반 정보 가져오기
    const student = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(targetStudentId) as { class_name: string; grade: number } | undefined;

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다' });
    }

    // 지난 7일 날짜 생성
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // 개인 데이터 조회
    const personalData = db.prepare(`
      SELECT date, steps, exercise_minutes
      FROM exercise_records
      WHERE student_id = ? AND date >= ?
      ORDER BY date ASC
    `).all(targetStudentId, dates[0]) as Array<{ date: string; steps: number; exercise_minutes: number }>;

    // 날짜별로 매핑
    const personalMap = new Map(personalData.map(record => [record.date, record]));
    const personalSteps = dates.map(date => personalMap.get(date)?.steps || 0);
    const personalMinutes = dates.map(date => personalMap.get(date)?.exercise_minutes || 0);

    // 학급 평균 데이터 조회 (같은 반 학생들의 평균)
    const classAverageData = db.prepare(`
      SELECT
        e.date,
        AVG(e.steps) as avg_steps,
        AVG(e.exercise_minutes) as avg_minutes
      FROM exercise_records e
      INNER JOIN users u ON e.student_id = u.id
      WHERE u.class_name = ? AND e.date >= ?
      GROUP BY e.date
      ORDER BY e.date ASC
    `).all(student.class_name, dates[0]) as Array<{ date: string; avg_steps: number; avg_minutes: number }>;

    // 날짜별로 매핑
    const classMap = new Map(classAverageData.map(record => [record.date, record]));
    const classAvgSteps = dates.map(date => Math.round(classMap.get(date)?.avg_steps || 0));
    const classAvgMinutes = dates.map(date => Math.round(classMap.get(date)?.avg_minutes || 0));

    res.json({
      dates,
      personal: {
        steps: personalSteps,
        minutes: personalMinutes
      },
      classAverage: {
        steps: classAvgSteps,
        minutes: classAvgMinutes
      }
    });
  } catch (error) {
    console.error('Get weekly chart data error:', error);
    res.status(500).json({ error: '주간 데이터 조회 중 오류가 발생했습니다' });
  }
};
