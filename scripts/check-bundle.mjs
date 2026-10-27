// Compares the client build output (dist/client/assets) with size-budget.json.
// Usage: node scripts/check-bundle.mjs [--update]   (--update rewrites the budget: current size + margin)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const root = process.env.BUNDLE_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'dist/client/assets');
const budgetPath = join(root, 'size-budget.json');
const reportPath = join(root, 'dist/size-report.json');
const MARGIN = 0.05;
const TRACK_MIN_GZIP = 4096;

const kb = (n) => (n / 1024).toFixed(1) + ' kB';
const diff = (n) => (n > 0 ? '+' : n < 0 ? '-' : '') + kb(Math.abs(n));

function measure() {
  let files;
  try {
    files = readdirSync(assetsDir).filter((f) => /\.(js|css)$/.test(f));
  } catch {
    throw new Error(`No client build at ${assetsDir}. Run "pnpm build" first.`);
  }
  if (!files.some((f) => f.endsWith('.js'))) {
    throw new Error(`No JS assets in ${assetsDir}; the build layout may have changed.`);
  }
  const chunks = {};
  const totals = { js: { gzip: 0, brotli: 0 }, css: { gzip: 0, brotli: 0 } };
  for (const file of files) {
    const buf = readFileSync(join(assetsDir, file));
    const gzip = gzipSync(buf, { level: 9 }).length;
    const brotli = brotliCompressSync(buf).length;
    const kind = file.endsWith('.css') ? 'css' : 'js';
    totals[kind].gzip += gzip;
    totals[kind].brotli += brotli;
    // Drop every embedded content hash so a chunk keeps one budget across builds.
    const name = file.replace(/(-[A-Za-z0-9_-]{8})+(\.(?:js|css))$/, '$2');
    const prev = chunks[name] ?? { gzip: 0, brotli: 0 };
    chunks[name] = { gzip: prev.gzip + gzip, brotli: prev.brotli + brotli };
  }
  return { chunks, totals };
}

const { chunks, totals } = measure();
const withMargin = (s) => ({
  gzip: Math.ceil(s.gzip * (1 + MARGIN)),
  brotli: Math.ceil(s.brotli * (1 + MARGIN)),
});

if (process.argv.includes('--update')) {
  const tracked = Object.fromEntries(
    Object.entries(chunks)
      .filter(([, s]) => s.gzip >= TRACK_MIN_GZIP)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([n, s]) => [n, withMargin(s)])
  );
  const budget = {
    margin: MARGIN,
    untrackedChunk: { gzip: TRACK_MIN_GZIP * 2, brotli: TRACK_MIN_GZIP * 2 },
    totals: { js: withMargin(totals.js), css: withMargin(totals.css) },
    chunks: tracked,
  };
  writeFileSync(budgetPath, JSON.stringify(budget, null, 2) + '\n');
  console.log(`Wrote ${budgetPath} (current size + ${MARGIN * 100}% margin)`);
  process.exit(0);
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
const rows = [];
const add = (name, cur, bud) => {
  for (const metric of ['gzip', 'brotli']) {
    rows.push({
      name,
      metric,
      current: cur[metric],
      budget: bud[metric],
      diff: cur[metric] - bud[metric],
      ok: cur[metric] <= bud[metric],
    });
  }
};
add('TOTAL js', totals.js, budget.totals.js);
add('TOTAL css', totals.css, budget.totals.css);
for (const [name, cur] of Object.entries(chunks)) {
  const bud = budget.chunks[name] ?? budget.untrackedChunk;
  // Small chunks without their own budget only matter if they grow past the untracked limit.
  add(budget.chunks[name] ? name : `${name} (new)`, cur, bud);
}
for (const name of Object.keys(budget.chunks)) {
  if (!chunks[name])
    console.warn(`Budgeted chunk not found in build (renamed or removed?): ${name}`);
}

const shown = rows.filter(
  (r) => r.name.startsWith('TOTAL') || budget.chunks[r.name.replace(' (new)', '')] || !r.ok
);
const width = Math.max(...shown.map((r) => r.name.length));
console.log(
  `${'chunk'.padEnd(width)}  type    ${'current'.padStart(10)} ${'budget'.padStart(10)} ${'diff'.padStart(10)}  status`
);
for (const r of shown) {
  console.log(
    `${r.name.padEnd(width)}  ${r.metric.padEnd(6)}  ${kb(r.current).padStart(10)} ${kb(r.budget).padStart(10)} ${diff(r.diff).padStart(10)}  ${r.ok ? 'ok' : 'OVER'}`
  );
}

const failures = rows.filter((r) => !r.ok);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  JSON.stringify({ passed: failures.length === 0, totals, chunks, rows, failures }, null, 2) + '\n'
);
console.log(`\nReport: ${reportPath}`);
if (failures.length) {
  console.error(
    `\nBundle budget exceeded in ${failures.length} measurement(s). If the growth is intended, run "pnpm size:update" and commit size-budget.json.`
  );
  process.exit(1);
}
console.log('Bundle within budget.');
