import db, { initializeDatabase } from './database';
import bcrypt from 'bcrypt';
import { BADGE_DEFINITIONS } from './badgeDefinitions';
import { checkAndAwardBadges } from './badgeChecker';

// 뱃지 정의를 데이터베이스에 추가하는 함수
export function seedBadges() {
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
  console.log('Badges seeded successfully');
}

export async function seedDatabase() {
  initializeDatabase();

  // 항상 뱃지 정의를 확인하고 추가
  seedBadges();

  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  const isFirstRun = !adminExists;

  if (!isFirstRun) {
    console.log('Cleaning up existing student data...');
    // 기존 학생 데이터 삭제
    db.prepare('DELETE FROM student_badges WHERE student_id IN (SELECT id FROM users WHERE role = \'student\')').run();
    db.prepare('DELETE FROM exercise_records WHERE student_id IN (SELECT id FROM users WHERE role = \'student\')').run();
    db.prepare('DELETE FROM parent_student_relations WHERE student_id IN (SELECT id FROM users WHERE role = \'student\')').run();
    db.prepare('DELETE FROM users WHERE role = \'student\'').run();
    db.prepare('DELETE FROM users WHERE role = \'parent\'').run();
    console.log('Student data cleaned up');
  } else {
    console.log('Seeding database...');
  }

  const password = await bcrypt.hash('1234', 10);

  // 관리자 계정
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (username, password, role, name, email)
      VALUES (?, ?, 'admin', ?, ?)
    `).run('admin', password, '시스템 관리자', 'admin@school.com');
    console.log('Created admin account');
  }

  // 교사 계정 (4명)
  const teachers = [
    { username: 'teacher1', name: '김선생', class: '1반', grade: 1, email: 'kim@school.com' },
    { username: 'teacher2', name: '이선생', class: '2반', grade: 1, email: 'lee@school.com' },
    { username: 'teacher3', name: '박선생', class: '3반', grade: 1, email: 'park@school.com' },
    { username: 'teacher4', name: '최선생', class: '4반', grade: 1, email: 'choi@school.com' },
  ];

  teachers.forEach(teacher => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(teacher.username);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (username, password, role, name, class_name, grade, email)
        VALUES (?, ?, 'teacher', ?, ?, ?, ?)
      `).run(teacher.username, password, teacher.name, teacher.class, teacher.grade, teacher.email);
      console.log(`Created teacher: ${teacher.name} (${teacher.username})`);
    }
  });

  // 학생 계정 (1학년 1반 10명 + 1학년 2반 3명)
  const students = [
    { name: '김민준', class: '1반', grade: 1 },
    { name: '이서연', class: '1반', grade: 1 },
    { name: '박지호', class: '1반', grade: 1 },
    { name: '최수빈', class: '1반', grade: 1 },
    { name: '정예은', class: '1반', grade: 1 },
    { name: '강도윤', class: '1반', grade: 1 },
    { name: '조서준', class: '1반', grade: 1 },
    { name: '윤하은', class: '1반', grade: 1 },
    { name: '장시우', class: '1반', grade: 1 },
    { name: '임채원', class: '1반', grade: 1 },
    { name: '2반테스트1', class: '2반', grade: 1 },
    { name: '2반테스트2', class: '2반', grade: 1 },
    { name: '2반테스트3', class: '2반', grade: 1 },
  ];

  const studentIds: number[] = [];
  students.forEach(student => {
    const result = db.prepare(`
      INSERT INTO users (username, password, role, name, class_name, grade)
      VALUES (?, ?, 'student', ?, ?, ?)
    `).run(student.name, password, student.name, student.class, student.grade);
    studentIds.push(Number(result.lastInsertRowid));
    console.log(`Created student: ${student.name}`);
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
    console.log(`Created parent: ${parent.name} (${parent.username})`);

    // 부모-자녀 관계 설정
    parent.children.forEach(childIndex => {
      if (studentIds[childIndex]) {
        db.prepare(`
          INSERT INTO parent_student_relations (parent_id, student_id)
          VALUES (?, ?)
        `).run(parentId, studentIds[childIndex]);
      }
    });
  });

  // 다양한 운동 기록 생성 (각 학생마다 다른 패턴)
  const today = new Date();
  const exercisePatterns = [
    { name: '김민준', days: 14, minSteps: 12000, maxSteps: 15000, active: true }, // 매우 활발
    { name: '이서연', days: 10, minSteps: 8000, maxSteps: 12000, active: true },  // 활발
    { name: '박지호', days: 7, minSteps: 5000, maxSteps: 8000, active: true },    // 보통
    { name: '최수빈', days: 5, minSteps: 3000, maxSteps: 6000, active: false },   // 가끔
    { name: '정예은', days: 12, minSteps: 10000, maxSteps: 14000, active: true }, // 매우 활발
    { name: '강도윤', days: 3, minSteps: 2000, maxSteps: 5000, active: false },   // 드물게
    { name: '조서준', days: 8, minSteps: 7000, maxSteps: 10000, active: true },   // 활발
    { name: '윤하은', days: 14, minSteps: 9000, maxSteps: 13000, active: true },  // 매우 활발
    { name: '장시우', days: 2, minSteps: 1000, maxSteps: 4000, active: false },   // 매우 드물게
    { name: '임채원', days: 6, minSteps: 6000, maxSteps: 9000, active: false },   // 보통
    { name: '2반테스트1', days: 10, minSteps: 8000, maxSteps: 11000, active: true }, // 활발
    { name: '2반테스트2', days: 7, minSteps: 6000, maxSteps: 9000, active: true },   // 보통
    { name: '2반테스트3', days: 5, minSteps: 4000, maxSteps: 7000, active: false },  // 가끔
  ];

  studentIds.forEach((studentId, index) => {
    const pattern = exercisePatterns[index];

    // 최근 N일 동안의 기록 생성
    for (let i = 0; i < pattern.days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const steps = pattern.minSteps + Math.floor(Math.random() * (pattern.maxSteps - pattern.minSteps));
      const minutes = Math.floor(steps / 100); // 걸음수에 비례한 운동 시간
      const calories = Math.floor(steps * 0.04); // 걸음수당 약 0.04 칼로리
      const distance = (steps * 0.0008).toFixed(2); // 걸음수 * 평균 보폭

      db.prepare(`
        INSERT INTO exercise_records (student_id, date, steps, exercise_minutes, calories, distance)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(studentId, dateStr, steps, minutes, calories, distance);
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
  console.log('교사 - username: teacher1~4, password: 1234');
  console.log('학생 - username: 이름 (예: 김민준, 이서연, 박지호...), password: 1234');
  console.log('학부모 - username: parent1~5, password: 1234');
}
