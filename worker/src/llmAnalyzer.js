import Anthropic from '@anthropic-ai/sdk';

/**
 * Piece 3 — real vision-LLM analysis.
 *
 * For each captured section screenshot, asks Claude to:
 *   1. transcribe every piece of visible copy (headline, subhead, CTA, prices, etc.)
 *   2. tag the section type (hero, pricing, testimonials, footer, etc.)
 *   3. write a short note on the marketing/persuasion technique at play
 *
 * This is the "read it so I don't have to type it out" step — it replaces
 * manually transcribing competitor pages into research notes.
 *
 * Requires ANTHROPIC_API_KEY to be set in the worker's environment.
 */

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 700;
const CONCURRENCY = 3; // how many sections to analyze in parallel

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically

const SYSTEM_PROMPT = `You are analyzing a screenshot of ONE section of a webpage for competitive marketing research. The person doing this research wants to skip manually reading and typing out what's on the page — your job is to do that reading and organizing for them.

Respond with ONLY a JSON object — no markdown code fences, no preamble, no commentary outside the JSON. Use exactly this shape:

{
  "section_type": "<short lowercase tag, e.g. hero, nav, pricing, testimonials, features, footer, faq, cta, social-proof, logos, stats>",
  "transcription": "<every piece of visible copy in this section, transcribed verbatim — headline, subheadline, body copy, button/CTA text, prices, stats, badges. Use line breaks between distinct elements. Transcribe exactly what's written, do not paraphrase or summarize the copy itself.>",
  "marketing_notes": "<2-4 sentences on why this section is built the way it is — the persuasion technique, structural choice, or positioning at play.>"
}

If the image has no readable page content (blank, a loading spinner, a bot-protection/security-check screen, an error page), set "section_type" to "unreadable" and use "marketing_notes" to briefly say why, leaving "transcription" empty.`;

/**
 * @param {string} jobId
 * @param {{label: string, buffer: Buffer}[]} shots
 * @param {string} outputType  (currently informational only — all jobs get the same analysis shape)
 * @returns {Promise<object>} stored in jobs.result
 */
export async function generateOutput(jobId, shots, outputType) {
  const sections = new Array(shots.length);

  await runWithConcurrency(shots, CONCURRENCY, async (shot, idx) => {
    sections[idx] = await analyzeSection(shot, idx);
  });

  return {
    output_type: outputType,
    model: MODEL,
    section_count: shots.length,
    generated_at: new Date().toISOString(),
    sections
  };
}

async function analyzeSection(shot, idx) {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: shot.buffer.toString('base64')
              }
            },
            {
              type: 'text',
              text: `This is section ${idx + 1} of the page (auto-detected label: "${shot.label}"). Analyze it per the system instructions.`
            }
          ]
        }
      ]
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const parsed = parseJsonLoose(textBlock?.text ?? '');

    return {
      section_idx: idx,
      label: shot.label,
      section_type: parsed.section_type || 'unknown',
      transcription: parsed.transcription || '',
      marketing_notes: parsed.marketing_notes || ''
    };
  } catch (err) {
    console.error(`[llmAnalyzer] section ${idx} (${shot.label}) failed:`, err.message);
    return {
      section_idx: idx,
      label: shot.label,
      section_type: 'error',
      transcription: '',
      marketing_notes: '',
      error: err.message
    };
  }
}

/** Strips accidental markdown fences and parses JSON; returns {} on failure rather than throwing. */
function parseJsonLoose(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

/** Runs `worker` over `items` with at most `limit` in flight at once. */
async function runWithConcurrency(items, limit, worker) {
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}
