import { Response } from 'express';
import db from '../utils/database';
import { AuthRequest } from '../middleware/auth';

// 종합 리더보드 조회 (최근 7일 기준)
export const getLeaderboard = (req: AuthRequest, res: Response) => {
  try {
    // 최근 7일 날짜 계산
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimit = sevenDaysAgo.toISOString().split('T')[0];

    const leaderboard = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.class_name,
        u.grade,
        COUNT(DISTINCT sb.badge_id) as badge_count,
        COALESCE(SUM(er.steps), 0) as total_steps,
        COALESCE(SUM(er.exercise_minutes), 0) as total_minutes,
        COALESCE(SUM(er.calories), 0) as total_calories,
        COALESCE(SUM(er.distance), 0) as total_distance,
        COUNT(DISTINCT er.date) as exercise_days
      FROM users u
      LEFT JOIN student_badges sb ON u.id = sb.student_id
      LEFT JOIN exercise_records er ON u.id = er.student_id AND er.date >= ?
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY u.id
    `).all(dateLimit) as any[];

    // 점수 계산 (각 항목에 가중치 부여)
    const scoredLeaderboard = leaderboard.map(student => {
      const badgeScore = (student.badge_count || 0) * 100; // 뱃지 1개당 100점
      const stepsScore = Math.floor((student.total_steps || 0) / 1000); // 1000보당 1점
      const minutesScore = (student.total_minutes || 0) * 2; // 1분당 2점
      const caloriesScore = Math.floor((student.total_calories || 0) / 10); // 10칼로리당 1점
      const distanceScore = Math.floor((student.total_distance || 0) * 10); // 1km당 10점
      const daysScore = (student.exercise_days || 0) * 50; // 운동 일수 1일당 50점

      const totalScore = badgeScore + stepsScore + minutesScore + caloriesScore + distanceScore + daysScore;

      return {
        ...student,
        scores: {
          badge: badgeScore,
          steps: stepsScore,
          minutes: minutesScore,
          calories: caloriesScore,
          distance: distanceScore,
          days: daysScore,
          total: totalScore
        }
      };
    });

    // 총점 기준으로 정렬
    scoredLeaderboard.sort((a, b) => b.scores.total - a.scores.total);

    // 순위 추가
    const rankedLeaderboard = scoredLeaderboard.map((student, index) => ({
      rank: index + 1,
      ...student
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: '리더보드 조회 중 오류가 발생했습니다' });
  }
};

// 카테고리별 리더보드 조회 (최근 7일 기준)
export const getCategoryLeaderboard = (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;

    // 최근 7일 날짜 계산
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimit = sevenDaysAgo.toISOString().split('T')[0];

    let query = '';
    let params: any[] = [];

    switch (category) {
      case 'badges':
        // 뱃지는 날짜 제한 없음 (모든 뱃지)
        query = `
          SELECT
            u.id,
            u.name,
            u.class_name,
            COUNT(DISTINCT sb.badge_id) as value
          FROM users u
          LEFT JOIN student_badges sb ON u.id = sb.student_id
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY value DESC
        `;
        break;

      case 'steps':
        query = `
          SELECT
            u.id,
            u.name,
            u.class_name,
            COALESCE(SUM(er.steps), 0) as value
          FROM users u
          LEFT JOIN exercise_records er ON u.id = er.student_id AND er.date >= ?
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY value DESC
        `;
        params = [dateLimit];
        break;

      case 'minutes':
        query = `
          SELECT
            u.id,
            u.name,
            u.class_name,
            COALESCE(SUM(er.exercise_minutes), 0) as value
          FROM users u
          LEFT JOIN exercise_records er ON u.id = er.student_id AND er.date >= ?
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY value DESC
        `;
        params = [dateLimit];
        break;

      case 'calories':
        query = `
          SELECT
            u.id,
            u.name,
            u.class_name,
            COALESCE(SUM(er.calories), 0) as value
          FROM users u
          LEFT JOIN exercise_records er ON u.id = er.student_id AND er.date >= ?
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY value DESC
        `;
        params = [dateLimit];
        break;

      case 'distance':
        query = `
          SELECT
            u.id,
            u.name,
            u.class_name,
            COALESCE(SUM(er.distance), 0) as value
          FROM users u
          LEFT JOIN exercise_records er ON u.id = er.student_id AND er.date >= ?
          WHERE u.role = 'student'
          GROUP BY u.id
          ORDER BY value DESC
        `;
        params = [dateLimit];
        break;

      default:
        return res.status(400).json({ error: '잘못된 카테고리입니다' });
    }

    const results = params.length > 0
      ? db.prepare(query).all(...params) as any[]
      : db.prepare(query).all() as any[];

    // 순위 추가
    const ranked = results.map((student, index) => ({
      rank: index + 1,
      ...student
    }));

    res.json(ranked);
  } catch (error) {
    console.error('Get category leaderboard error:', error);
    res.status(500).json({ error: '리더보드 조회 중 오류가 발생했습니다' });
  }
};
