import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve } from 'node:path';

// Exercise the real shell runner with isolated command substitutes. In
// particular, a successful final rebuild must not hide a failed test stage.
function runPipeline(failingStage = '', variant?: string) {
  const root = mkdtempSync(join(tmpdir(), 'mathlive-runner-'));
  const bin = join(root, 'bin');
  const calls = join(root, 'calls.log');
  try {
    mkdirSync(bin);
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'dist', 'types'), { recursive: true });
    copyFileSync(
      resolve(__dirname, '../scripts/test.sh'),
      join(root, 'scripts', 'test.sh')
    );
    for (const command of ['npm', 'npx']) {
      const file = join(bin, command);
      writeFileSync(
        file,
        '#!/bin/bash\n' +
          'printf "%s\\n" "$1" >> "$RUNNER_CALLS"\n' +
          'if [ "$1" = "$FAILING_STAGE" ]; then exit 23; fi\n' +
          'exit 0\n'
      );
      chmodSync(file, 0o755);
    }
    const result = spawnSync(
      'bash',
      ['scripts/test.sh', ...(variant ? [variant] : [])],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: [bin, process.env.PATH].join(delimiter),
          RUNNER_CALLS: calls,
          FAILING_STAGE: failingStage,
        },
        encoding: 'utf8',
        timeout: 15000,
      }
    );
    if (result.error) throw result.error;
    return {
      status: result.status,
      calls: readFileSync(calls, 'utf8').trim().split('\n'),
    };
  } finally {
    // Only remove the disposable directory created by this invocation.
    const target = resolve(root);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !relative(tmpdir(), target).startsWith('mathlive-runner-')
    )
      throw new Error('Refusing to remove a path outside the runner fixture.');
    rmSync(target, { recursive: true, force: true });
  }
}

describe('test pipeline exit status', () => {
  test.each(['jest', 'tsc', 'playwright'])(
    'preserves a failing %s stage after a successful rebuild',
    (stage) => {
      const result = runPipeline(stage);
      expect(result.calls).toEqual(['jest', 'tsc', 'playwright', 'run']);
      expect(result.status).toBe(23);
    }
  );

  test.each(['coverage', 'snapshot'])(
    'preserves failure in the %s variant',
    (variant) => expect(runPipeline('jest', variant).status).toBe(23)
  );

  test('returns success when every stage succeeds', () => {
    expect(runPipeline().status).toBe(0);
  });

  test('returns failure when the final build fails', () => {
    expect(runPipeline('run').status).toBe(23);
  });
});
