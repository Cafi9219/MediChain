import express from 'express';
import crypto from 'crypto';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { sha256 } from '../blockchain/cryptoUtils.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';
import { verifyDoctorPinSecure } from '../security/authSecurity.js';
import { initOrganPersistence, saveOrgans } from '../data/persistence.js';
import { processThresholdApproval } from '../security/thresholdApproval.js';

const router = express.Router();

// Organ codes map
export const ORGAN_CODES = {
  'Heart': '01',
  'Eye / Cornea': '02',
  'Liver': '03',
  'Left Kidney': '04',
  'Right Kidney': '05',
  'Lung': '06',
  'Pancreas': '07',
  'Small Bowel / Intestine': '08'
};

// Seed harvest report for initial deployment
const seedHarvestReports = [
  {
    reportId: 'HARVEST_0X4F8B7A92',
    cadaverHexId: '0x4F8B7A92',
    patientName: 'Kishore Varma',
    arrivalDateAtExtraction: new Date().toISOString().split('T')[0],
    arrivalTimeAtExtraction: '09:00',
    totalOrgansExtracted: 3,
    organs: [
      {
        slotNumber: 1,
        organId: '7A92-01-4821',
        organName: 'Heart',
        organCode: '01',
        condition: 'Viable - Grade A (Optimal)',
        extractionDate: new Date().toISOString().split('T')[0],
        extractionTime: '09:45',
        preservationSolution: 'University of Wisconsin (UW) Solution',
        storageTemperature: '4°C (Static Cold Storage)',
        qaImage: null,
        qaNotes: 'Perfusion flush clear, warm ischemia time < 12 mins.'
      },
      {
        slotNumber: 2,
        organId: '7A92-04-9104',
        organName: 'Left Kidney',
        organCode: '04',
        condition: 'Viable - Grade A (Optimal)',
        extractionDate: new Date().toISOString().split('T')[0],
        extractionTime: '10:15',
        preservationSolution: 'Custodiol HTK Solution',
        storageTemperature: '4°C (Hypothermic Machine Perfusion)',
        qaImage: null,
        qaNotes: 'Renal artery anatomy single and clear. Cold flush excellent.'
      },
      {
        slotNumber: 3,
        organId: '7A92-02-3580',
        organName: 'Eye / Cornea',
        organCode: '02',
        condition: 'Viable - Grade A (Optimal)',
        extractionDate: new Date().toISOString().split('T')[0],
        extractionTime: '10:30',
        preservationSolution: 'Optisol-GS Corneal Medium',
        storageTemperature: '4°C (Static Cold Storage)',
        qaImage: null,
        qaNotes: 'Corneal endothelium intact, clarity Grade 1.'
      }
    ],
    operatingSurgeonsCount: 3,
    operatingSurgeonsList: 'Dr. Sunil Kulkarni (SROPS-SUR-201), Dr. Neha Deshmukh (SROPS-SUR-202)',
    notes: 'Multi-organ retrieval completed under sterile protocol. Cold chain initialized.',
    status: 'CERTIFIED_HARVEST',
    signatures: [
      {
        doctorId: 'SROPS-SUR-201',
        doctorName: 'Dr. Sunil Kulkarni',
        role: 'Lead Transplant Surgeon',
        regNumber: 'MCI-TS-91204',
        signatureHash: '0x91d4e7a2b0c3f5e8a1d7c9b2e0f4a6d8',
        publicKey: 'PK_SROPS_91204_KULKARNI',
        algorithm: 'LEGACY_HMAC_SHA256',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        doctorId: 'SROPS-SUR-202',
        doctorName: 'Dr. Neha Deshmukh',
        role: 'Organ Retrieval Specialist',
        regNumber: 'MCI-RS-83192',
        signatureHash: '0x2a8f0d4b6e1c9a7f3e5d0b2c8a4f6e1d',
        publicKey: 'PK_SROPS_83192_DESHMUKH',
        algorithm: 'LEGACY_HMAC_SHA256',
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reportHash: 'b7c2d9e4f1a8c0e3b5d1a9f8e7c6b5a4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8'
  }
];

// Persistent file-backed store for harvest reports (reloads across server restarts)
let harvestReports = initOrganPersistence(seedHarvestReports);

export function getHarvestReports() {
  return harvestReports;
}

// POST /api/organs/harvest - Submit surgical extraction report
router.post('/harvest', (req, res) => {
  try {
    const data = req.body;
    const reportId = 'HARVEST_' + (data.cadaverHexId || Date.now().toString(16)).toUpperCase();

    const formattedOrgans = (data.organs || []).map((org, idx) => ({
      slotNumber: idx + 1,
      organId: org.organId || `ORG_${Date.now()}_${idx + 1}`,
      organName: org.organName,
      organCode: ORGAN_CODES[org.organName] || '99',
      condition: org.condition || 'Viable - Optimal Perfusion',
      extractionDate: org.extractionDate || new Date().toISOString().split('T')[0],
      extractionTime: org.extractionTime || '00:00',
      preservationSolution: org.preservationSolution || 'University of Wisconsin (UW) Solution',
      storageTemperature: org.storageTemperature || '4°C (Static Cold Storage)',
      qaImage: org.qaImage || null,
      qaNotes: org.qaNotes || ''
    }));

    const report = {
      reportId,
      cadaverHexId: data.cadaverHexId,
      patientName: data.patientName || 'Anonymous Donor',
      arrivalDateAtExtraction: data.arrivalDateAtExtraction || new Date().toISOString().split('T')[0],
      arrivalTimeAtExtraction: data.arrivalTimeAtExtraction || '00:00',
      totalOrgansExtracted: formattedOrgans.length,
      organs: formattedOrgans,
      operatingSurgeonsCount: data.operatingSurgeonsCount || 3,
      operatingSurgeonsList: data.operatingSurgeonsList || '',
      notes: data.notes || '',
      status: 'PENDING_SURGICAL_SIGNATURES',
      signatures: [],
      createdAt: new Date().toISOString(),
      reportHash: null
    };

    report.reportHash = sha256({
      reportId: report.reportId,
      cadaverHexId: report.cadaverHexId,
      organsCount: report.totalOrgansExtracted,
      organs: report.organs.map(o => ({ id: o.organId, name: o.organName, time: o.extractionTime })),
      createdAt: report.createdAt
    });

    const harvestTx = new Transaction({
      type: 'ORGAN_EXTRACTION_RECORDED',
      payload: {
        reportId: report.reportId,
        cadaverHexId: report.cadaverHexId,
        organsExtractedCount: report.totalOrgansExtracted,
        organsHarvested: report.organs.map(o => ({ id: o.organId, name: o.organName })),
        reportHash: report.reportHash,
        status: report.status
      },
      senderDepartment: 'SROPS',
      submittedBy: req.body.submittedBy || 'SROPS_CHIEF_SURGEON'
    });

    ledger.addTransaction(harvestTx);
    harvestReports.unshift(report);
    saveOrgans(harvestReports);

    res.status(201).json({
      success: true,
      message: `Organ harvest report logged successfully. ${formattedOrgans.length} organs processed. Pending 2-of-3 surgical signatures.`,
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/organs/reports - Get all harvest reports
router.get('/reports', (req, res) => {
  res.json({ success: true, count: harvestReports.length, reports: harvestReports });
});

// GET /api/organs/list - Flat list of all harvested organs with status
router.get('/list', (req, res) => {
  const allOrgans = [];
  for (const rep of harvestReports) {
    for (const org of rep.organs) {
      allOrgans.push({
        ...org,
        cadaverHexId: rep.cadaverHexId,
        patientName: rep.patientName,
        reportId: rep.reportId,
        harvestStatus: rep.status,
        certifiedBySignatures: rep.signatures.length
      });
    }
  }
  res.json({ success: true, count: allOrgans.length, organs: allOrgans });
});

// POST /api/organs/reports/:reportId/sign - Surgeon Digital Signature (2 of 3 rule)
router.post('/reports/:reportId/sign', (req, res) => {
  try {
    const { doctorId, pin, signature, nonce } = req.body;
    const report = harvestReports.find(r => r.reportId === req.params.reportId);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Harvest report not found.' });
    }

    const payloadBuilder = () => ({
      reportId: report.reportId,
      cadaverHexId: report.cadaverHexId,
      totalOrgansExtracted: report.totalOrgansExtracted,
      organs: (report.organs || []).map(o => ({
        organName: o.organName,
        organId: o.organId,
        condition: o.condition
      })),
      createdAt: report.createdAt
    });

    const result = processThresholdApproval({
      record: report,
      recordId: report.reportId,
      doctorId,
      pin,
      providedSignature: signature || null,
      providedNonce: nonce || null,
      dept: 'SROPS',
      milestoneType: 'ORGAN_HARVEST_CERTIFIED_BLOCK',
      payloadToSign: payloadBuilder(),
      getLatestPayloadToCommit: payloadBuilder,
      targetVerifiedStatus: 'CERTIFIED_HARVEST',
      validatorNode: 'SROPS_SURGICAL_CONSORTIUM_NODE',
      k: 2
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, error: result.error });
    }

    // Persist changes to disk atomically
    saveOrgans(harvestReports);

    res.json({
      success: true,
      message: result.message,
      signaturesCount: result.signaturesCount,
      status: result.status,
      isFullyCertified: result.isFullyVerified,
      blockMined: result.blockMined,
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
