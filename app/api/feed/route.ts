import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET() {
  const missing = (['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const)
    .filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('Missing Supabase env vars:', missing);
    return NextResponse.json(
      { error: 'Missing Supabase env vars', missing },
      { status: 500 }
    );
  }

  try {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('event_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', detail: error.message },
        { status: 500 }
      );
    }

    // Map Supabase format to EventLog
    const events = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      workerId: row.worker_id,
      workerName: row.worker_name,
      message: row.message,
      jobId: row.job_id,
      severity: row.severity,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
