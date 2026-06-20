import { chromium } from 'playwright';

const MAX_SECTIONS = 15;
const MIN_SECTION_HEIGHT = 80; // px — skip slivers (dividers, spacers)
const VIEWPORT = { width: 1440, height: 900 };
const NAV_TIMEOUT_MS = 45000;

/**
 * Visits `url`, finds its distinct sections (header, nav, hero, footer, etc.),
 * and returns an array of { label, buffer } PNG screenshots — one per section.
 *
 * If the page has no clear semantic sections, falls back to slicing the full
 * page into viewport-height chunks so we still get *something* useful.
 */
export async function captureSections(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const shots = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    await autoScroll(page); // trigger lazy-loaded images/sections
    await page.waitForTimeout(500);

    const sectionHandles = await page.$$(
      'header, nav, main > section, main > article, main > div, footer'
    );

    let idx = 0;
    for (const handle of sectionHandles) {
      if (idx >= MAX_SECTIONS) break;
      const box = await handle.boundingBox();
      if (!box || box.height < MIN_SECTION_HEIGHT) continue;
      const buffer = await handle.screenshot().catch(() => null);
      if (!buffer) continue;
      shots.push({ label: await guessLabel(handle, idx), buffer });
      idx++;
    }

    // Fallback: no usable semantic sections — slice the full page instead
    if (shots.length === 0) {
      const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const chunkCount = Math.min(MAX_SECTIONS, Math.max(1, Math.ceil(totalHeight / VIEWPORT.height)));
      for (let i = 0; i < chunkCount; i++) {
        const y = i * VIEWPORT.height;
        await page.evaluate((yPos) => window.scrollTo(0, yPos), y);
        await page.waitForTimeout(150);
        const clipHeight = Math.min(VIEWPORT.height, totalHeight - y);
        if (clipHeight <= 0) break;
        const buffer = await page.screenshot({
          clip: { x: 0, y: 0, width: VIEWPORT.width, height: clipHeight }
        });
        shots.push({ label: `section-${i + 1}`, buffer });
      }
    }

    return shots;
  } finally {
    await browser.close();
  }
}

async function guessLabel(handle, idx) {
  return handle.evaluate((el, fallbackIdx) => {
    const raw =
      el.id ||
      (el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : '') ||
      el.tagName.toLowerCase();
    return (raw || `section-${fallbackIdx + 1}`).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || `section-${fallbackIdx + 1}`;
  }, idx);
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
}
