import db from './database';
import { ExerciseRecord } from '../models/types';

// 뱃지 획득 체크 및 부여
export function checkAndAwardBadges(studentId: number) {
  const badges = db.prepare('SELECT * FROM badges').all() as any[];

  badges.forEach(badge => {
    // 이미 획득한 뱃지는 스킵
    const existing = db.prepare(
      'SELECT id FROM student_badges WHERE student_id = ? AND badge_id = ?'
    ).get(studentId, badge.id);

    if (existing) return;

    // 뱃지 조건 체크
    const earned = checkBadgeCondition(studentId, badge.code);

    if (earned) {
      try {
        db.prepare(`
          INSERT INTO student_badges (student_id, badge_id, earned_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(studentId, badge.id);
        console.log(`Badge ${badge.name} awarded to student ${studentId}`);
      } catch (error) {
        console.error(`Error awarding badge ${badge.code}:`, error);
      }
    }
  });
}

function checkBadgeCondition(studentId: number, badgeCode: string): boolean {
  switch (badgeCode) {
    case 'FIRST_STEP':
      return checkFirstStep(studentId);

    case 'STREAK_3':
      return checkStreak(studentId, 3);

    case 'STREAK_7':
      return checkStreak(studentId, 7);

    case 'PERFECT_WEEK':
      return checkPerfectWeek(studentId);

    case 'STREAK_30':
      return checkStreak(studentId, 30);

    case 'STEPS_10K':
      return checkStepsOnce(studentId, 10000);

    case 'STEPS_10K_X10':
      return checkStepsTimes(studentId, 10000, 10);

    case 'STEPS_20K':
      return checkStepsOnce(studentId, 20000);

    case 'EXERCISE_120':
      return checkExerciseMinutesOnce(studentId, 120);

    case 'EXERCISE_180':
      return checkExerciseMinutesOnce(studentId, 180);

    case 'TOTAL_100_DAYS':
      return checkTotalDays(studentId, 100);

    case 'CALORIES_1000':
      return checkCaloriesOnce(studentId, 1000);

    case 'CALORIES_1500':
      return checkCaloriesOnce(studentId, 1500);

    case 'DISTANCE_5K':
      return checkDistanceOnce(studentId, 5);

    case 'DISTANCE_10K':
      return checkDistanceOnce(studentId, 10);

    case 'DISTANCE_15K':
      return checkDistanceOnce(studentId, 15);

    case 'MARATHON':
      return checkTotalDistance(studentId, 42.195);

    case 'TOTAL_1000K_STEPS':
      return checkTotalSteps(studentId, 1000000);

    default:
      return false;
  }
}

// 첫 운동 기록
function checkFirstStep(studentId: number): boolean {
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM exercise_records WHERE student_id = ?'
  ).get(studentId) as { count: number };
  return count.count >= 1;
}

// 연속 운동 일수 체크
function checkStreak(studentId: number, days: number): boolean {
  const records = db.prepare(`
    SELECT date FROM exercise_records
    WHERE student_id = ?
    ORDER BY date DESC
  `).all(studentId) as { date: string }[];

  if (records.length < days) return false;

  let streak = 1;
  for (let i = 0; i < records.length - 1; i++) {
    const current = new Date(records[i].date);
    const next = new Date(records[i + 1].date);
    const diffDays = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
      if (streak >= days) return true;
    } else {
      break;
    }
  }

  return false;
}

// 완벽한 주 체크 (최근 7일 모두 운동)
function checkPerfectWeek(studentId: number): boolean {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const count = db.prepare(`
    SELECT COUNT(*) as count FROM exercise_records
    WHERE student_id = ? AND date >= ? AND date <= ?
  `).get(
    studentId,
    sevenDaysAgo.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  ) as { count: number };

  return count.count >= 7;
}

// 하루 걸음수 달성 (한 번이라도)
function checkStepsOnce(studentId: number, steps: number): boolean {
  const record = db.prepare(
    'SELECT id FROM exercise_records WHERE student_id = ? AND steps >= ? LIMIT 1'
  ).get(studentId, steps);
  return !!record;
}

// 걸음수 N회 달성
function checkStepsTimes(studentId: number, steps: number, times: number): boolean {
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM exercise_records WHERE student_id = ? AND steps >= ?'
  ).get(studentId, steps) as { count: number };
  return count.count >= times;
}

// 하루 운동 시간 달성
function checkExerciseMinutesOnce(studentId: number, minutes: number): boolean {
  const record = db.prepare(
    'SELECT id FROM exercise_records WHERE student_id = ? AND exercise_minutes >= ? LIMIT 1'
  ).get(studentId, minutes);
  return !!record;
}

// 총 운동 일수
function checkTotalDays(studentId: number, days: number): boolean {
  const count = db.prepare(
    'SELECT COUNT(*) as count FROM exercise_records WHERE student_id = ?'
  ).get(studentId) as { count: number };
  return count.count >= days;
}

// 하루 칼로리 소모
function checkCaloriesOnce(studentId: number, calories: number): boolean {
  const record = db.prepare(
    'SELECT id FROM exercise_records WHERE student_id = ? AND calories >= ? LIMIT 1'
  ).get(studentId, calories);
  return !!record;
}

// 하루 거리 달성
function checkDistanceOnce(studentId: number, distance: number): boolean {
  const record = db.prepare(
    'SELECT id FROM exercise_records WHERE student_id = ? AND distance >= ? LIMIT 1'
  ).get(studentId, distance);
  return !!record;
}

// 누적 거리
function checkTotalDistance(studentId: number, distance: number): boolean {
  const total = db.prepare(
    'SELECT SUM(distance) as total FROM exercise_records WHERE student_id = ?'
  ).get(studentId) as { total: number | null };
  return (total.total || 0) >= distance;
}

// 누적 걸음수
function checkTotalSteps(studentId: number, steps: number): boolean {
  const total = db.prepare(
    'SELECT SUM(steps) as total FROM exercise_records WHERE student_id = ?'
  ).get(studentId) as { total: number | null };
  return (total.total || 0) >= steps;
}
