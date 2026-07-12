import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { db } from '@/lib/mock-db';

export async function GET() {
  try {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('event_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error || !data?.length) {
      // Fall back to mock
      const events = db.events.slice(0, 30);
      return NextResponse.json({ events });
    }

    // Map Supabase format to EventLog
    const events = data.map((row: any) => ({
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
    console.error('Error fetching feed from Supabase:', error);
    // Fall back to mock
    const events = db.events.slice(0, 30);
    return NextResponse.json({ events });
  }
}
