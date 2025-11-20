import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'student' | 'teacher' | 'admin' | 'parent';
    name: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }
    next();
  };
}

export function generateToken(user: { id: number; username: string; role: 'student' | 'teacher' | 'admin' | 'parent'; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
