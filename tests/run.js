const { spawn } = require('child_process');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const cli = path.join(repoRoot, 'src', 'ios-location.js');
const shimBin = path.join(__dirname, 'bin');

function runCli(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [cli, ...args], {
      env: {
        ...process.env,
        PATH: `${shimBin}:${process.env.PATH || ''}`,
      },
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

async function testUsageNoArgs() {
  const { code, stdout } = await runCli([]);
  assert.strictEqual(code, 1, 'exit code should be 1 for usage');
  assert(stdout.includes('Usage:'), 'should print usage');
}

async function testSetNoTunnelFlags() {
  const { code, stdout } = await runCli(['--no-tunnel', '--lat', '37.5', '--lon', '127.0']);
  assert.strictEqual(code, 0, 'set should succeed');
  assert(stdout.includes('[tunneld] skipped'), 'should skip tunneld');
  assert(stdout.includes('[simulate] running:'), 'should run simulate set');
  assert(stdout.includes('[simulate] done.'), 'should print simulate done');
}

async function testSetNoTunnelPositional() {
  const { code, stdout } = await runCli(['--no-tunnel', '1.23', '4.56']);
  assert.strictEqual(code, 0, 'set with positional args should succeed');
  assert(stdout.includes('[simulate] running:'), 'should run simulate set');
}

async function testResetFallbackNoTunnel() {
  const { code, stdout } = await runCli(['--no-tunnel', '--reset']);
  assert.strictEqual(code, 0, 'reset should succeed via fallback');
  assert(stdout.includes('simulate-location reset'), 'should try reset first');
  assert(stdout.includes("'reset' failed"), 'should log reset failed');
  assert(stdout.includes('simulate-location clear'), 'should try clear next');
  assert(stdout.includes('[reset] done.'), 'should print reset done');
}

async function main() {
  const tests = [
    ['usage without args', testUsageNoArgs],
    ['set (no-tunnel, flags)', testSetNoTunnelFlags],
    ['set (no-tunnel, positional)', testSetNoTunnelPositional],
    ['reset fallback (no-tunnel)', testResetFallbackNoTunnel],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      // eslint-disable-next-line no-console
      console.log(`ok - ${name}`);
      passed += 1;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`not ok - ${name}`);
      // eslint-disable-next-line no-console
      console.error(e && e.stack ? e.stack : String(e));
      process.exit(1);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\n${passed}/${tests.length} tests passed`);
}

main();

