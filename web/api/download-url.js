import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/download-url?jobId=...
 *
 * Looks up the job, confirms it's actually done, and mints a short-lived
 * signed URL for its zip in the private `exports` bucket. The service role
 * key never reaches the browser — it only lives here, server-side.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const jobId = req.query.jobId;
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('status, zip_path')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'done' || !job.zip_path) {
    res.status(409).json({ error: 'Job is not ready for download yet' });
    return;
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('exports')
    .createSignedUrl(job.zip_path, 60);

  if (signError || !signed) {
    res.status(500).json({ error: 'Could not create download link' });
    return;
  }

  res.status(200).json({ url: signed.signedUrl });
}
