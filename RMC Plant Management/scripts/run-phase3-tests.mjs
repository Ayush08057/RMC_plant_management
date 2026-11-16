import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

const JAR_PATH = 'C:/Users/HP/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar';
const RULES_PATH = path.resolve('E:/SM/RMC Plant Management/RMC Plant Management/firestore.rules');

async function waitForEmulator(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:8080', (res) => resolve(res.statusCode));
        req.on('error', reject);
      });
      if (res) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Emulator failed to start within timeout');
}

async function main() {
  console.log('Starting Firestore Emulator with rules:', RULES_PATH);
  const emu = spawn('java', [
    '-jar', JAR_PATH,
    '--host', '127.0.0.1',
    '--port', '8080',
    '--rules', RULES_PATH
  ], { stdio: 'inherit' });

  emu.on('error', (err) => {
    console.error('Failed to spawn java:', err);
    process.exit(1);
  });

  try {
    await waitForEmulator();
    console.log('Emulator is UP on port 8080. Running test suite...\n');

    const testProc = spawn('node', ['E:/SM/RMC Plant Management/RMC Plant Management/scripts/test-phase3-security.mjs'], { stdio: 'inherit' });
    const exitCode = await new Promise((resolve) => testProc.on('exit', resolve));

    emu.kill('SIGINT');
    process.exit(exitCode || 0);
  } catch (err) {
    console.error('Test execution failed:', err.message);
    emu.kill('SIGKILL');
    process.exit(1);
  }
}

main();
