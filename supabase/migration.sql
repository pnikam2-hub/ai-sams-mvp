-- ============================================
-- AI-SAMS MVP - Complete Database Migration
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  training_centre_id UUID,
  status VARCHAR(20) DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRAINING CENTRES
CREATE TABLE IF NOT EXISTS training_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  nsqf_level INTEGER,
  duration_hours INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BATCHES
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  course_id UUID REFERENCES courses(id),
  training_centre_id UUID REFERENCES training_centres(id),
  assessor_id UUID REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  assessment_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'upcoming',
  max_candidates INTEGER DEFAULT 50,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CANDIDATES
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  education VARCHAR(255),
  training_centre_id UUID REFERENCES training_centres(id),
  status VARCHAR(20) DEFAULT 'registered',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BATCH CANDIDATES
CREATE TABLE IF NOT EXISTS batch_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES batches(id),
  candidate_id UUID REFERENCES candidates(id),
  enrollment_date DATE,
  status VARCHAR(20) DEFAULT 'enrolled'
);

-- 8. NSQF LEVELS
CREATE TABLE IF NOT EXISTS nsqf_levels (
  id INTEGER PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT
);

-- 9. COMPETENCIES
CREATE TABLE IF NOT EXISTS competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nsqf_level_id INTEGER REFERENCES nsqf_levels(id),
  code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'core',
  learning_outcomes JSONB DEFAULT '[]'::jsonb,
  knowledge_elements JSONB DEFAULT '[]'::jsonb,
  skill_elements JSONB DEFAULT '[]'::jsonb
);

-- 10. COURSE COMPETENCIES
CREATE TABLE IF NOT EXISTS course_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  competency_id UUID REFERENCES competencies(id),
  weight_percentage DECIMAL(5,2)
);

-- 11. QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id),
  competency_id UUID REFERENCES competencies(id),
  question_type VARCHAR(20) NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  marks INTEGER DEFAULT 1,
  rubric_id UUID,
  difficulty VARCHAR(20) DEFAULT 'medium',
  bloom_level VARCHAR(20) DEFAULT 'understand',
  time_limit_minutes INTEGER,
  practical_instructions TEXT,
  expected_deliverables TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. RUBRICS
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  criteria JSONB DEFAULT '[]'::jsonb,
  max_total_score INTEGER,
  description TEXT
);

-- 13. ASSESSMENTS
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  course_id UUID REFERENCES courses(id),
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  pass_percentage INTEGER DEFAULT 70,
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ASSESSMENT QUESTIONS
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id),
  question_id UUID REFERENCES questions(id),
  display_order INTEGER,
  section VARCHAR(20) DEFAULT 'mcq'
);

-- 15. CANDIDATE ATTEMPTS
CREATE TABLE IF NOT EXISTS candidate_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id),
  candidate_id UUID REFERENCES candidates(id),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'in_progress',
  time_spent_seconds INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. CANDIDATE ANSWERS
CREATE TABLE IF NOT EXISTS candidate_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES candidate_attempts(id),
  question_id UUID REFERENCES questions(id),
  answer_text TEXT,
  marks_awarded INTEGER,
  scored_by UUID REFERENCES users(id),
  scored_at TIMESTAMPTZ,
  assessor_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. PRACTICAL SUBMISSIONS
CREATE TABLE IF NOT EXISTS practical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES candidate_attempts(id),
  question_id UUID REFERENCES questions(id),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. AI SCORE SUGGESTIONS
CREATE TABLE IF NOT EXISTS ai_score_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES candidate_answers(id),
  model VARCHAR(50),
  suggested_score INTEGER,
  max_score INTEGER,
  confidence DECIMAL(3,2),
  explanation TEXT,
  rubric_feedback JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. ASSESSOR SCORES
CREATE TABLE IF NOT EXISTS assessor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES candidate_attempts(id),
  answer_id UUID REFERENCES candidate_answers(id),
  ai_suggestion_id UUID REFERENCES ai_score_suggestions(id),
  assessor_id UUID REFERENCES users(id),
  final_score INTEGER,
  max_score INTEGER,
  viva_remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. FINAL RESULTS
CREATE TABLE IF NOT EXISTS final_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES candidate_attempts(id),
  candidate_id UUID REFERENCES candidates(id),
  assessment_id UUID REFERENCES assessments(id),
  mcq_score INTEGER DEFAULT 0,
  mcq_max INTEGER DEFAULT 0,
  scenario_score INTEGER DEFAULT 0,
  scenario_max INTEGER DEFAULT 0,
  practical_score INTEGER DEFAULT 0,
  practical_max INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_max INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  grade VARCHAR(5) DEFAULT 'F',
  status VARCHAR(20) DEFAULT 'pending',
  assessor_id UUID REFERENCES users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100),
  record_id UUID,
  action VARCHAR(20),
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45)
);
