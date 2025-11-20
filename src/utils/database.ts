import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';

const db: DatabaseType = new Database(path.join(__dirname, '../../data/exercise.db'));

db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  // Users table - 모든 사용자 (학생, 교사, 관리자, 학부모)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin', 'parent')),
      name TEXT NOT NULL,
      class_name TEXT,
      grade INTEGER,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Exercise records table - 운동 기록
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      steps INTEGER DEFAULT 0,
      exercise_minutes INTEGER DEFAULT 0,
      calories REAL DEFAULT 0,
      distance REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(student_id, date)
    )
  `);

  // Parent-Student relations table - 학부모-학생 관계
  db.exec(`
    CREATE TABLE IF NOT EXISTS parent_student_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      relation_type TEXT DEFAULT 'parent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(parent_id, student_id)
    )
  `);

  // Goals table - 운동 목표 설정
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      goal_type TEXT NOT NULL CHECK(goal_type IN ('daily', 'weekly', 'monthly')),
      steps_goal INTEGER,
      exercise_minutes_goal INTEGER,
      calories_goal REAL,
      distance_goal REAL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Badges table - 뱃지 정의
  db.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Student badges table - 학생 뱃지 획득 기록
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      badge_id INTEGER NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      progress INTEGER DEFAULT 100,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
      UNIQUE(student_id, badge_id)
    )
  `);

  console.log('Database initialized successfully');
}

export default db;
