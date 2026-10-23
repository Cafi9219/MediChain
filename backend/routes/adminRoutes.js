import express from 'express';
import { ledger } from '../blockchain/blockchain.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

const router = express.Router();

// GET /api/admin/overview - Complete dashboard metrics
router.get('/overview', (req, res) => {
  // Aggregate stats from ledger transactions
  let totalIntakes = 0;
  let totalVerified = 0;
  let totalHarvests = 0;
  let organDistribution = {
    'Heart': 0,
    'Eye / Cornea': 0,
    'Liver': 0,
    'Kidney': 0,
    'Lung': 0,
    'Pancreas': 0,
    'Other': 0
  };

  const auditEvents = [];

  for (const block of ledger.chain) {
    for (const tx of block.transactions) {
      auditEvents.push({
        blockIndex: block.index,
        blockHash: block.hash,
        txId: tx.id,
        type: tx.type,
        sender: tx.senderDepartment,
        submittedBy: tx.submittedBy,
        timestamp: tx.timestamp,
        signaturesCount: tx.signatures ? tx.signatures.length : 0
      });

      if (tx.type === 'CADAVER_INTAKE_DRAFT') totalIntakes++;
      if (tx.type === 'CADAVER_VERIFIED_BLOCK') totalVerified++;
      if (tx.type === 'ORGAN_HARVEST_CERTIFIED_BLOCK') {
        totalHarvests++;
        if (tx.payload && Array.isArray(tx.payload.organTokens)) {
          for (const tok of tx.payload.organTokens) {
            if (tok.includes('Heart')) organDistribution['Heart']++;
            else if (tok.includes('Eye') || tok.includes('Cornea')) organDistribution['Eye / Cornea']++;
            else if (tok.includes('Liver')) organDistribution['Liver']++;
            else if (tok.includes('Kidney')) organDistribution['Kidney']++;
            else if (tok.includes('Lung')) organDistribution['Lung']++;
            else if (tok.includes('Pancreas')) organDistribution['Pancreas']++;
            else organDistribution['Other']++;
          }
        }
      }
    }
  }

  const totalOrgansCount = Object.values(organDistribution).reduce((a, b) => a + b, 0);

  res.json({
    success: true,
    stats: {
      blockHeight: ledger.chain.length,
      totalIntakes,
      totalVerified,
      totalHarvests,
      totalOrgansCount,
      organDistribution,
      totalCertifiedPersonnel: CONSORTIUM_CREDENTIALS.personnel.length,
      consortiumNodes: ['CIFV_WING', 'SROPS_SUITE', 'CTORB_ADMIN', 'RTCN_RESTRICTED']
    },
    personnel: CONSORTIUM_CREDENTIALS.personnel,
    recentAuditLogs: auditEvents.reverse().slice(0, 20)
  });
});

export default router;
