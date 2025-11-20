import { Response } from 'express';
import db from '../utils/database';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/types';

export const getUsers = (req: AuthRequest, res: Response) => {
  try {
    const { role, class_name } = req.query;
    let query = 'SELECT id, username, role, name, class_name, grade, email, phone, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (class_name) {
      query += ' AND class_name = ?';
      params.push(class_name);
    }

    query += ' ORDER BY created_at DESC';

    const users = db.prepare(query).all(...params) as User[];
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: '사용자 조회 중 오류가 발생했습니다' });
  }
};

export const getStudents = (req: AuthRequest, res: Response) => {
  try {
    const { class_name } = req.query;

    // 학부모인 경우 자신의 자녀만 조회
    if (req.user?.role === 'parent') {
      const students = db.prepare(`
        SELECT u.id, u.username, u.name, u.class_name, u.grade
        FROM users u
        INNER JOIN parent_student_relations psr ON u.id = psr.student_id
        WHERE psr.parent_id = ? AND u.role = 'student'
      `).all(req.user.id) as User[];
      return res.json(students);
    }

    // 학생인 경우 같은 반 학생만 조회
    if (req.user?.role === 'student') {
      const currentStudent = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as User;
      const students = db.prepare(`
        SELECT id, username, name, class_name, grade
        FROM users
        WHERE role = 'student' AND class_name = ? AND grade = ?
        ORDER BY name
      `).all(currentStudent.class_name, currentStudent.grade) as User[];
      return res.json(students);
    }

    let query = 'SELECT id, username, name, class_name, grade FROM users WHERE role = ?';
    const params: any[] = ['student'];

    if (class_name) {
      query += ' AND class_name = ?';
      params.push(class_name);
    }

    query += ' ORDER BY class_name, name';

    const students = db.prepare(query).all(...params) as User[];
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: '학생 조회 중 오류가 발생했습니다' });
  }
};

export const getUserProfile = (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    const user = db.prepare(`
      SELECT id, username, role, name, class_name, grade, email, phone, created_at
      FROM users WHERE id = ?
    `).get(req.user.id) as User | undefined;

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다' });
  }
};
