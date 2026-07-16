// AI-SAMS Data Service - Direct Supabase client calls
import { createClientBrowser } from './supabase';

function getClient() {
  return createClientBrowser();
}

// ============================================
// DASHBOARD
// ============================================
export async function getDashboardKPI() {
  const supabase = getClient();
  const { count: candidates } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
  const { count: batches } = await supabase.from('batches').select('*', { count: 'exact', head: true });
  const { count: assessments } = await supabase.from('assessments').select('*', { count: 'exact', head: true });
  const { count: pending } = await supabase.from('candidate_attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
  const { count: completed } = await supabase.from('candidate_attempts').select('*', { count: 'exact', head: true }).eq('status', 'finalized');
  const { data: results } = await supabase.from('final_results').select('status');
  const passed = results?.filter((r: any) => r.status === 'pass').length || 0;
  const total = results?.length || 0;
  return {
    total_candidates: candidates || 0,
    total_batches: batches || 0,
    total_assessments: assessments || 0,
    pending_reviews: pending || 0,
    completed_assessments: completed || 0,
    pass_rate: total > 0 ? Math.round((passed / total) * 100) : 0,
  };
}

// ============================================
// TRAINING CENTRES
// ============================================
export async function getTrainingCentres() {
  const supabase = getClient();
  const { data, error } = await supabase.from('training_centres').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function createTrainingCentre(centre: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('training_centres').insert(centre).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// COURSES
// ============================================
export async function getCourses() {
  const supabase = getClient();
  const { data, error } = await supabase.from('courses').select('*, competencies:course_competencies(competency:competencies(*))').order('title');
  if (error) throw error;
  return data || [];
}

export async function createCourse(course: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('courses').insert(course).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// BATCHES
// ============================================
export async function getBatches() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('batches')
    .select(`*, course:courses(*), training_centre:training_centres(*), assessor:users(*), candidate_count:batch_candidates(count)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((b: any) => ({ ...b, candidate_count: b.candidate_count?.[0]?.count || 0 }));
}

export async function createBatch(batch: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('batches').insert(batch).select().single();
  if (error) throw error;
  return data;
}

export async function addCandidateToBatch(batchId: string, candidateId: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from('batch_candidates').insert({ batch_id: batchId, candidate_id: candidateId, enrollment_date: new Date().toISOString().split('T')[0], status: 'enrolled' }).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// CANDIDATES
// ============================================
export async function getCandidates() {
  const supabase = getClient();
  const { data, error } = await supabase.from('candidates').select('*').order('full_name');
  if (error) throw error;
  return data || [];
}

export async function createCandidate(candidate: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('candidates').insert(candidate).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// COMPETENCIES
// ============================================
export async function getCompetencies() {
  const supabase = getClient();
  const { data, error } = await supabase.from('competencies').select('*, nsqf_level:nsqf_levels(*)').order('code');
  if (error) throw error;
  return data || [];
}

export async function createCompetency(competency: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('competencies').insert(competency).select().single();
  if (error) throw error;
  return data;
}

export async function getNSQFLevels() {
  const supabase = getClient();
  const { data, error } = await supabase.from('nsqf_levels').select('*').order('id');
  if (error) throw error;
  return data || [];
}

// ============================================
// QUESTIONS
// ============================================
export async function getQuestions(filters?: { type?: string; course_id?: string }) {
  const supabase = getClient();
  let query = supabase.from('questions').select('*, course:courses(*), competency:competencies(*), rubric:rubrics(*)');
  if (filters?.type) query = query.eq('question_type', filters.type);
  if (filters?.course_id) query = query.eq('course_id', filters.course_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createQuestion(question: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('questions').insert(question).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// RUBRICS
// ============================================
export async function getRubrics() {
  const supabase = getClient();
  const { data, error } = await supabase.from('rubrics').select('*').order('title');
  if (error) throw error;
  return data || [];
}

export async function createRubric(rubric: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('rubrics').insert(rubric).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// ASSESSMENTS
// ============================================
export async function getAssessments() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('assessments')
    .select('*, batch:batches(*, course:courses(*)), course:courses(*), question_count:assessment_questions(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((a: any) => ({ ...a, question_count: a.question_count?.[0]?.count || 0 }));
}

export async function createAssessment(assessment: any) {
  const supabase = getClient();
  const { data, error } = await supabase.from('assessments').insert(assessment).select().single();
  if (error) throw error;
  return data;
}

export async function publishAssessment(id: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from('assessments').update({ status: 'active' }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function addQuestionToAssessment(assessmentId: string, questionId: string, displayOrder: number, section: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from('assessment_questions').insert({ assessment_id: assessmentId, question_id: questionId, display_order: displayOrder, section }).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// AUDIT LOGS
// ============================================
export async function getAuditLogs(filters?: { table?: string; action?: string }) {
  const supabase = getClient();
  let query = supabase.from('audit_logs').select('*, performed_by_user:users(*)').order('performed_at', { ascending: false });
  if (filters?.table) query = query.eq('table_name', filters.table);
  if (filters?.action) query = query.eq('action', filters.action);
  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data || [];
}

// ============================================
// CANDIDATE ASSESSMENT
// ============================================
export async function getCandidateDashboard(candidateId: string) {
  const supabase = getClient();
  const { data: batchCandidates } = await supabase.from('batch_candidates').select('batch_id').eq('candidate_id', candidateId);
  const batchIds = batchCandidates?.map((bc: any) => bc.batch_id) || [];
  const { data: assessments } = await supabase.from('assessments').select('*, batch:batches(*, course:courses(*)), course:courses(*)').in('batch_id', batchIds).eq('status', 'active');
  const { data: attempts } = await supabase.from('candidate_attempts').select('*, assessment:assessments(*, course:courses(*)), candidate:candidates(*)').eq('candidate_id', candidateId).order('created_at', { ascending: false });
  return { upcoming: assessments || [], attempts: attempts || [] };
}

export async function getAssessmentWithQuestions(assessmentId: string) {
  const supabase = getClient();
  const { data } = await supabase.from('assessments').select('*, course:courses(*), batch:batches(*), questions:assessment_questions(*, question:questions(*, competency:competencies(*), rubric:rubrics(*)))').eq('id', assessmentId).single();
  return data;
}

export async function startAttempt(assessmentId: string, candidateId: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from('candidate_attempts').insert({ assessment_id: assessmentId, candidate_id: candidateId, started_at: new Date().toISOString(), status: 'in_progress' }).select().single();
  if (error) throw error;
  return data;
}

export async function getAttempt(attemptId: string) {
  const supabase = getClient();
  const { data } = await supabase.from('candidate_attempts').select('*, assessment:assessments(*, questions:assessment_questions(*, question:questions(*, competency:competencies(*), rubric:rubrics(*)))), candidate:candidates(*)').eq('id', attemptId).single();
  return data;
}

export async function saveAnswer(attemptId: string, questionId: string, answerText: string) {
  const supabase = getClient();
  const { data: existing } = await supabase.from('candidate_answers').select('id').eq('attempt_id', attemptId).eq('question_id', questionId).single();
  if (existing) {
    const { data, error } = await supabase.from('candidate_answers').update({ answer_text: answerText }).eq('id', existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('candidate_answers').insert({ attempt_id: attemptId, question_id: questionId, answer_text: answerText }).select().single();
    if (error) throw error;
    return data;
  }
}

export async function getAttemptAnswers(attemptId: string) {
  const supabase = getClient();
  const { data } = await supabase.from('candidate_answers').select('*, question:questions(*)').eq('attempt_id', attemptId);
  return data || [];
}

export async function submitAttempt(attemptId: string) {
  const supabase = getClient();
  const { data, error } = await supabase.from('candidate_attempts').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', attemptId).select().single();
  if (error) throw error;
  return data;
}

export async function uploadPracticalFile(attemptId: string, questionId: string, file: File, description: string) {
  const supabase = getClient();
  const fileName = `${attemptId}/${questionId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('practical-submissions').upload(fileName, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('practical-submissions').getPublicUrl(fileName);
  const { data, error } = await supabase.from('practical_submissions').insert({ attempt_id: attemptId, question_id: questionId, file_url: publicUrl, file_name: file.name, file_size: file.size, mime_type: file.type, description }).select().single();
  if (error) throw error;
  return data;
}

export async function getScorecard(attemptId: string) {
  const supabase = getClient();
  const { data } = await supabase.from('final_results').select('*, candidate:candidates(*), assessment:assessments(*)').eq('attempt_id', attemptId).single();
  return data || null;
}

// ============================================
// ASSESSOR
// ============================================
export async function getAssessorDashboard() {
  const supabase = getClient();
  const { count: pending } = await supabase.from('candidate_attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
  const { count: scoring } = await supabase.from('candidate_attempts').select('*', { count: 'exact', head: true }).eq('status', 'scoring');
  const { count: finalized } = await supabase.from('candidate_attempts').select('*', { count: 'exact', head: true }).eq('status', 'finalized');
  return { pending: pending || 0, scoring: scoring || 0, finalized: finalized || 0 };
}

export async function getSubmissions() {
  const supabase = getClient();
  const { data } = await supabase.from('candidate_attempts').select('*, assessment:assessments(*, course:courses(*)), candidate:candidates(*)').in('status', ['submitted', 'scoring', 'reviewed']).order('submitted_at', { ascending: false });
  return data || [];
}

export async function getSubmissionForReview(attemptId: string) {
  const supabase = getClient();
  const { data: attempt } = await supabase.from('candidate_attempts').select('*, assessment:assessments(*, course:courses(*)), candidate:candidates(*)').eq('id', attemptId).single();
  const { data: answers } = await supabase.from('candidate_answers').select('*, question:questions(*, competency:competencies(*), rubric:rubrics(*), course:courses(*)), ai_suggestion:ai_score_suggestions(*), assessor_score:assessor_scores(*)').eq('attempt_id', attemptId);
  return { attempt, answers: answers || [] };
}

export async function saveAssessorScore(params: any) {
  const supabase = getClient();
  const { data: existing } = await supabase.from('assessor_scores').select('id').eq('answer_id', params.answerId).single();
  const payload = { attempt_id: params.attemptId, answer_id: params.answerId, ai_suggestion_id: params.aiSuggestionId || null, assessor_id: params.assessorId, final_score: params.finalScore, max_score: params.maxScore, viva_remarks: params.vivaRemarks || null, status: params.status, assessed_at: new Date().toISOString() };
  if (existing) {
    const { data, error } = await supabase.from('assessor_scores').update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('assessor_scores').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

export async function finalizeResult(attemptId: string, assessorId: string) {
  const supabase = getClient();
  const { data: scores } = await supabase.from('assessor_scores').select('*, answer:candidate_answers(question_id, question:questions(question_type))').eq('attempt_id', attemptId).eq('status', 'approved');
  if (!scores || scores.length === 0) throw new Error('No approved scores');
  let mcqScore = 0, mcqMax = 0, scenarioScore = 0, scenarioMax = 0, practicalScore = 0, practicalMax = 0;
  for (const s of scores) {
    const qt = (s as any).answer?.question?.question_type;
    if (qt === 'mcq') { mcqScore += s.final_score; mcqMax += s.max_score; }
    else if (qt === 'scenario') { scenarioScore += s.final_score; scenarioMax += s.max_score; }
    else if (qt === 'practical') { practicalScore += s.final_score; practicalMax += s.max_score; }
  }
  const totalScore = mcqScore + scenarioScore + practicalScore;
  const totalMax = mcqMax + scenarioMax + practicalMax;
  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (percentage >= 85) grade = 'A'; else if (percentage >= 70) grade = 'B'; else if (percentage >= 60) grade = 'C'; else if (percentage >= 50) grade = 'D';
  const { data: attempt } = await supabase.from('candidate_attempts').select('candidate_id, assessment_id').eq('id', attemptId).single();
  const { data, error } = await supabase.from('final_results').insert({ attempt_id: attemptId, candidate_id: attempt.candidate_id, assessment_id: attempt.assessment_id, mcq_score: mcqScore, mcq_max: mcqMax, scenario_score: scenarioScore, scenario_max: scenarioMax, practical_score: practicalScore, practical_max: practicalMax, total_score: totalScore, total_max: totalMax, percentage: Math.round(percentage * 100) / 100, grade, status: percentage >= 70 ? 'pass' : 'fail', assessor_id: assessorId, finalized_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  await supabase.from('candidate_attempts').update({ status: 'finalized' }).eq('id', attemptId);
  return data;
}

// ============================================
// AI SCORING
// ============================================
export async function generateAIScore(params: { answerId: string; questionText: string; answerText: string; rubric?: string; maxScore: number }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}/api/ai-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'AI scoring failed' }));
    throw new Error(err.error || 'AI scoring failed');
  }
  return response.json();
}
