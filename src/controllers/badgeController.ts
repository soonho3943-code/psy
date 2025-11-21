import { Response } from 'express';
import db from '../utils/database';
import { AuthRequest } from '../middleware/auth';

// 모든 뱃지 목록 조회
export const getAllBadges = (req: AuthRequest, res: Response) => {
  try {
    const badges = db.prepare('SELECT * FROM badges ORDER BY category, id').all();
    res.json(badges);
  } catch (error) {
    console.error('Get all badges error:', error);
    res.status(500).json({ error: '뱃지 조회 중 오류가 발생했습니다' });
  }
};

// 특정 학생의 획득한 뱃지 조회
export const getStudentBadges = (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.params;

    // 권한 체크: 학생은 같은 반 학생만 조회 가능
    if (req.user?.role === 'student' && req.user.id !== parseInt(student_id)) {
      // 같은 반인지 확인
      const currentStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as any;
      const targetStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(student_id) as any;

      if (!targetStudent || currentStudent.class_name !== targetStudent.class_name || currentStudent.grade !== targetStudent.grade) {
        return res.status(403).json({ error: '같은 반 학생만 조회할 수 있습니다' });
      }
    }

    const badges = db.prepare(`
      SELECT
        b.id, b.code, b.name, b.description, b.icon, b.category,
        sb.earned_at, sb.progress
      FROM badges b
      INNER JOIN student_badges sb ON b.id = sb.badge_id
      WHERE sb.student_id = ?
      ORDER BY sb.earned_at DESC
    `).all(student_id);

    res.json(badges);
  } catch (error) {
    console.error('Get student badges error:', error);
    res.status(500).json({ error: '뱃지 조회 중 오류가 발생했습니다' });
  }
};

// 학생별 뱃지 획득 현황 (교사용)
export const getBadgesSummary = (req: AuthRequest, res: Response) => {
  try {
    const summary = db.prepare(`
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.class_name,
        COUNT(sb.id) as badge_count,
        GROUP_CONCAT(b.icon) as badge_icons
      FROM users u
      LEFT JOIN student_badges sb ON u.id = sb.student_id
      LEFT JOIN badges b ON sb.badge_id = b.id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY badge_count DESC, u.class_name, u.name
    `).all();

    res.json(summary);
  } catch (error) {
    console.error('Get badges summary error:', error);
    res.status(500).json({ error: '뱃지 현황 조회 중 오류가 발생했습니다' });
  }
};

// 학생의 뱃지 진행 상황 (획득한 뱃지와 미획득 뱃지 모두)
export const getStudentBadgeProgress = (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.params;

    // 권한 체크: 학생은 같은 반 학생만 조회 가능
    if (req.user?.role === 'student' && req.user.id !== parseInt(student_id)) {
      // 같은 반인지 확인
      const currentStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as any;
      const targetStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(student_id) as any;

      if (!targetStudent || currentStudent.class_name !== targetStudent.class_name || currentStudent.grade !== targetStudent.grade) {
        return res.status(403).json({ error: '같은 반 학생만 조회할 수 있습니다' });
      }
    }

    const progress = db.prepare(`
      SELECT
        b.id, b.code, b.name, b.description, b.icon, b.category,
        sb.earned_at,
        CASE WHEN sb.id IS NOT NULL THEN 1 ELSE 0 END as earned
      FROM badges b
      LEFT JOIN student_badges sb ON b.id = sb.badge_id AND sb.student_id = ?
      ORDER BY earned DESC, b.category, b.id
    `).all(student_id);

    res.json(progress);
  } catch (error) {
    console.error('Get student badge progress error:', error);
    res.status(500).json({ error: '뱃지 진행 상황 조회 중 오류가 발생했습니다' });
  }
};

// 뱃지 통계
export const getBadgeStats = (req: AuthRequest, res: Response) => {
  try {
    const { student_id } = req.params;

    // 권한 체크: 학생은 같은 반 학생만 조회 가능
    if (req.user?.role === 'student' && req.user.id !== parseInt(student_id)) {
      // 같은 반인지 확인
      const currentStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as any;
      const targetStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(student_id) as any;

      if (!targetStudent || currentStudent.class_name !== targetStudent.class_name || currentStudent.grade !== targetStudent.grade) {
        return res.status(403).json({ error: '같은 반 학생만 조회할 수 있습니다' });
      }
    }

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT b.id) as total_badges,
        COUNT(DISTINCT sb.badge_id) as earned_badges,
        COUNT(DISTINCT CASE WHEN b.category = 'milestone' THEN sb.badge_id END) as milestone_count,
        COUNT(DISTINCT CASE WHEN b.category = 'streak' THEN sb.badge_id END) as streak_count,
        COUNT(DISTINCT CASE WHEN b.category = 'steps' THEN sb.badge_id END) as steps_count,
        COUNT(DISTINCT CASE WHEN b.category = 'time' THEN sb.badge_id END) as time_count,
        COUNT(DISTINCT CASE WHEN b.category = 'calories' THEN sb.badge_id END) as calories_count,
        COUNT(DISTINCT CASE WHEN b.category = 'distance' THEN sb.badge_id END) as distance_count
      FROM badges b
      LEFT JOIN student_badges sb ON b.id = sb.badge_id AND sb.student_id = ?
    `).get(student_id);

    res.json(stats);
  } catch (error) {
    console.error('Get badge stats error:', error);
    res.status(500).json({ error: '뱃지 통계 조회 중 오류가 발생했습니다' });
  }
};
