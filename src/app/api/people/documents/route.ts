import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/people/documents — upload a file + create metadata row
 * Accepts multipart/form-data with fields:
 *   file, companyId, employeeId, docType, title, expiresAt?, notes?, uploadedBy
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const companyId = formData.get('companyId') as string;
    const employeeId = formData.get('employeeId') as string;
    const docType = formData.get('docType') as string;
    const title = formData.get('title') as string;
    const expiresAt = formData.get('expiresAt') as string | null;
    const notes = formData.get('notes') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !companyId || !employeeId || !docType || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Build storage path
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    const uuid = crypto.randomUUID();
    const objectName = `${companyId}/${employeeId}/${docType}/${uuid}_${safeName}`;

    // Upload file to storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from('employee-documents')
      .upload(objectName, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[documents/upload] storage error:', uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Insert metadata row via RPC (bypasses PostgREST schema cache issues)
    const { data: docId, error: insertError } = await admin.rpc('insert_employee_document', {
      p_company_id: companyId,
      p_profile_id: employeeId,
      p_document_type: docType,
      p_title: title,
      p_file_path: objectName,
      p_file_name: safeName,
      p_mime_type: file.type || null,
      p_file_size: file.size || null,
      p_expires_at: expiresAt || null,
      p_notes: notes || null,
      p_uploaded_by: uploadedBy || null,
    });

    if (insertError) {
      console.error('[documents/upload] insert error:', insertError);
      // Try to clean up the uploaded file
      await admin.storage.from('employee-documents').remove([objectName]);
      return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: { id: docId } });
  } catch (error) {
    console.error('[documents/upload]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/people/documents?employeeId=...
 * List all non-deleted documents for an employee
 */
export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get('employeeId');
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('employee_documents')
      .select('*')
      .eq('profile_id', employeeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[documents/list]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[documents/list]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/people/documents — soft-delete a document
 * Body: { docId, deletedBy }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { docId, deletedBy, filePath, bucketId } = await req.json();
    if (!docId) {
      return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Soft-delete the metadata row
    const { error: delErr } = await admin
      .from('employee_documents')
      .update({ deleted_at: new Date().toISOString(), deleted_by: deletedBy || null })
      .eq('id', docId);

    if (delErr) {
      console.error('[documents/delete]', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Best-effort storage cleanup
    if (filePath) {
      await admin.storage.from(bucketId || 'employee-documents').remove([filePath]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[documents/delete]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PUT /api/people/documents — get a signed download URL
 * Body: { filePath, bucketId? }
 */
export async function PUT(req: NextRequest) {
  try {
    const { filePath, bucketId } = await req.json();
    if (!filePath) {
      return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(bucketId || 'employee-documents')
      .createSignedUrl(filePath, 300); // 5 min expiry

    if (error) {
      console.error('[documents/signedUrl]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data?.signedUrl });
  } catch (error) {
    console.error('[documents/signedUrl]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
