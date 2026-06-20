import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { supabase } from './supabaseClient.js';

/** Uploads each section screenshot to the `screenshots` bucket and records it in job_screenshots. */
export async function uploadScreenshots(jobId, shots) {
  const rows = [];
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const path = `${jobId}/${String(i + 1).padStart(2, '0')}-${shot.label}.png`;

    const { error } = await supabase.storage
      .from('screenshots')
      .upload(path, shot.buffer, { contentType: 'image/png', upsert: true });

    if (error) throw new Error(`Screenshot upload failed (${path}): ${error.message}`);
    rows.push({ job_id: jobId, section_idx: i, label: shot.label, storage_path: path });
  }

  if (rows.length) {
    const { error } = await supabase.from('job_screenshots').insert(rows);
    if (error) throw new Error(`job_screenshots insert failed: ${error.message}`);
  }
}

/** Zips all section screenshots together and uploads the zip to the `exports` bucket. Returns the storage path. */
export async function zipAndUpload(jobId, shots) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks = [];

  stream.on('data', (chunk) => chunks.push(chunk));
  archive.pipe(stream);

  shots.forEach((shot, i) => {
    const filename = `${String(i + 1).padStart(2, '0')}-${shot.label}.png`;
    archive.append(shot.buffer, { name: filename });
  });

  const finished = new Promise((resolve, reject) => {
    stream.on('end', resolve);
    archive.on('error', reject);
  });
  await archive.finalize();
  await finished;

  const zipBuffer = Buffer.concat(chunks);
  const zipPath = `${jobId}/output.zip`;

  const { error } = await supabase.storage
    .from('exports')
    .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true });

  if (error) throw new Error(`Zip upload failed: ${error.message}`);

  return zipPath;
}
