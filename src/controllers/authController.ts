import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../utils/database';
import { generateToken } from '../middleware/auth';
import { User } from '../models/types';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 잘못되었습니다' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        class_name: user.class_name,
        grade: user.grade
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { password, role, name, class_name, grade, email, phone } = req.body;

    if (!password || !role || !name) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요' });
    }

    if (!['student', 'teacher', 'admin', 'parent'].includes(role)) {
      return res.status(400).json({ error: '올바른 역할을 선택해주세요' });
    }

    // 이름을 기반으로 username 생성 (중복 시 숫자 추가)
    let username = name;
    let counter = 2;
    while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
      username = `${name}${counter}`;
      counter++;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, password, role, name, class_name, grade, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, role, name, class_name || null, grade || null, email || null, phone || null);

    res.status(201).json({
      message: '회원가입이 완료되었습니다',
      username: username,
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다' });
  }
};
