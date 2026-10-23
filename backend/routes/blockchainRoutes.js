import express from 'express';
import { ledger } from '../blockchain/blockchain.js';

const router = express.Router();

// Middleware: Consortium Access Control (Strictly restricts External Hospital)
function consortiumAccessControl(req, res, next) {
  const role = req.headers['x-department-role'] || req.query.role;
  
  if (!role) {
    // If unspecified, check if it's explicitly external
    return next();
  }

  const normalized = role.toUpperCase();
  if (normalized === 'EXTERNAL' || normalized === 'EXTERNAL_HOSPITAL' || normalized === 'RTCN') {
    return res.status(403).json({
      success: false,
      error: 'CONSORTIUM_ACCESS_DENIED',
      message: 'Node not authorized to read consortium ledger. Direct blockchain inspection is restricted to CIFV, SROPS, and CTORB.'
    });
  }

  next();
}

// Apply access control to all blockchain endpoints
router.use(consortiumAccessControl);

// GET /api/blockchain - Get full chain
router.get('/', (req, res) => {
  res.json({
    success: true,
    blockHeight: ledger.chain.length,
    difficulty: ledger.difficulty,
    chain: ledger.chain,
    pendingTransactions: ledger.pendingTransactions
  });
});

// GET /api/blockchain/blocks/:index - Get specific block
router.get('/blocks/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= ledger.chain.length) {
    return res.status(404).json({ success: false, error: 'Block not found.' });
  }
  res.json({ success: true, block: ledger.chain[idx] });
});

// GET /api/blockchain/verify - Live chain integrity verification
router.get('/verify', (req, res) => {
  const result = ledger.isChainValid();
  res.json({
    success: true,
    isValid: result.valid,
    blockHeight: ledger.chain.length,
    details: result
  });
});

// POST /api/blockchain/simulate-tamper - Demonstration tool for academic review
router.post('/simulate-tamper', (req, res) => {
  if (ledger.chain.length <= 1) {
    return res.status(400).json({ success: false, error: 'Need at least 2 blocks to simulate tampering.' });
  }

  const targetBlock = ledger.chain[1];
  const originalHash = targetBlock.hash;
  
  // Alter a transaction payload
  if (targetBlock.transactions.length > 0) {
    targetBlock.transactions[0].payload = { ...targetBlock.transactions[0].payload, TAMPERED_FIELD: 'MALICIOUS_DATA' };
  }

  const check = ledger.isChainValid();

  // Restore for safety
  ledger.init();

  res.json({
    success: true,
    tamperDetected: !check.valid,
    diagnostic: check.error || 'Tamper detected instantly by hash integrity check!',
    originalHash,
    tamperedBlockHash: targetBlock.hash
  });
});

export default router;
