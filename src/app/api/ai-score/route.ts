import { createClientAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { answerId, questionText, answerText, rubric, maxScore } = await req.json();

    const KIMI_API_KEY = process.env.KIMI_API_KEY;
    if (!KIMI_API_KEY) {
      return NextResponse.json({ error: 'KIMI_API_KEY not configured' }, { status: 500 });
    }

    const rubricText = rubric ? JSON.stringify(rubric, null, 2) : 'No rubric provided';

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-128k',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assessment scoring assistant. Score the candidate answer based on the provided rubric. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: `Question: ${questionText}\n\nRubric: ${rubricText}\n\nCandidate Answer: ${answerText}\n\nScore this answer and return JSON in this exact format:\n{\n  "suggested_score": number,\n  "max_score": number,\n  "confidence": number (0-1),\n  "explanation": "string",\n  "rubric_feedback": [{"criterion": "string", "score": number, "feedback": "string"}]\n}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kimi API error:', errorText);
      return NextResponse.json({ error: 'Kimi API failed', details: errorText }, { status: 500 });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';

    // Parse JSON from content
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : {};
    }

    const result = {
      suggested_score: Math.min(Math.max(Number(parsed.suggested_score) || 0, 0), maxScore || 10),
      max_score: maxScore || 10,
      confidence: Math.min(Math.max(Number(parsed.confidence) || 0.5, 0), 1),
      explanation: String(parsed.explanation || 'No explanation provided'),
      rubric_feedback: Array.isArray(parsed.rubric_feedback) ? parsed.rubric_feedback : [],
    };

    // Store in database
    const supabase = createClientAdmin();
    await supabase.from('ai_score_suggestions').insert({
      answer_id: answerId,
      model: 'kimi-moonshot-v1-128k',
      suggested_score: result.suggested_score,
      max_score: result.max_score,
      confidence: result.confidence,
      explanation: result.explanation,
      rubric_feedback: result.rubric_feedback,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI scoring error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
