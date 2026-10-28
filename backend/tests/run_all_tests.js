import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'step0_security_reliability.test.js',
  'step1_ecdsa_threshold.test.js',
  'step2_deadline_escalation.test.js'
];

let totalFailed = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n================== EXECUTING: ${file} ==================`);
  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`FAILED: ${file}`);
    totalFailed++;
  }
}

if (totalFailed > 0) {
  console.error(`\nTest suite finished with ${totalFailed} failing file(s).`);
  process.exit(1);
} else {
  console.log('\n================ ALL TEST SUITES PASSED SUCCESSFULLY ================');
  process.exit(0);
}
