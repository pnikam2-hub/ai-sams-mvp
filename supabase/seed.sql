-- AI-SAMS MVP Seed Data
-- Run this in Supabase SQL Editor after creating tables

-- ============================================
-- 1. ROLES
-- ============================================
INSERT INTO roles (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'super_admin', 'Full system access'),
  ('550e8400-e29b-41d4-a716-446655440001', 'tc_admin', 'Training centre management'),
  ('550e8400-e29b-41d4-a716-446655440002', 'assessor', 'Score review and approval'),
  ('550e8400-e29b-41d4-a716-446655440003', 'candidate', 'Assessment participant');

-- ============================================
-- 2. NSQF LEVELS
-- ============================================
INSERT INTO nsqf_levels (id, title, description) VALUES
  (1, 'Helper', 'Perform basic routine tasks under direct supervision'),
  (2, 'Assistant', 'Perform limited skill tasks under supervision'),
  (3, 'Associate', 'Perform semi-skilled tasks with some independence'),
  (4, 'Technician', 'Perform skilled tasks independently'),
  (5, 'Professional', 'Perform independent professional work'),
  (6, 'Professional', 'Perform complex professional work'),
  (7, 'Professional', 'Perform highly complex professional work'),
  (8, 'Professional', 'Perform expert professional work'),
  (9, 'Professional', 'Perform advanced expert work'),
  (10, 'Professional', 'Master/Strategic leadership level');

-- ============================================
-- 3. TRAINING CENTRE
-- ============================================
INSERT INTO training_centres (id, name, address, city, state, contact_email, contact_phone, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440100', 'AI Skills Training Centre - Bangalore',
   '123 Tech Park Road, Electronic City Phase 1', 'Bangalore', 'Karnataka',
   'admin@aiskills-blr.in', '+91-80-1234-5678', 'active');

-- ============================================
-- 4. COURSES
-- ============================================
INSERT INTO courses (id, title, description, nsqf_level, duration_hours, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440200', 'AI Foundation / Generative AI',
   'Foundation course covering AI basics, generative AI concepts, prompt engineering, responsible AI usage, and hands-on projects with LLMs.',
   5, 120, 'active');

-- ============================================
-- 5. COMPETENCIES
-- ============================================
INSERT INTO competencies (id, nsqf_level_id, code, title, description, type, learning_outcomes, knowledge_elements, skill_elements) VALUES
  ('550e8400-e29b-41d4-a716-446655440300', 5, 'AI-FUND-001', 'AI Fundamentals',
   'Understanding basic AI concepts, types of AI, machine learning vs deep learning, and real-world applications.',
   'core',
   '["Explain key AI concepts and terminology", "Differentiate between types of AI systems", "Describe real-world AI applications"]',
   '["Types of AI: Narrow, General, Super", "ML vs DL vs RL", "AI history and evolution", "Key terminology: model, training, inference, epoch, loss"]',
   '["Classify AI systems by capability", "Compare ML and DL approaches", "Identify AI use cases in different industries"]'),

  ('550e8400-e29b-41d4-a716-446655440301', 5, 'AI-FUND-002', 'Generative AI & LLMs',
   'Understanding generative AI models, large language models, transformers, and text/image generation.',
   'core',
   '["Explain how generative AI works", "Describe transformer architecture", "Apply prompt engineering techniques", "Compare different LLM capabilities"]',
   '["Transformer architecture: attention mechanism", "Tokenization and embeddings", "Training vs fine-tuning vs inference", "Prompt engineering patterns"]',
   '["Write effective prompts for different tasks", "Use LLM APIs for text generation", "Evaluate LLM outputs for quality and bias"]'),

  ('550e8400-e29b-41d4-a716-446655440302', 5, 'AI-FUND-003', 'Prompt Engineering',
   'Designing, testing, and optimizing prompts for effective and safe AI interactions.',
   'core',
   '["Write clear and specific prompts", "Apply advanced prompting techniques", "Chain prompts for complex tasks", "Evaluate prompt effectiveness"]',
   '["Zero-shot, few-shot, chain-of-thought prompting", "System prompts vs user prompts", "Temperature and token controls", "Common prompt anti-patterns"]',
   '["Create few-shot examples", "Build chain-of-thought prompts", "Design system prompt templates", "Test and iterate prompts"]'),

  ('550e8400-e29b-41d4-a716-446655440303', 5, 'AI-FUND-004', 'Responsible AI & Ethics',
   'Understanding AI bias, fairness, safety, privacy, and regulatory considerations.',
   'core',
   '["Identify sources of AI bias", "Describe fairness metrics in AI", "Explain data privacy in AI systems", "Apply responsible AI principles"]',
   '["Bias types: selection, confirmation, algorithmic", "Fairness definitions: demographic parity, equalized odds", "GDPR/DPDP implications for AI", "AI safety: hallucination, jailbreaking"]',
   '["Audit AI outputs for bias", "Design privacy-preserving AI workflows", "Document AI system limitations", "Implement human-in-the-loop safeguards"]'),

  ('550e8400-e29b-41d4-a716-446655440304', 5, 'AI-FUND-005', 'AI Tools & Applications',
   'Practical usage of AI tools for productivity, coding, content creation, and business applications.',
   'non_core',
   '["Use AI coding assistants effectively", "Apply AI for content creation", "Integrate AI into workflows", "Evaluate AI tool suitability"]',
   '["AI coding tools: GitHub Copilot, CodeT5", "AI content tools: image, video, audio generation", "AI productivity tools", "API integration patterns"]',
   '["Use AI for code generation and debugging", "Generate and edit images with AI", "Build simple AI-powered applications", "Evaluate tool ROI"]');

-- ============================================
-- 6. COURSE COMPETENCY MAPPING
-- ============================================
INSERT INTO course_competencies (id, course_id, competency_id, weight_percentage) VALUES
  ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440300', 20),
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440301', 25),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440302', 20),
  ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440303', 20),
  ('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440304', 15);

-- ============================================
-- 7. RUBRICS
-- ============================================
INSERT INTO rubrics (id, title, criteria, max_total_score, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440500', 'MCQ Default Rubric',
   '[{"criterion": "Correct Answer", "max_score": 1, "description": "Selected the correct option"}]',
   1, 'Default rubric for multiple choice questions'),

  ('550e8400-e29b-41d4-a716-446655440501', 'Scenario Answer Rubric',
   '[{"criterion": "Understanding of Concept", "max_score": 3, "description": "Demonstrates clear understanding of the AI concept"},
     {"criterion": "Practical Application", "max_score": 3, "description": "Applies knowledge to realistic scenarios"},
     {"criterion": "Completeness & Depth", "max_score": 2, "description": "Answer is thorough and covers key aspects"},
     {"criterion": "Clarity & Structure", "max_score": 2, "description": "Answer is well-organized and easy to follow"}]',
   10, 'Rubric for evaluating scenario-based answers'),

  ('550e8400-e29b-41d4-a716-446655440502', 'Practical Task Rubric',
   '[{"criterion": "Task Completion", "max_score": 4, "description": "All requirements of the task are completed"},
     {"criterion": "Technical Quality", "max_score": 3, "description": "Output demonstrates good technical understanding"},
     {"criterion": "Creativity & Innovation", "max_score": 2, "description": "Shows creative or innovative approach"},
     {"criterion": "Documentation", "max_score": 1, "description": "Clear explanation of approach and results"}]',
   10, 'Rubric for evaluating practical AI task submissions');

-- ============================================
-- 8. QUESTIONS - MCQ
-- ============================================
INSERT INTO questions (id, course_id, competency_id, question_type, question_text, options, correct_answer, marks, rubric_id, difficulty, bloom_level, status, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440300', 'mcq',
   'What is the primary difference between supervised and unsupervised learning?',
   '[{"id": "a", "text": "Supervised learning uses labeled training data; unsupervised learning finds patterns in unlabeled data", "is_correct": true},
     {"id": "b", "text": "Supervised learning is always faster than unsupervised learning", "is_correct": false},
     {"id": "c", "text": "Supervised learning requires more data than unsupervised learning", "is_correct": false},
     {"id": "d", "text": "There is no practical difference between them", "is_correct": false}]',
   'a', 1, '550e8400-e29b-41d4-a716-446655440500', 'easy', 'understand', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440301', 'mcq',
   'Which of the following is a generative AI model?',
   '[{"id": "a", "text": "Linear Regression", "is_correct": false},
     {"id": "b", "text": "GPT-4", "is_correct": true},
     {"id": "c", "text": "Decision Tree", "is_correct": false},
     {"id": "d", "text": "K-Means Clustering", "is_correct": false}]',
   'b', 1, '550e8400-e29b-41d4-a716-446655440500', 'easy', 'remember', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440302', 'mcq',
   'What does "few-shot prompting" mean in the context of LLMs?',
   '[{"id": "a", "text": "Running the model multiple times and averaging results", "is_correct": false},
     {"id": "b", "text": "Providing a few examples in the prompt to guide the model response", "is_correct": true},
     {"id": "c", "text": "Training the model with a small dataset", "is_correct": false},
     {"id": "d", "text": "Using a model with fewer parameters", "is_correct": false}]',
   'b', 1, '550e8400-e29b-41d4-a716-446655440500', 'medium', 'understand', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440303', 'mcq',
   'Which of the following is a common source of bias in AI systems?',
   '[{"id": "a", "text": "Using too much training data", "is_correct": false},
     {"id": "b", "text": "Selection bias in training data collection", "is_correct": true},
     {"id": "c", "text": "Running models on powerful GPUs", "is_correct": false},
     {"id": "d", "text": "Using open-source frameworks", "is_correct": false}]',
   'b', 1, '550e8400-e29b-41d4-a716-446655440500', 'easy', 'understand', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440300', 'mcq',
   'What is the key innovation of the Transformer architecture?',
   '[{"id": "a", "text": "It uses convolutional layers for text processing", "is_correct": false},
     {"id": "b", "text": "It relies solely on recurrent neural networks", "is_correct": false},
     {"id": "c", "text": "The self-attention mechanism that captures relationships between all tokens", "is_correct": true},
     {"id": "d", "text": "It requires less computational power than RNNs", "is_correct": false}]',
   'c', 1, '550e8400-e29b-41d4-a716-446655440500', 'medium', 'understand', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440605', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440301', 'mcq',
   'In prompt engineering, what does "chain-of-thought" prompting involve?',
   '[{"id": "a", "text": "Connecting multiple LLMs in a pipeline", "is_correct": false},
     {"id": "b", "text": "Prompting the model to show its step-by-step reasoning", "is_correct": true},
     {"id": "c", "text": "Sending the same prompt repeatedly", "is_correct": false},
     {"id": "d", "text": "Using a sequence of unrelated prompts", "is_correct": false}]',
   'b', 1, '550e8400-e29b-41d4-a716-446655440500', 'medium', 'apply', 'active', '550e8400-e29b-41d4-a716-446655440000');

-- ============================================
-- 9. QUESTIONS - SCENARIO
-- ============================================
INSERT INTO questions (id, course_id, competency_id, question_type, question_text, correct_answer, marks, rubric_id, difficulty, bloom_level, status, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440700', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440302', 'scenario',
   'You are building a customer support chatbot using a Large Language Model. The chatbot sometimes gives incorrect information about product return policies. Describe how you would use prompt engineering techniques to improve the accuracy and reliability of the chatbot responses. Include specific prompt strategies and explain why they would help.',
   'Key points: 1) Use system prompts to set role and constraints, 2) Include retrieval-augmented generation (RAG) with policy documents, 3) Use few-shot examples of correct responses, 4) Add chain-of-thought reasoning, 5) Include guardrails and fallback responses, 6) Test and iterate prompts, 7) Human-in-the-loop for edge cases',
   10, '550e8400-e29b-41d4-a716-446655440501', 'medium', 'apply', 'active', '550e8400-e29b-41d4-a716-446655440000'),

  ('550e8400-e29b-41d4-a716-446655440701', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440303', 'scenario',
   'A company wants to deploy an AI-powered resume screening tool. Discuss the potential ethical concerns and biases that could arise. What steps should the company take to ensure fairness, transparency, and compliance with data protection regulations?',
   'Key points: 1) Historical bias in training data, 2) Demographic parity concerns, 3) Transparency and explainability requirements, 4) DPDP/GDPR compliance for personal data, 5) Human oversight and appeal process, 6) Regular bias audits, 7) Diverse training data, 8) Clear communication to candidates',
   10, '550e8400-e29b-41d4-a716-446655440501', 'hard', 'evaluate', 'active', '550e8400-e29b-41d4-a716-446655440000');

-- ============================================
-- 10. QUESTIONS - PRACTICAL
-- ============================================
INSERT INTO questions (id, course_id, competency_id, question_type, question_text, practical_instructions, expected_deliverables, marks, rubric_id, difficulty, bloom_level, time_limit_minutes, status, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440800', '550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440302', 'practical',
   'Build a Prompt Engineering Toolkit',
   'Create a practical prompt engineering toolkit for a specific use case (e.g., content creation, coding assistance, data analysis, or customer support). Your toolkit should include: (1) A system prompt template that defines the AI role and constraints, (2) At least 3 example prompts using different techniques (zero-shot, few-shot, chain-of-thought), (3) A comparison showing how different prompting techniques affect output quality for the same task, (4) Documentation explaining your design choices.',
   'Upload a single PDF or ZIP file containing: 1) System prompt template (text file or PDF page), 2) Three example prompts with outputs, 3) Comparison analysis with screenshots, 4) Design documentation (1-2 pages)',
   10, '550e8400-e29b-41d4-a716-446655440502', 'medium', 'create', 60, 'active', '550e8400-e29b-41d4-a716-446655440000');

-- ============================================
-- 11. BATCH
-- ============================================
INSERT INTO batches (id, name, course_id, training_centre_id, assessor_id, start_date, end_date, status, max_candidates, created_by) VALUES
  ('550e8400-e29b-41d4-a716-446655440900', 'AI Foundation - Batch 001 (June 2025)',
   '550e8400-e29b-41d4-a716-446655440200',
   '550e8400-e29b-41d4-a716-446655440100',
   NULL,
   '2025-06-01', '2025-06-30',
   'active', 50,
   '550e8400-e29b-41d4-a716-446655440000');

-- ============================================
-- 12. SAMPLE CANDIDATES (5)
-- ============================================
INSERT INTO candidates (id, full_name, email, phone, date_of_birth, gender, education, training_centre_id, status, consent_given) VALUES
  ('550e8400-e29b-41d4-a716-446655441000', 'Priya Sharma', 'priya.sharma@email.in', '+91-98765-43210', '1998-03-15', 'female', 'B.Tech Computer Science', '550e8400-e29b-41d4-a716-446655440100', 'registered', false),
  ('550e8400-e29b-41d4-a716-446655441001', 'Rahul Kumar', 'rahul.kumar@email.in', '+91-98765-43211', '1997-07-22', 'male', 'BCA', '550e8400-e29b-41d4-a716-446655440100', 'registered', false),
  ('550e8400-e29b-41d4-a716-446655441002', 'Ananya Patel', 'ananya.patel@email.in', '+91-98765-43212', '1999-01-10', 'female', 'B.Tech IT', '550e8400-e29b-41d4-a716-446655440100', 'registered', false),
  ('550e8400-e29b-41d4-a716-446655441003', 'Vikram Reddy', 'vikram.reddy@email.in', '+91-98765-43213', '1996-11-05', 'male', 'M.Sc Data Science', '550e8400-e29b-41d4-a716-446655440100', 'registered', false),
  ('550e8400-e29b-41d4-a716-446655441004', 'Sneha Gupta', 'sneha.gupta@email.in', '+91-98765-43214', '1998-05-28', 'female', 'B.Tech AI & ML', '550e8400-e29b-41d4-a716-446655440100', 'registered', false);

-- Link candidates to batch
INSERT INTO batch_candidates (id, batch_id, candidate_id, enrollment_date, status) VALUES
  ('550e8400-e29b-41d4-a716-446655442000', '550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655441000', '2025-06-01', 'enrolled'),
  ('550e8400-e29b-41d4-a716-446655442001', '550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655441001', '2025-06-01', 'enrolled'),
  ('550e8400-e29b-41d4-a716-446655442002', '550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655441002', '2025-06-01', 'enrolled'),
  ('550e8400-e29b-41d4-a716-446655442003', '550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655441003', '2025-06-01', 'enrolled'),
  ('550e8400-e29b-41d4-a716-446655442004', '550e8400-e29b-41d4-a716-446655440900', '550e8400-e29b-41d4-a716-446655441004', '2025-06-01', 'enrolled');
