// Screenshots every assessment screen per product for prescriber review.
// Needs the dev server on :3000 (it uses the dev-only /dev/assessment-preview) and playwright-core
// (npm i --no-save playwright-core). Usage: node scripts/assessment-screenshots.mjs "<output folder>"

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3000/dev/assessment-preview';
const OUT = process.argv[2];
const CAT = { longevity: 'Longevity', 'sexual-health': 'Sexual health', hormones: 'Hormones', hair: 'Hair', skin: 'Skin', other: 'Other' };
const clean = (s) => s.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90);

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 820, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 });
const products = await page.$$eval('[data-product]', (els) => els.map((e) => ({ id: e.dataset.product, cat: e.dataset.category, name: e.dataset.name })));
const cats = await page.$$eval('[data-start-category]', (els) => els.map((e) => e.dataset.startCategory));

const jobs = [
  ...products.map((p) => ({ url: `${BASE}?product=${p.id}`, dir: path.join(OUT, CAT[p.cat] ?? p.cat, clean(p.name)) })),
  ...cats.map((c) => ({ url: `${BASE}?category=${c}`, dir: path.join(OUT, CAT[c] ?? c, `_Category start (no product chosen)`) })),
];
let total = 0;
for (const j of jobs) {
  fs.mkdirSync(j.dir, { recursive: true });
  await page.goto(j.url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('[data-shot]', { timeout: 60000 });
  // The dev server's floating indicator isn't part of the assessment.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  const shots = await page.$$('[data-shot]');
  const used = new Set();
  for (const el of shots) {
    let name = clean(await el.getAttribute('data-shot'));
    while (used.has(name)) name += ' (2)';
    used.add(name);
    await el.screenshot({ path: path.join(j.dir, `${name}.png`) });
    total++;
  }
  console.log(`${shots.length.toString().padStart(2)}  ${path.relative(OUT, j.dir)}`);
}
console.log(`total screenshots: ${total}`);
await browser.close();
