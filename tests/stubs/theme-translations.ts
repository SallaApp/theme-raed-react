import ar from '../../locales/ar.json';
import en from '../../locales/en.json';

/**
 * Stand-in for `virtual:twilight/theme-translations` (aliased in
 * `vitest.config.ts`): the module only exists under the theme engine's Vite
 * plugin, which tests don't run. Same shape it bundles: one bucket per locale
 * file.
 */
export default {
  'ar.trans': ar as Record<string, string>,
  'en.trans': en as Record<string, string>,
};
