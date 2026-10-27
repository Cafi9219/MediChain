import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ledger } from '../blockchain/blockchain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = __dirname;

const CADAVERS_FILE = path.join(DATA_DIR, 'cadavers.json');
const ORGANS_FILE = path.join(DATA_DIR, 'organs.json');

/**
 * Atomic write helper: writes data to .tmp file, then atomically renames to target file.
 * Handles Windows / OneDrive filesystem locks by unlinking target or copying if rename is blocked.
 * Automatically creates a .bak backup before writing if a backup doesn't already exist.
 */
export function atomicWriteJson(targetPath, data) {
  try {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create a .bak backup if target file exists and backup does not
    const bakPath = targetPath + '.bak';
    if (fs.existsSync(targetPath) && !fs.existsSync(bakPath)) {
      try {
        fs.copyFileSync(targetPath, bakPath);
      } catch (bakErr) {
        console.warn(`[PERSISTENCE_WARNING] Could not create backup at ${bakPath}:`, bakErr.message);
      }
    }

    const tmpPath = targetPath + '.tmp';
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');

    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      fs.renameSync(tmpPath, targetPath);
    } catch (renameErr) {
      // Windows / OneDrive EPERM fallback: copy and unlink temp file
      fs.copyFileSync(tmpPath, targetPath);
      if (fs.existsSync(tmpPath)) {
        try { fs.unlinkSync(tmpPath); } catch {}
      }
    }
  } catch (err) {
    console.error(`[PERSISTENCE_ERROR] Failed atomic write to ${targetPath}:`, err.message);
    throw err;
  }
}

/**
 * Load JSON data safely; returns null if file doesn't exist or is invalid.
 */
export function loadJsonSafe(targetPath) {
  if (!fs.existsSync(targetPath)) return null;
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[PERSISTENCE_WARNING] Could not parse JSON from ${targetPath}:`, err.message);
    return null;
  }
}

/**
 * Verify ledger hash-chain integrity on startup and validate
 * that persisted records match committed block hashes.
 */
export function verifyStartupLedgerConsistency(cadaverRecords = [], organReports = []) {
  const chainValidation = ledger.isChainValid();
  if (!chainValidation.valid) {
    console.warn(`[PERSISTENCE_INTEGRITY_WARNING] Blockchain integrity validation failed on startup: ${chainValidation.error}`);
  } else {
    console.log(`[CONSORTIUM_LEDGER] Blockchain hash-chain verified (Height: #${chainValidation.blockHeight}).`);
  }

  // Cross-reference committed blocks with records
  const committedHashes = new Set();
  for (const block of ledger.chain) {
    for (const tx of block.transactions) {
      if (tx.payload) {
        if (tx.payload.recordHash) committedHashes.add(tx.payload.recordHash);
        if (tx.payload.reportHash) committedHashes.add(tx.payload.reportHash);
        if (tx.payload.hexId) committedHashes.add(tx.payload.hexId);
        if (tx.payload.reportId) committedHashes.add(tx.payload.reportId);
      }
    }
  }

  for (const c of cadaverRecords) {
    if (c.status === 'VERIFIED_FOR_EXTRACTION' && !committedHashes.has(c.hexId) && !committedHashes.has(c.blockchainHash)) {
      console.warn(`[PERSISTENCE_WARNING] Cadaver ${c.hexId} is marked VERIFIED_FOR_EXTRACTION but not found in committed ledger blocks.`);
    }
  }

  for (const r of organReports) {
    if (r.status === 'CERTIFIED_HARVEST' && !committedHashes.has(r.reportId) && !committedHashes.has(r.reportHash)) {
      console.warn(`[PERSISTENCE_WARNING] Harvest report ${r.reportId} is marked CERTIFIED_HARVEST but not found in committed ledger blocks.`);
    }
  }
}

/**
 * Initialize and load cadavers. If persisted file exists, loads from file.
 * Otherwise seeds from initial array and persists it.
 */
export function initCadaverPersistence(seedCadavers) {
  const saved = loadJsonSafe(CADAVERS_FILE);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  // Initial save of seed data
  atomicWriteJson(CADAVERS_FILE, seedCadavers);
  return seedCadavers;
}

/**
 * Save cadavers atomically on state change
 */
export function saveCadavers(cadaverRecords) {
  atomicWriteJson(CADAVERS_FILE, cadaverRecords);
}

/**
 * Initialize and load organ harvest reports. If persisted file exists, loads from file.
 * Otherwise seeds from initial array and persists it.
 */
export function initOrganPersistence(seedReports) {
  const saved = loadJsonSafe(ORGANS_FILE);
  if (saved && Array.isArray(saved) && saved.length > 0) {
    return saved;
  }
  // Initial save of seed data
  atomicWriteJson(ORGANS_FILE, seedReports);
  return seedReports;
}

/**
 * Save organ harvest reports atomically on state change
 */
export function saveOrgans(harvestReports) {
  atomicWriteJson(ORGANS_FILE, harvestReports);
}
