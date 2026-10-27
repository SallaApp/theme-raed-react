import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Skip quietly outside a git checkout (CI tarballs, published packages).
if (existsSync('.git')) {
  spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
}
