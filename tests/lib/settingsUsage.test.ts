import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Every merchant setting and home-block field declared in twilight.json must be read by the
// theme (app/) or the engine, or the merchant toggles it and nothing happens.

const root = join(__dirname, '../..');
const engine = join(root, 'node_modules/@salla.sa/twilight-theme-engine');

type Field = { id?: string; type?: string; fields?: Field[] };
type Manifest = { settings?: Field[]; components?: { key: string; fields?: Field[] }[] };

// Known dead settings, each with the task that fixes it. Remove an entry when the fix lands;
// the last test fails until you do, so this list cannot go stale.
const KNOWN_UNREAD: Record<string, string> = {
  imageZoom: 'F2: the product image magnifier is not implemented',
  merge_with_top_component:
    'F1: main links declare this id, but MainLinks and the engine read merge_links_with_top_component',
  squar_photo_bg_image_size: 'F4: no component reads the square photos background size',
};

function declaredIds(manifest: Manifest): Map<string, string> {
  const ids = new Map<string, string>();
  const walk = (fields: Field[] | undefined, where: string) => {
    for (const field of fields ?? []) {
      if (field.id && field.type !== 'static' && !field.id.startsWith('static-')) {
        ids.set(field.id, where);
      }
      walk(field.fields, where);
    }
  };
  walk(manifest.settings, 'settings');
  for (const component of manifest.components ?? []) walk(component.fields, component.key);
  return ids;
}

function sourceText(dirs: string[]): string {
  const parts: string[] = [];
  const collect = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (/\.(tsx?|jsx?|txt)$/.test(entry.name) && !/\.d\.ts$|routeTree\.gen/.test(path)) {
        parts.push(readFileSync(path, 'utf8'));
      }
    }
  };
  dirs.forEach(collect);
  return parts.join('\n');
}

// Collection sub-fields are declared as `slides.video` but read as `slide.video`, so match the
// last segment, as a property, a string key or a destructured name.
function isRead(id: string, text: string): boolean {
  const name = id
    .split('.')
    .pop()!
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"\`.{,\\s]${name}\\b`).test(text);
}

describe('twilight.json settings are read by the theme or the engine', () => {
  const manifest: Manifest = JSON.parse(readFileSync(join(root, 'twilight.json'), 'utf8'));
  const ids = declaredIds(manifest);
  const text = sourceText([join(root, 'app'), join(engine, 'tailwind'), join(engine, 'dist')]);
  const unread = [...ids.keys()].filter((id) => !isRead(id, text));

  it('finds the declared ids (guards against a manifest shape change)', () => {
    expect(ids.size).toBeGreaterThan(40);
  });

  it('has no unread setting beyond the known, ticketed ones', () => {
    const unexpected = unread.filter((id) => !(id in KNOWN_UNREAD));
    expect(unexpected.map((id) => `${id} (${ids.get(id)})`)).toEqual([]);
  });

  it('lists no known-unread setting that is now read or no longer declared', () => {
    const stale = Object.keys(KNOWN_UNREAD).filter((id) => !unread.includes(id));
    expect(stale).toEqual([]);
  });
});
