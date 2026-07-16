// AI-SAMS MVP Types

export type RoleName = 'super_admin' | 'tc_admin' | 'assessor' | 'candidate';

export interface Role {
  id: string;
  name: RoleName;
  description: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role?: Role;
  training_centre_id?: string | null;
  status: 'active' | 'inactive';
  last_login?: string;
  created_at: string;
}

export interface TrainingCentre {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  contact_email?: string;
  contact_phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  nsqf_level: number;
  duration_hours?: number;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  competencies?: CourseCompetency[];
}

export interface Batch {
  id: string;
  name: string;
  course_id: string;
  course?: Course;
  training_centre_id: string;
  training_centre?: TrainingCentre;
  assessor_id?: string;
  assessor?: User;
  start_date?: string;
  end_date?: string;
  assessment_date?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  max_candidates: number;
  created_by: string;
  created_at: string;
  candidate_count?: number;
}

export interface Candidate {
  id: string;
  user_id?: string | null;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  education?: string;
  training_centre_id?: string;
  status: 'registered' | 'active' | 'completed' | 'dropped';
  consent_given: boolean;
  consent_date?: string;
  created_at: string;
}

export interface BatchCandidate {
  id: string;
  batch_id: string;
  candidate_id: string;
  candidate?: Candidate;
  enrollment_date?: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'withdrawn';
}

export interface NSQFLevel {
  id: number;
  title: string;
  description?: string;
}

export interface Competency {
  id: string;
  nsqf_level_id: number;
  nsqf_level?: NSQFLevel;
  code: string;
  title: string;
  description?: string;
  type: 'core' | 'non_core';
  learning_outcomes: string[];
  knowledge_elements: string[];
  skill_elements: string[];
}

export interface CourseCompetency {
  id: string;
  course_id: string;
  competency_id: string;
  competency?: Competency;
  weight_percentage: number;
}

export type QuestionType = 'mcq' | 'scenario' | 'practical';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface Question {
  id: string;
  course_id: string;
  course?: Course;
  competency_id: string;
  competency?: Competency;
  question_type: QuestionType;
  question_text: string;
  options?: McqOption[];
  correct_answer?: string;
  marks: number;
  rubric_id?: string;
  rubric?: Rubric;
  difficulty: Difficulty;
  bloom_level: BloomLevel;
  time_limit_minutes?: number;
  practical_instructions?: string;
  expected_deliverables?: string;
  status: 'draft' | 'active' | 'archived';
  created_by: string;
  created_at: string;
}

export interface McqOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Rubric {
  id: string;
  title: string;
  criteria: RubricCriterion[];
  max_total_score: number;
  description?: string;
}

export interface RubricCriterion {
  criterion: string;
  max_score: number;
  description: string;
}

export interface Assessment {
  id: string;
  title: string;
  batch_id: string;
  batch?: Batch;
  course_id: string;
  course?: Course;
  description?: string;
  duration_minutes: number;
  pass_percentage: number;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  scheduled_at?: string;
  created_by: string;
  created_at: string;
  question_count?: number;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_id: string;
  question?: Question;
  display_order: number;
  section: 'mcq' | 'scenario' | 'practical';
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'scoring' | 'reviewed' | 'finalized';

export interface CandidateAttempt {
  id: string;
  assessment_id: string;
  assessment?: Assessment;
  candidate_id: string;
  candidate?: Candidate;
  started_at?: string;
  submitted_at?: string;
  status: AttemptStatus;
  time_spent_seconds?: number;
  ip_address?: string;
  created_at: string;
}

export interface CandidateAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  question?: Question;
  answer_text: string;
  marks_awarded?: number;
  scored_by?: string;
  scored_at?: string;
  assessor_remarks?: string;
  created_at: string;
}

export interface PracticalSubmission {
  id: string;
  attempt_id: string;
  question_id: string;
  question?: Question;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  description?: string;
  uploaded_at: string;
}

export interface AIScoreSuggestion {
  id: string;
  answer_id: string;
  model: string;
  suggested_score: number;
  max_score: number;
  confidence: number;
  explanation: string;
  rubric_feedback: AIRubricFeedback[];
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  created_at: string;
}

export interface AIRubricFeedback {
  criterion: string;
  score: number;
  feedback: string;
}

export interface AssessorScore {
  id: string;
  attempt_id: string;
  answer_id: string;
  ai_suggestion_id?: string;
  ai_suggestion?: AIScoreSuggestion;
  assessor_id: string;
  assessor?: User;
  final_score: number;
  max_score: number;
  viva_remarks?: string;
  status: 'draft' | 'approved' | 'rejected' | 'reassess';
  assessed_at?: string;
  created_at: string;
}

export interface FinalResult {
  id: string;
  attempt_id: string;
  candidate_id: string;
  candidate?: Candidate;
  assessment_id: string;
  assessment?: Assessment;
  mcq_score: number;
  mcq_max: number;
  scenario_score: number;
  scenario_max: number;
  practical_score: number;
  practical_max: number;
  total_score: number;
  total_max: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'pass' | 'fail' | 'pending';
  assessor_id: string;
  finalized_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete' | 'score' | 'approve';
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by: string;
  performed_by_user?: User;
  performed_at: string;
  ip_address?: string;
}

// Dashboard KPI types
export interface DashboardKPI {
  total_candidates: number;
  total_batches: number;
  total_assessments: number;
  pending_reviews: number;
  completed_assessments: number;
  pass_rate: number;
}

// Assessment taking state
export interface AssessmentState {
  attempt: CandidateAttempt;
  questions: AssessmentQuestion[];
  answers: Record<string, string>; // question_id -> answer_text
  currentQuestionIndex: number;
  timeRemaining: number;
  isSubmitted: boolean;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}
