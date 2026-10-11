// Tailwind for critical-product.scss: the theme's setup, scanning only the product page's first-screen components.
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
    './app/components/{layout,product}/**/*.{ts,tsx}',
    `${engine}/components/{layout,product}/**/*`,
    `${engine}/components/common/BreadcrumbTrail.*`,
    // The SDK's server skeletons, which stand in for its components until they load.
    './node_modules/@salla.sa/twilight-components-react/dist/skeletons/**/*.js',
    // Listing cards share the folder but render on other pages.
    '!./app/components/product/{ProductCard,ProductList*}.tsx',
    `!${engine}/components/product/{ProductCard,ProductList*}.*`,
  ],
};
