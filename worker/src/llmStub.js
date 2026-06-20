/**
 * Piece 3 will replace this with a real call to a vision-capable LLM
 * (sending the section screenshots and getting back copy/wireframe/etc.
 * depending on job.output_type). For now it's a stub so the rest of the
 * pipeline — capture, zip, upload, status updates — is fully testable
 * without picking an LLM provider yet.
 */
export async function generateOutput(jobId, shots, outputType) {
  return {
    stub: true,
    output_type: outputType,
    section_count: shots.length,
    note: 'LLM step not implemented yet (Piece 3) — this is a placeholder result.'
  };
}
