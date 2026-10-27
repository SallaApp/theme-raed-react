// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const script = resolve(__dirname, '../../scripts/check-bundle.mjs');
let root: string;

const asset = (name: string, bytes: number) =>
  writeFileSync(join(root, 'dist/client/assets', name), randomBytes(bytes));
const budget = (value: unknown) =>
  writeFileSync(join(root, 'size-budget.json'), JSON.stringify(value));
const run = (...args: string[]) =>
  spawnSync('node', [script, ...args], {
    env: { ...process.env, BUNDLE_ROOT: root },
    encoding: 'utf8',
  });
const limits = (gzip: number) => ({ gzip, brotli: gzip });
const baseBudget = (chunk: number, total = 100000) => ({
  untrackedChunk: limits(8192),
  totals: { js: limits(total), css: limits(total) },
  chunks: { 'vendor.js': limits(chunk) },
});

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'bundle-'));
  mkdirSync(join(root, 'dist/client/assets'), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('scripts.size.check-bundle', () => {
  it('passes when every chunk and total is under budget, and writes the report', () => {
    asset('vendor-AAAAAAAA.js', 5000);
    budget(baseBudget(6000));
    const res = run();
    expect(res.status).toBe(0);
    const report = JSON.parse(readFileSync(join(root, 'dist/size-report.json'), 'utf8'));
    expect(report.passed).toBe(true);
    expect(report.failures).toEqual([]);
  });

  it('fails when a chunk is above its budget', () => {
    asset('vendor-AAAAAAAA.js', 5000);
    budget(baseBudget(4000));
    const res = run();
    expect(res.status).toBe(1);
    const report = JSON.parse(readFileSync(join(root, 'dist/size-report.json'), 'utf8'));
    expect(report.failures.map((f: { name: string }) => f.name)).toContain('vendor.js');
  });

  it('fails when the JS total is above its budget', () => {
    asset('vendor-AAAAAAAA.js', 5000);
    budget(baseBudget(6000, 3000));
    expect(run().status).toBe(1);
  });

  it('matches a chunk across rebuilds by dropping every embedded hash', () => {
    asset('vendor-AAAAAAAA-BBBBBBBB.js', 5000);
    budget(baseBudget(6000));
    expect(run().status).toBe(0);
    rmSync(join(root, 'dist/client/assets/vendor-AAAAAAAA-BBBBBBBB.js'));
    asset('vendor-CCCCCCCC-D_E-F0Gh.js', 7000);
    expect(run().status).toBe(1);
  });

  it('holds a new chunk without its own budget to the untracked limit', () => {
    asset('vendor-AAAAAAAA.js', 5000);
    asset('extra-AAAAAAAA.js', 9000);
    budget(baseBudget(6000));
    const res = run();
    expect(res.status).toBe(1);
    expect(res.stdout).toContain('extra.js (new)');
  });

  it('fails instead of passing when the build has no JS assets', () => {
    budget(baseBudget(6000));
    expect(run().status).toBe(1);
  });

  it('--update writes the current size plus the margin, keeping only chunks of 4 kB gzip or more', () => {
    asset('vendor-AAAAAAAA.js', 5000);
    asset('tiny-AAAAAAAA.js', 500);
    expect(run('--update').status).toBe(0);
    const written = JSON.parse(readFileSync(join(root, 'size-budget.json'), 'utf8'));
    expect(Object.keys(written.chunks)).toEqual(['vendor.js']);
    expect(written.chunks['vendor.js'].gzip).toBeGreaterThan(5000);
    expect(written.chunks['vendor.js'].gzip).toBeLessThan(5000 * 1.06 + 100);
    expect(run().status).toBe(0);
  });

  it('--update refuses to write a budget from an empty build', () => {
    expect(run('--update').status).toBe(1);
    expect(() => readFileSync(join(root, 'size-budget.json'))).toThrow();
  });
});
