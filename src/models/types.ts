export interface User {
  id: number;
  username: string;
  password: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  name: string;
  class_name?: string;
  grade?: number;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface ExerciseRecord {
  id: number;
  student_id: number;
  date: string;
  steps: number;
  exercise_minutes: number;
  calories: number;
  distance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParentStudentRelation {
  id: number;
  parent_id: number;
  student_id: number;
  relation_type: string;
  created_at: string;
}

export interface ExerciseGoal {
  id: number;
  student_id: number;
  goal_type: 'daily' | 'weekly' | 'monthly';
  steps_goal?: number;
  exercise_minutes_goal?: number;
  calories_goal?: number;
  distance_goal?: number;
  start_date: string;
  end_date?: string;
  created_at: string;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  created_at: string;
}

export interface StudentBadge {
  id: number;
  student_id: number;
  badge_id: number;
  earned_at: string;
  progress: number;
}
