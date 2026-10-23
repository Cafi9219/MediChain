import express from 'express';
import crypto from 'crypto';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { sha256, generateDoctorSignature } from '../blockchain/cryptoUtils.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

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

// In-memory store for organ harvest reports
let harvestReports = [
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
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        doctorId: 'SROPS-SUR-202',
        doctorName: 'Dr. Neha Deshmukh',
        role: 'Organ Retrieval Specialist',
        regNumber: 'MCI-RS-83192',
        signatureHash: '0x2a8f0d4b6e1c9a7f3e5d0b2c8a4f6e1d',
        publicKey: 'PK_SROPS_83192_DESHMUKH',
        timestamp: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reportHash: 'b7c2d9e4f1a8c0e3b5d1a9f8e7c6b5a4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8'
  }
];

// Helper to generate organ ID based on user specification:
// First 4 digits: last 4 digits of patient's Hex ID
// Middle 2 digits: organ code (01 for heart, 02 for eye, etc.)
// Last 4 digits: random numbers
export function generateOrganId(cadaverHexId, organName) {
  // Strip '0x' if present and get last 4 characters
  const cleanHex = (cadaverHexId || '').replace(/^0x/i, '');
  const lastFourHex = cleanHex.slice(-4).toUpperCase() || 'XXXX';
  
  const code = ORGAN_CODES[organName] || '99';
  const randomFour = Math.floor(1000 + Math.random() * 9000).toString();

  return `${lastFourHex}-${code}-${randomFour}`;
}

// POST /api/organs/harvest - Submit organ extraction report
router.post('/harvest', (req, res) => {
  try {
    const data = req.body;

    if (!data.cadaverHexId) {
      return res.status(400).json({ success: false, error: 'Cadaver Hex ID is required.' });
    }

    const totalCount = parseInt(data.totalOrgansExtracted, 10) || 1;
    const rawOrgans = Array.isArray(data.organs) ? data.organs : [];

    // Format each organ according to the algorithmic ID formula
    const formattedOrgans = rawOrgans.slice(0, totalCount).map((org, idx) => {
      const organName = org.organName || 'Unspecified Organ';
      const autoOrganId = generateOrganId(data.cadaverHexId, organName);

      return {
        slotNumber: idx + 1,
        organId: autoOrganId,
        organName: organName,
        organCode: ORGAN_CODES[organName] || '00',
        condition: org.condition || 'Viable - Grade A',
        extractionDate: org.extractionDate || new Date().toISOString().split('T')[0],
        extractionTime: org.extractionTime || '12:00',
        preservationSolution: org.preservationSolution || 'University of Wisconsin (UW) Solution',
        storageTemperature: org.storageTemperature || '4°C (Static Cold Storage)',
        qaImage: org.qaImage || null,
        qaNotes: org.qaNotes || 'Organ cleared for transplantation. Perfusion intact.'
      };
    });

    const reportId = 'HARVEST_' + Date.now().toString(16).toUpperCase();

    const report = {
      reportId,
      cadaverHexId: data.cadaverHexId,
      patientName: data.patientName || 'Verified Donor',
      arrivalDateAtExtraction: data.arrivalDateAtExtraction || '',
      arrivalTimeAtExtraction: data.arrivalTimeAtExtraction || '',
      totalOrgansExtracted: formattedOrgans.length,
      organs: formattedOrgans,
      operatingSurgeonsCount: data.operatingSurgeonsCount || 3,
      operatingSurgeonsList: data.operatingSurgeonsList || 'Dr. Sunil Kulkarni, Dr. Neha Deshmukh',
      notes: data.notes || '',
      status: 'PENDING_SURGICAL_SIGNATURES', // 'PENDING_SURGICAL_SIGNATURES' -> 'CERTIFIED_HARVEST'
      signatures: [], // [{ doctorId, doctorName, signatureHash, timestamp }]
      createdAt: new Date().toISOString(),
      reportHash: null
    };

    report.reportHash = sha256({
      reportId: report.reportId,
      cadaverHexId: report.cadaverHexId,
      totalOrgans: report.totalOrgansExtracted,
      organs: report.organs.map(o => o.organId),
      createdAt: report.createdAt
    });

    // Add initial transaction to pending blockchain pool
    const harvestTx = new Transaction({
      type: 'ORGAN_EXTRACTION_RECORDED',
      payload: {
        reportId: report.reportId,
        cadaverHexId: report.cadaverHexId,
        organsHarvested: report.organs.map(o => ({ id: o.organId, name: o.organName })),
        reportHash: report.reportHash,
        status: report.status
      },
      senderDepartment: 'SROPS',
      submittedBy: req.body.submittedBy || 'SROPS_CHIEF_SURGEON'
    });

    ledger.addTransaction(harvestTx);
    harvestReports.unshift(report);

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
    const { doctorId, pin } = req.body;
    const report = harvestReports.find(r => r.reportId === req.params.reportId);

    if (!report) {
      return res.status(404).json({ success: false, error: 'Harvest report not found.' });
    }

    // Verify Surgeon belongs to SROPS department
    const surgeon = CONSORTIUM_CREDENTIALS.personnel.find(
      d => d.id.toUpperCase() === (doctorId || '').trim().toUpperCase() && d.department === 'SROPS'
    );

    if (!surgeon) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Surgeon must be registered with SROPS Department.' });
    }

    if (surgeon.pin !== pin) {
      return res.status(401).json({ success: false, error: 'Invalid Surgeon Security PIN.' });
    }

    if (report.signatures.some(s => s.doctorId === surgeon.id)) {
      return res.status(400).json({ success: false, error: `Dr. ${surgeon.name} has already signed this harvest report.` });
    }

    // Generate cryptographic signature
    const sig = generateDoctorSignature(surgeon.id, surgeon.name, report.reportHash);
    report.signatures.push({
      doctorId: surgeon.id,
      doctorName: surgeon.name,
      role: surgeon.role,
      regNumber: surgeon.regNumber,
      signatureHash: sig.signatureHash,
      publicKey: sig.publicKey,
      timestamp: sig.timestamp
    });

    // Check 2-of-3 threshold
    let blockMined = null;
    if (report.signatures.length >= 2 && report.status === 'PENDING_SURGICAL_SIGNATURES') {
      report.status = 'CERTIFIED_HARVEST';

      // Create certified harvest transaction on blockchain
      const certTx = new Transaction({
        type: 'ORGAN_HARVEST_CERTIFIED_BLOCK',
        payload: {
          reportId: report.reportId,
          cadaverHexId: report.cadaverHexId,
          organsExtractedCount: report.totalOrgansExtracted,
          organTokens: report.organs.map(o => `${o.organName} [${o.organId}]`),
          status: 'CERTIFIED_HARVEST',
          signingSurgeons: report.signatures.map(s => `${s.doctorName} (${s.doctorId})`),
          digitalSignatures: report.signatures.map(s => s.signatureHash),
          reportHash: report.reportHash
        },
        senderDepartment: 'SROPS',
        submittedBy: surgeon.name,
        signatures: report.signatures
      });

      ledger.addTransaction(certTx);
      blockMined = ledger.minePendingTransactions('SROPS_SURGICAL_CONSORTIUM_NODE');
    }

    res.json({
      success: true,
      message: `Surgeon signature registered for Dr. ${surgeon.name}. Current signatures: ${report.signatures.length}/3.`,
      signaturesCount: report.signatures.length,
      status: report.status,
      isFullyCertified: report.status === 'CERTIFIED_HARVEST',
      blockMined: blockMined ? { index: blockMined.index, hash: blockMined.hash } : null,
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
