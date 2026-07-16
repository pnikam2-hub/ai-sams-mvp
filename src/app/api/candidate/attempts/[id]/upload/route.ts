import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/candidate/attempts/[id]/upload - Upload practical file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify attempt exists and is in progress
    const { data: attempt, error: attemptError } = await supabase
      .from('candidate_attempts')
      .select('*')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt is not in progress' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const questionId = formData.get('question_id') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    const allowedExtensions = ['.pdf', '.zip', '.jpg', '.jpeg', '.png'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type. Allowed: PDF, ZIP, JPG, JPEG, PNG',
          received_type: file.type,
        },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `practicals/${id}/${questionId}/${timestamp}_${sanitizedName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-submissions')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('candidate-submissions')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData?.publicUrl || filePath;

    // Upsert practical submission record
    const { data: existingSubmission } = await supabase
      .from('practical_submissions')
      .select('id')
      .eq('attempt_id', id)
      .eq('question_id', questionId)
      .maybeSingle();

    let submission;
    if (existingSubmission) {
      const { data, error } = await supabase
        .from('practical_submissions')
        .update({
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          description: description || existingSubmission.description,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();
      submission = { data, error };
    } else {
      const { data, error } = await supabase
        .from('practical_submissions')
        .insert({
          attempt_id: id,
          question_id: questionId,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          description: description || '',
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();
      submission = { data, error };
    }

    if (submission.error) {
      console.error('Practical submission record error:', submission.error);
      // Try to clean up uploaded file
      await supabase.storage.from('candidate-submissions').remove([filePath]);
      return NextResponse.json(
        { error: 'Failed to save submission record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission: submission.data,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
