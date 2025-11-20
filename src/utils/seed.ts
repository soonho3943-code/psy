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
  if (adminExists) {
    console.log('Database already has admin account, checking for new users...');
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
    { username: 'teacher1', name: '김선생', class: '1반', email: 'kim@school.com' },
    { username: 'teacher2', name: '이선생', class: '2반', email: 'lee@school.com' },
    { username: 'teacher3', name: '박선생', class: '3반', email: 'park@school.com' },
    { username: 'teacher4', name: '최선생', class: '4반', email: 'choi@school.com' },
  ];

  teachers.forEach(teacher => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(teacher.username);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (username, password, role, name, class_name, email)
        VALUES (?, ?, 'teacher', ?, ?, ?)
      `).run(teacher.username, password, teacher.name, teacher.class, teacher.email);
      console.log(`Created teacher: ${teacher.name} (${teacher.username})`);
    }
  });

  // 학생 계정 (모두 1학년 1반, 총 20명)
  // username을 이름으로 사용
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
    { name: '한지우', class: '1반', grade: 1 },
    { name: '신유나', class: '1반', grade: 1 },
    { name: '오태양', class: '1반', grade: 1 },
    { name: '송하늘', class: '1반', grade: 1 },
    { name: '배지안', class: '1반', grade: 1 },
    { name: '권민서', class: '1반', grade: 1 },
    { name: '남준호', class: '1반', grade: 1 },
    { name: '문소희', class: '1반', grade: 1 },
    { name: '표은지', class: '1반', grade: 1 },
    { name: '노승우', class: '1반', grade: 1 },
  ];

  const studentIds: number[] = [];
  students.forEach(student => {
    // username을 이름으로 설정 (중복 시 숫자 추가)
    let username = student.name;
    let counter = 2;
    let existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;

    // 중복된 username이 있으면 숫자를 붙임
    while (existing) {
      const existingUser = db.prepare('SELECT name FROM users WHERE id = ?').get(existing.id) as { name: string } | undefined;
      // 같은 이름의 사용자인 경우에만 숫자를 붙임
      if (existingUser && existingUser.name === student.name) {
        username = `${student.name}${counter}`;
        counter++;
        existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;
      } else {
        // 같은 username이지만 다른 이름인 경우 업데이트
        db.prepare(`
          UPDATE users SET name = ?, class_name = ?, grade = ? WHERE id = ?
        `).run(student.name, student.class, student.grade, existing.id);
        console.log(`Updated student: ${student.name} (${username}) to ${student.class}`);
        studentIds.push(existing.id);
        return;
      }
    }

    // 새로운 학생 생성
    const result = db.prepare(`
      INSERT INTO users (username, password, role, name, class_name, grade)
      VALUES (?, ?, 'student', ?, ?, ?)
    `).run(username, password, student.name, student.class, student.grade);
    studentIds.push(Number(result.lastInsertRowid));
    console.log(`Created student: ${student.name} (${username})`);
  });

  // 학부모 계정 (10명 - 각각 2명의 자녀)
  const parents = [
    { username: 'parent1', name: '김부모', email: 'parent1@email.com', children: [0, 1] },
    { username: 'parent2', name: '이부모', email: 'parent2@email.com', children: [2, 3] },
    { username: 'parent3', name: '박부모', email: 'parent3@email.com', children: [4, 5] },
    { username: 'parent4', name: '최부모', email: 'parent4@email.com', children: [6, 7] },
    { username: 'parent5', name: '정부모', email: 'parent5@email.com', children: [8, 9] },
    { username: 'parent6', name: '한부모', email: 'parent6@email.com', children: [10, 11] },
    { username: 'parent7', name: '신부모', email: 'parent7@email.com', children: [12, 13] },
    { username: 'parent8', name: '오부모', email: 'parent8@email.com', children: [14, 15] },
    { username: 'parent9', name: '송부모', email: 'parent9@email.com', children: [16, 17] },
    { username: 'parent10', name: '배부모', email: 'parent10@email.com', children: [18, 19] },
  ];

  parents.forEach(parent => {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(parent.username) as { id: number } | undefined;

    let parentId;
    if (existing) {
      parentId = existing.id;
    } else {
      const result = db.prepare(`
        INSERT INTO users (username, password, role, name, email)
        VALUES (?, ?, 'parent', ?, ?)
      `).run(parent.username, password, parent.name, parent.email);
      parentId = result.lastInsertRowid;
      console.log(`Created parent: ${parent.name} (${parent.username})`);
    }

    // 부모-자녀 관계 설정 (중복 체크)
    parent.children.forEach(childIndex => {
      const relationExists = db.prepare(
        'SELECT id FROM parent_student_relations WHERE parent_id = ? AND student_id = ?'
      ).get(parentId, studentIds[childIndex]);

      if (!relationExists) {
        db.prepare(`
          INSERT INTO parent_student_relations (parent_id, student_id)
          VALUES (?, ?)
        `).run(parentId, studentIds[childIndex]);
      }
    });
  });

  // 샘플 운동 기록 (최근 7일)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    studentIds.forEach(studentId => {
      // 이미 해당 날짜의 기록이 있는지 확인
      const existingRecord = db.prepare(
        'SELECT id FROM exercise_records WHERE student_id = ? AND date = ?'
      ).get(studentId, dateStr);

      if (!existingRecord) {
        const steps = 5000 + Math.floor(Math.random() * 10000);
        const minutes = 30 + Math.floor(Math.random() * 60);
        const calories = 200 + Math.floor(Math.random() * 300);
        const distance = 2 + Math.random() * 5;

        db.prepare(`
          INSERT INTO exercise_records (student_id, date, steps, exercise_minutes, calories, distance)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(studentId, dateStr, steps, minutes, calories, distance.toFixed(2));
      }
    });
  }

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
  console.log('학부모 - username: parent1~10, password: 1234');
}
