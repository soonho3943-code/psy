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

    // 교사인 경우 자신의 담임반 학생만 조회
    if (req.user?.role === 'teacher') {
      const currentTeacher = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as User | undefined;

      if (!currentTeacher || !currentTeacher.class_name || !currentTeacher.grade) {
        return res.status(400).json({ error: '교사 정보가 완전하지 않습니다' });
      }

      const students = db.prepare(`
        SELECT id, username, name, class_name, grade
        FROM users
        WHERE role = 'student' AND class_name = ? AND grade = ?
        ORDER BY name
      `).all(currentTeacher.class_name, currentTeacher.grade) as User[];
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

// 학생 정보 수정 (교사만 가능)
export const updateStudent = (req: AuthRequest, res: Response) => {
  try {
    // 교사 권한 체크
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    const { id } = req.params;
    const { name, class_name, grade, email, phone } = req.body;

    // 학생 존재 여부 확인
    const student = db.prepare('SELECT id, role, class_name, grade FROM users WHERE id = ?').get(id) as User | undefined;

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: '학생이 아닙니다' });
    }

    // 교사의 담임반 학생인지 확인
    const teacher = db.prepare('SELECT class_name, grade FROM users WHERE id = ?').get(req.user.id) as User;
    if (student.class_name !== teacher.class_name || student.grade !== teacher.grade) {
      return res.status(403).json({ error: '자신의 담임반 학생만 수정할 수 있습니다' });
    }

    // 필수 필드 체크
    if (!name || !class_name || !grade) {
      return res.status(400).json({ error: '이름, 반, 학년은 필수입니다' });
    }

    // 학년 유효성 체크
    const gradeNum = typeof grade === 'number' ? grade : parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      return res.status(400).json({ error: '학년은 1~6 사이의 숫자여야 합니다' });
    }

    // 반 정보 유효성 체크
    if (typeof class_name !== 'string' || !class_name.endsWith('반')) {
      return res.status(400).json({ error: '반 정보가 올바르지 않습니다 (예: 1반, 2반)' });
    }

    // 학생 정보 수정
    const result = db.prepare(`
      UPDATE users
      SET name = ?, class_name = ?, grade = ?, email = ?, phone = ?
      WHERE id = ? AND role = 'student'
    `).run(name, class_name, gradeNum, email || null, phone || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '학생 정보를 수정할 수 없습니다' });
    }

    res.json({ message: '학생 정보가 수정되었습니다' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: '학생 정보 수정 중 오류가 발생했습니다' });
  }
};
