// Tailwind for critical.scss: the theme's setup, scanning only the home page's first-screen components.
const fs = require('fs');
const path = require('path');
const base = require('../../tailwind.config.cjs');

// Engine sources: live in the monorepo, else the copy its package ships.
const engineSrc = path.join(__dirname, '../../../theme-engine/src');
const engine = fs.existsSync(engineSrc)
  ? engineSrc
  : path.join(__dirname, '../../node_modules/@salla.sa/twilight-theme-engine/tailwind');

module.exports = {
  ...base,
  content: [
    './app/routes/__root.tsx',
    './app/components/{layout,home}/**/*.{ts,tsx}',
    `${engine}/components/{layout,home}/**/*`,
    // The page's own placeholder blocks.
    `${engine}/routes/home/**/*`,
    // The SDK's server skeletons, which stand in for its components until they load.
    './node_modules/@salla.sa/twilight-components-react/dist/skeletons/**/*.js',
  ],
};
