import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './lib/repo.ts';

const version = process.env['npm_package_version'];
if (version === undefined || version === '') {
  throw new Error('npm_package_version is required to name the itch.io archive');
}

const dist = join(ROOT, 'dist');
const archive = join(ROOT, `starshot-v${version}-itchio.zip`);
if (!existsSync(dist)) {
  throw new Error('dist/ is missing; run npm run build before packaging');
}

rmSync(archive, { force: true });
const zip = spawnSync('zip', ['-qr', archive, '.'], { cwd: dist, stdio: 'inherit' });
if (zip.status === 0) {
  process.stdout.write(`Created ${archive}\n`);
} else {
  const python = spawnSync(
    'python3',
    [
      '-c',
      "import os, sys, zipfile; root, output = sys.argv[1:]; z = zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED); [(z.write(os.path.join(path, file), os.path.relpath(os.path.join(path, file), root))) for path, _, files in os.walk(root) for file in files]; z.close()",
      dist,
      archive,
    ],
    { stdio: 'inherit' },
  );
  if (python.status !== 0) {
    throw new Error('Could not create itch.io archive: install zip or Python 3');
  }
  process.stdout.write(`Created ${archive} with Python zipfile fallback\n`);
}
