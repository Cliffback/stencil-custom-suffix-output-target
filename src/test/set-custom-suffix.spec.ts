import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve(__dirname, '../../scripts/set-custom-suffix.js');

const ANGULAR_SOURCE = `selectors: [['my-button']],`;
const ANGULAR_EXPECTED = `selectors: [['my-button--app'/*original-tag: 'my-button'*/]],`;

function run(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function createPackage(
  root: string,
  name: string,
  files: Record<string, string>,
) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, 'dist', file), content);
  }
  return dir;
}

describe('set-custom-suffix', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'set-custom-suffix-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes the suffix into --target-dir', () => {
    const targetDir = createPackage(root, 'lib', {});

    const result = run(['--set', 'app', '--target-dir', targetDir]);

    expect(result.status).toBe(0);
    const config = fs.readFileSync(
      path.join(targetDir, 'dist', 'custom-suffix.json'),
      'utf8',
    );
    expect(JSON.parse(config)).toBe('--app');
  });

  it('patches the angular wrapper in --angular-dir', () => {
    const targetDir = createPackage(root, 'lib', {});
    const angularDir = createPackage(root, 'ng', {
      'fesm2022.js': ANGULAR_SOURCE,
    });

    const result = run([
      '--set',
      'app',
      '--target-dir',
      targetDir,
      '--angular-dir',
      angularDir,
    ]);

    expect(result.status).toBe(0);
    expect(
      fs.readFileSync(path.join(angularDir, 'dist', 'fesm2022.js'), 'utf8'),
    ).toBe(ANGULAR_EXPECTED);
  });

  it('does not modify hardlinked copies of patched files', () => {
    const targetDir = createPackage(root, 'lib', {
      'custom-suffix.json': '""',
    });
    const angularDir = createPackage(root, 'ng', {
      'fesm2022.js': ANGULAR_SOURCE,
    });
    const storeConfig = path.join(root, 'store-config.json');
    const storeFesm = path.join(root, 'store-fesm.js');
    fs.linkSync(
      path.join(targetDir, 'dist', 'custom-suffix.json'),
      storeConfig,
    );
    fs.linkSync(path.join(angularDir, 'dist', 'fesm2022.js'), storeFesm);

    const result = run([
      '--set',
      'app',
      '--target-dir',
      targetDir,
      '--angular-dir',
      angularDir,
    ]);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(storeConfig, 'utf8')).toBe('""');
    expect(fs.readFileSync(storeFesm, 'utf8')).toBe(ANGULAR_SOURCE);
  });

  it('skips the angular wrapper when --angular is empty', () => {
    const targetDir = createPackage(root, 'lib', {});

    const result = run([
      '--set',
      'app',
      '--target-dir',
      targetDir,
      '--angular',
      '',
    ]);

    expect(result.status).toBe(0);
  });

  it('requires --target or --target-dir', () => {
    expect(run(['--set', 'app']).status).not.toBe(0);
  });

  it('rejects --target together with --target-dir', () => {
    const targetDir = createPackage(root, 'lib', {});

    expect(
      run(['--set', 'app', '--target', 'lib', '--target-dir', targetDir])
        .status,
    ).not.toBe(0);
  });
});
