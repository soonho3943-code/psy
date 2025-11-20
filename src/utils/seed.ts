import db, { initializeDatabase } from './database';
import bcrypt from 'bcrypt';
import { BADGE_DEFINITIONS } from './badgeDefinitions';
import { checkAndAwardBadges } from './badgeChecker';

export async function seedDatabase() {
  initializeDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database...');

  const password = await bcrypt.hash('1234', 10);

  // 관리자 계정
  db.prepare(`
    INSERT INTO users (username, password, role, name, email)
    VALUES (?, ?, 'admin', ?, ?)
  `).run('admin', password, '시스템 관리자', 'admin@school.com');

  // 교사 계정 (2명)
  const teachers = [
    { username: 'teacher1', name: '김선생', class: '1반', email: 'kim@school.com' },
    { username: 'teacher2', name: '이선생', class: '2반', email: 'lee@school.com' },
  ];

  teachers.forEach(teacher => {
    db.prepare(`
      INSERT INTO users (username, password, role, name, class_name, email)
      VALUES (?, ?, 'teacher', ?, ?, ?)
    `).run(teacher.username, password, teacher.name, teacher.class, teacher.email);
  });

  // 학생 계정 (각 반에 5명씩, 총 10명)
  const students = [
    // 1반
    { username: 'student1', name: '김민준', class: '1반', grade: 1 },
    { username: 'student2', name: '이서연', class: '1반', grade: 1 },
    { username: 'student3', name: '박지호', class: '1반', grade: 1 },
    { username: 'student4', name: '최수빈', class: '1반', grade: 1 },
    { username: 'student5', name: '정예은', class: '1반', grade: 1 },
    // 2반
    { username: 'student6', name: '강도윤', class: '2반', grade: 1 },
    { username: 'student7', name: '조서준', class: '2반', grade: 1 },
    { username: 'student8', name: '윤하은', class: '2반', grade: 1 },
    { username: 'student9', name: '장시우', class: '2반', grade: 1 },
    { username: 'student10', name: '임채원', class: '2반', grade: 1 },
  ];

  const studentIds: number[] = [];
  students.forEach(student => {
    const result = db.prepare(`
      INSERT INTO users (username, password, role, name, class_name, grade)
      VALUES (?, ?, 'student', ?, ?, ?)
    `).run(student.username, password, student.name, student.class, student.grade);
    studentIds.push(Number(result.lastInsertRowid));
  });

  // 학부모 계정 (5명 - 각각 2명의 자녀)
  const parents = [
    { username: 'parent1', name: '김부모', email: 'parent1@email.com', children: [0, 1] },
    { username: 'parent2', name: '이부모', email: 'parent2@email.com', children: [2, 3] },
    { username: 'parent3', name: '박부모', email: 'parent3@email.com', children: [4, 5] },
    { username: 'parent4', name: '최부모', email: 'parent4@email.com', children: [6, 7] },
    { username: 'parent5', name: '정부모', email: 'parent5@email.com', children: [8, 9] },
  ];

  parents.forEach(parent => {
    const result = db.prepare(`
      INSERT INTO users (username, password, role, name, email)
      VALUES (?, ?, 'parent', ?, ?)
    `).run(parent.username, password, parent.name, parent.email);

    const parentId = result.lastInsertRowid;

    // 부모-자녀 관계 설정
    parent.children.forEach(childIndex => {
      db.prepare(`
        INSERT INTO parent_student_relations (parent_id, student_id)
        VALUES (?, ?)
      `).run(parentId, studentIds[childIndex]);
    });
  });

  // 샘플 운동 기록 (최근 7일)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    studentIds.forEach(studentId => {
      const steps = 5000 + Math.floor(Math.random() * 10000);
      const minutes = 30 + Math.floor(Math.random() * 60);
      const calories = 200 + Math.floor(Math.random() * 300);
      const distance = 2 + Math.random() * 5;

      db.prepare(`
        INSERT INTO exercise_records (student_id, date, steps, exercise_minutes, calories, distance)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(studentId, dateStr, steps, minutes, calories, distance.toFixed(2));
    });
  }

  // 뱃지 정의 추가
  console.log('Seeding badges...');
  BADGE_DEFINITIONS.forEach(badge => {
    const existing = db.prepare('SELECT id FROM badges WHERE code = ?').get(badge.code);
    if (!existing) {
      db.prepare(`
        INSERT INTO badges (code, name, description, icon, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(badge.code, badge.name, badge.description, badge.icon, badge.category);
    }
  });

  // 모든 학생의 뱃지 체크 및 부여
  console.log('Checking and awarding badges...');
  studentIds.forEach(studentId => {
    checkAndAwardBadges(studentId);
  });

  console.log('Database seeded successfully');
  console.log('\n기본 계정:');
  console.log('관리자 - username: admin, password: 1234');
  console.log('교사 - username: teacher1~2, password: 1234');
  console.log('학생 - username: student1~10, password: 1234');
  console.log('학부모 - username: parent1~5, password: 1234');
}
