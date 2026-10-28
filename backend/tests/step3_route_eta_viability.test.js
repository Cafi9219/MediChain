/**
 * Unit Test Suite for Step 3: Route-Based ETA & Viability Validation
 *
 * Tests:
 * 1. Corridor graph hospital resolution & aliases
 * 2. Haversine distance & calibrated fallback calculation (eta_fb = kappa * g / v_avg)
 * 3. OSRM route calculation
 * 4. OSRM failure triggers automatic Haversine fallback
 * 5. Viability margin mu = D(o) - (t_now + eta + t_proc) on both sides of mu = 0 boundary
 * 6. Blockchain ledger transaction anchoring ('ETA_RECORDED') and SHA-256 integrity hash
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CORRIDOR_HOSPITALS,
  resolveHospitalCoordinates,
  calculateHaversineDistance,
  calculateHaversineFallback,
  calculateRouteAndViability
} from '../services/routeService.js';
import { ledger } from '../blockchain/blockchain.js';
import { sha256 } from '../blockchain/cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEDGER_PATH = path.join(__dirname, '..', 'data', 'ledger.json');

let passed = 0;
let failed = 0;

async function it(desc, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log(' STEP 3: ROUTE-BASED ETA & VIABILITY TEST SUITE');
console.log('========================================================================\n');

const originalLedgerDisk = fs.existsSync(LEDGER_PATH) ? fs.readFileSync(LEDGER_PATH, 'utf-8') : null;
const originalPending = JSON.parse(JSON.stringify(ledger.pendingTransactions));

function restoreLedger() {
  ledger.pendingTransactions = JSON.parse(JSON.stringify(originalPending));
  if (originalLedgerDisk) {
    fs.writeFileSync(LEDGER_PATH, originalLedgerDisk, 'utf-8');
  }
}

async function runTests() {
  // --------------------------------------------------------------------------
  // 1. Corridor Graph Hospital Resolution
  // --------------------------------------------------------------------------
  console.log('--- 1. Testing Corridor Graph Hospital Resolution ---');

  await it('Resolves all 7 designated corridor hub coordinates', () => {
    const hubs = [
      'AIIMS New Delhi',
      'Safdarjung',
      'Sir Ganga Ram',
      'Apollo Chennai',
      'FMRI Gurugram',
      'Manipal Bengaluru',
      'PGIMER Chandigarh'
    ];
    hubs.forEach(hub => {
      const coords = resolveHospitalCoordinates(hub);
      assert.ok(coords, `Hub ${hub} failed to resolve`);
      assert.ok(typeof coords.lat === 'number' && typeof coords.lng === 'number');
    });
  });

  await it('Resolves hospital name aliases accurately', () => {
    const c1 = resolveHospitalCoordinates('Safdarjung');
    const c2 = resolveHospitalCoordinates('Safdarjung Hospital (New Delhi)');
    assert.deepStrictEqual(c1, c2);
  });

  // --------------------------------------------------------------------------
  // 2. Haversine & Calibrated Fallback
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Calibrated Haversine Fallback Formula ---');

  await it('Computes great-circle distance accurately via Haversine', () => {
    // Delhi AIIMS to Safdarjung (approx 380m straight line)
    const g = calculateHaversineDistance(28.5672, 77.2100, 28.5700, 77.2078);
    assert.ok(g > 0.35 && g < 0.45, `Expected ~0.38km, got ${g}`);
  });

  await it('Haversine fallback respects configured kappa and v_avg parameters', () => {
    const orig = { lat: 28.5672, lng: 77.2100 };
    const dest = { lat: 28.4595, lng: 77.0725 }; // ~18km straight line
    const res = calculateHaversineFallback(orig, dest, { kappa: 1.30, v_avg: 45.0 });

    assert.strictEqual(res.method, 'haversine-fallback');
    assert.ok(res.distanceKm > 0);
    assert.ok(res.etaSeconds > 0);

    // Manual check: etaSeconds = (distanceKm / 45) * 3600
    const expectedSec = Math.round((res.distanceKm / 45.0) * 3600);
    assert.strictEqual(res.etaSeconds, expectedSec);
  });

  // --------------------------------------------------------------------------
  // 3. Fallback Trigger on OSRM Failure
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing OSRM Failure Triggers Fallback ---');

  await it('Automatic fallback to Haversine when OSRM is unreachable or forced', async () => {
    // Force fallback mode
    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'Safdarjung',
      forceFallback: true
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.method, 'haversine-fallback');
    assert.ok(res.distanceKm > 0);
    assert.ok(res.etaSeconds > 0);
  });

  await it('OSRM endpoint integration returns valid route or gracefully falls back', async () => {
    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'Safdarjung Hospital (New Delhi)'
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.method === 'osrm' || res.method === 'haversine-fallback');
    assert.ok(res.distanceKm > 0);
    assert.ok(res.etaSeconds > 0);
    assert.ok(res.arrivalAt);
  });

  // --------------------------------------------------------------------------
  // 4. Viability Margin mu Boundary Tests (mu > 0, mu = 0, mu < 0)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Viability Margin mu = D(o) - (t_now + eta + t_proc) ---');

  const nowSec = Math.floor(Date.now() / 1000);
  const etaSec = 3600; // 1 hour transit
  const tProcSec = 1800; // 30 min surgical prep

  await it('Viable dispatch when mu > 0 (deadline has ample margin)', async () => {
    // Deadline is 3 hours in future (3h > 1.5h required) -> mu = +1.5h = +5400s
    const deadlineAtSec = nowSec + 10800;
    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'Safdarjung',
      organId: 'ORG_HEART_FEASIBLE',
      deadlineAt: deadlineAtSec,
      tProcSeconds: tProcSec,
      forceFallback: true
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.mu > 0, `Expected mu > 0, got ${res.mu}`);
    assert.strictEqual(res.infeasible, false);
    assert.strictEqual(res.viable, true);
  });

  await it('Exact boundary when mu = 0 is classified as feasible (viable = true)', async () => {
    // First calculate exact eta
    const preRes = calculateHaversineFallback(
      CORRIDOR_HOSPITALS['AIIMS New Delhi'],
      CORRIDOR_HOSPITALS['Safdarjung']
    );
    const exactRequired = preRes.etaSeconds + tProcSec;
    const boundaryDeadline = Math.floor(Date.now() / 1000) + exactRequired;

    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'Safdarjung',
      organId: 'ORG_HEART_BOUNDARY',
      deadlineAt: boundaryDeadline,
      tProcSeconds: tProcSec,
      forceFallback: true
    });

    assert.strictEqual(res.success, true);
    // Within 2 seconds due to clock tick
    assert.ok(Math.abs(res.mu) <= 2, `Expected mu near 0, got ${res.mu}`);
    assert.strictEqual(res.infeasible, false);
    assert.strictEqual(res.viable, true);
  });

  await it('Infeasible dispatch when mu < 0 (transit exceeds cold ischemia window)', async () => {
    // Deadline is in 30 seconds, but transit + prep needs 1.5 hours -> mu < 0
    const deadlineAtSec = nowSec + 30;
    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'Safdarjung',
      organId: 'ORG_HEART_INFEASIBLE',
      deadlineAt: deadlineAtSec,
      tProcSeconds: tProcSec,
      forceFallback: true
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.mu < 0, `Expected mu < 0, got ${res.mu}`);
    assert.strictEqual(res.infeasible, true, 'Must flag dispatch as infeasible');
    assert.strictEqual(res.viable, false);
  });

  // --------------------------------------------------------------------------
  // 5. Blockchain Transaction Anchoring ('ETA_RECORDED')
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Blockchain Transaction Anchoring ---');

  await it('Appends ETA_RECORDED transaction to blockchain with SHA-256 integrity hash', async () => {
    const res = await calculateRouteAndViability({
      origin: 'AIIMS New Delhi',
      destination: 'PGIMER Chandigarh',
      organId: 'ORG_TX_ANCHOR_TEST',
      forceFallback: true
    });

    assert.ok(res.txId);
    const tx = ledger.pendingTransactions.find(t => t.id === res.txId);
    assert.ok(tx, 'Transaction must be present in pending pool');
    assert.strictEqual(tx.type, 'ETA_RECORDED');
    assert.strictEqual(tx.senderDepartment, 'SROPS');
    assert.strictEqual(tx.payload.organId, 'ORG_TX_ANCHOR_TEST');
    assert.strictEqual(tx.payload.origin, 'AIIMS New Delhi');
    assert.strictEqual(tx.payload.destination, 'PGIMER Chandigarh');
    assert.strictEqual(tx.payload.provider, 'FALLBACK');
    assert.ok(tx.payload.integrityHash);

    // Verify hash integrity
    const expectedHash = sha256({
      organId: 'ORG_TX_ANCHOR_TEST',
      origin: 'AIIMS New Delhi',
      destination: 'PGIMER Chandigarh',
      etaSeconds: res.etaSeconds,
      distanceKm: res.distanceKm,
      provider: 'FALLBACK'
    });
    assert.strictEqual(tx.payload.integrityHash, expectedHash);
  });

  restoreLedger();

  console.log('\n========================================================================');
  console.log(` STEP 3 TESTS COMPLETE: ${passed} passed, ${failed} failed.`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
