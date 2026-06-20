import { supabase } from './supabaseClient.js';
import { captureSections } from './capture.js';
import { uploadScreenshots, zipAndUpload } from './storage.js';
import { generateOutput } from './llmStub.js';

const POLL_INTERVAL_MS = 5000;
let running = false; // prevents overlapping ticks if a job runs long

export function startPolling() {
  setInterval(tick, POLL_INTERVAL_MS);
  console.log(`[poller] started — checking every ${POLL_INTERVAL_MS / 1000}s`);
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[poller] fetch error:', error.message);
      return;
    }
    if (!jobs || jobs.length === 0) return;

    await processJob(jobs[0]);
  } catch (err) {
    console.error('[poller] unexpected error:', err);
  } finally {
    running = false;
  }
}

async function processJob(job) {
  console.log(`[job ${job.id}] starting — ${job.url}`);
  try {
    await setStatus(job.id, 'capturing');
    const shots = await captureSections(job.url);

    if (shots.length === 0) {
      throw new Error('No sections captured — page may have blocked the agent or failed to load');
    }

    await uploadScreenshots(job.id, shots);
    const zipPath = await zipAndUpload(job.id, shots);

    await setStatus(job.id, 'processing');
    const result = await generateOutput(job.id, shots, job.output_type);

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'done', section_count: shots.length, zip_path: zipPath, result })
      .eq('id', job.id);
    if (error) throw new Error(`Final update failed: ${error.message}`);

    console.log(`[job ${job.id}] done — ${shots.length} sections captured`);
  } catch (err) {
    console.error(`[job ${job.id}] failed:`, err.message);
    await supabase.from('jobs').update({ status: 'failed', error: err.message }).eq('id', job.id);
  }
}

async function setStatus(jobId, status) {
  await supabase.from('jobs').update({ status }).eq('id', jobId);
}
