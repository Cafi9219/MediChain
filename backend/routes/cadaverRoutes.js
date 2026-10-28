import express from 'express';
import crypto from 'crypto';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { sha256 } from '../blockchain/cryptoUtils.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';
import { verifyDoctorPinSecure } from '../security/authSecurity.js';
import { initCadaverPersistence, saveCadavers } from '../data/persistence.js';
import { processThresholdApproval } from '../security/thresholdApproval.js';

const router = express.Router();

// Seed record for initial deployment / presentation
const seedCadaverRecords = [
  {
    hexId: '0x4F8B7A92',
    patientName: 'Kishore Varma',
    age: 38,
    gender: 'Male',
    causeOfDeath: 'Traumatic Brain Injury following RTA (Brain Stem Death Certified)',
    bodyCondition: 'Cold storage mortuary (4°C), Intact, No sepsis',
    deathDate: new Date(Date.now() - 3600000 * 5).toISOString().split('T')[0],
    deathTime: '06:15',
    arrivalDate: new Date().toISOString().split('T')[0],
    arrivalTime: '07:30',
    otherMedicalTerms: 'GCS 3/15, Apnea Test Positive, Isoelectric EEG',
    faceImage: null,
    fingerprint: {
      isDamaged: false,
      damageDetails: '',
      image: null
    },
    retina: {
      isDamaged: false,
      damageDetails: '',
      image: null
    },
    bloodGroup: 'O+',
    hairColor: 'Black',
    skinColor: 'Wheatish',
    identificationMarks: 'Scar on right knee (2cm)',
    familyConsent: {
      hasFamily: true,
      nokName: 'Smt. Priya Varma',
      nokRelation: 'Spouse',
      nokContact: '+91 98412 34567',
      consentSignature: 'DATA_SIG_CONFIRMED',
      thumbprint: 'DATA_THUMB_CONFIRMED',
      unclaimedDetails: ''
    },
    verifyingDoctorsCount: 2,
    verifyingDoctorNames: 'Dr. Rajesh Sharma (CIFV-DOC-101), Dr. Ananya Iyer (CIFV-DOC-102)',
    isAppropriateForHarvesting: true,
    harvestAppropriatenessNotes: 'Normotensive donor, optimal renal and hepatic perfusion parameters.',
    isContaminatedDisease: false,
    diseaseChecklist: ['HIV Negative', 'HBsAg Negative', 'HCV Negative', 'VDRL Non-reactive'],
    additionalObservations: 'Heart and bilateral kidneys cleared for immediate surgical retrieval.',
    status: 'VERIFIED_FOR_EXTRACTION',
    signatures: [
      {
        doctorId: 'CIFV-DOC-101',
        doctorName: 'Dr. Rajesh Sharma',
        role: 'Forensic Pathologist',
        regNumber: 'MCI-FP-84920',
        signatureHash: '0x8a92f04e7b1c3d5a6e9f2b8c0d1e4a7f',
        publicKey: 'PK_CIFV_84920_SHARMA',
        algorithm: 'LEGACY_HMAC_SHA256',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        doctorId: 'CIFV-DOC-102',
        doctorName: 'Dr. Ananya Iyer',
        role: 'Senior Medical Examiner',
        regNumber: 'MCI-ME-73215',
        signatureHash: '0x3c7e1f9a2b4d6e801a5f7c9b0e2d4a6f',
        publicKey: 'PK_CIFV_73215_IYER',
        algorithm: 'LEGACY_HMAC_SHA256',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    blockchainHash: 'e4f1b8a9c2d7e0f3b5a1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8'
  }
];

// Persistent file-backed store for cadavers (reloads across server restarts)
let cadaverRegistry = initCadaverPersistence(seedCadaverRecords);

export function getCadaverRegistry() {
  return cadaverRegistry;
}

function generateUniqueHexId() {
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return '0x' + randomBytes;
}

// POST /api/cadavers - Submit new cadaver intake form
router.post('/', (req, res) => {
  try {
    const data = req.body;

    // Generate unique hexadecimal number for the body
    const hexId = generateUniqueHexId();

    const cadaverRecord = {
      hexId,
      patientName: data.patientName || 'Unidentified Doe',
      age: data.age,
      gender: data.gender,
      causeOfDeath: data.causeOfDeath,
      bodyCondition: data.bodyCondition || 'Cold storage, Intact',
      deathDate: data.deathDate || new Date().toISOString().split('T')[0],
      deathTime: data.deathTime || '00:00',
      arrivalDate: data.arrivalDate || new Date().toISOString().split('T')[0],
      arrivalTime: data.arrivalTime || '00:00',
      otherMedicalTerms: data.otherMedicalTerms || '',

      // Multimodal Biometrics
      faceImage: data.faceImage || null,
      fingerprint: {
        isDamaged: Boolean(data.fingerprintDamaged),
        damageDetails: data.fingerprintDamageDetails || '',
        image: data.fingerprintImage || null
      },
      retina: {
        isDamaged: Boolean(data.retinaDamaged),
        damageDetails: data.retinaDamageDetails || '',
        image: data.retinaImage || null
      },

      // Physical Forensic Checklist
      bloodGroup: data.bloodGroup || 'Unknown',
      hairColor: data.hairColor || '',
      skinColor: data.skinColor || '',
      identificationMarks: data.identificationMarks || '',

      // Legal & Family Consent
      familyConsent: {
        hasFamily: Boolean(data.hasFamily),
        nokName: data.nokName || '',
        nokRelation: data.nokRelation || '',
        nokContact: data.nokContact || '',
        consentSignature: data.nokConsentSignature || null,
        thumbprint: data.nokThumbprint || null,
        unclaimedDetails: data.unclaimedDetails || ''
      },

      // Medical Viability
      verifyingDoctorsCount: data.verifyingDoctorsCount || 2,
      verifyingDoctorNames: data.verifyingDoctorNames || '',
      isAppropriateForHarvesting: data.isAppropriateForHarvesting !== false,
      harvestAppropriatenessNotes: data.harvestAppropriatenessNotes || '',
      isContaminatedDisease: Boolean(data.isContaminatedDisease),
      diseaseChecklist: data.diseaseChecklist || [],
      additionalObservations: data.additionalObservations || '',

      // Status & Multi-Sig (2 of 3 rule)
      status: 'PENDING_INSPECTION_SIGNATURES',
      signatures: [],
      createdAt: new Date().toISOString(),
      blockchainHash: null
    };

    // Calculate initial integrity hash
    cadaverRecord.blockchainHash = sha256({
      hexId: cadaverRecord.hexId,
      patientName: cadaverRecord.patientName,
      causeOfDeath: cadaverRecord.causeOfDeath,
      deathDate: cadaverRecord.deathDate,
      bloodGroup: cadaverRecord.bloodGroup,
      createdAt: cadaverRecord.createdAt
    });

    // Record initial intake transaction on blockchain pending pool
    const tx = new Transaction({
      type: 'CADAVER_INTAKE_DRAFT',
      payload: {
        hexId: cadaverRecord.hexId,
        patientName: cadaverRecord.patientName,
        bloodGroup: cadaverRecord.bloodGroup,
        causeOfDeath: cadaverRecord.causeOfDeath,
        status: cadaverRecord.status,
        recordHash: cadaverRecord.blockchainHash
      },
      senderDepartment: 'CIFV',
      submittedBy: req.body.submittedBy || 'CIFV_OFFICER'
    });

    ledger.addTransaction(tx);
    cadaverRegistry.unshift(cadaverRecord);
    saveCadavers(cadaverRegistry);

    res.status(201).json({
      success: true,
      message: `Cadaver registered successfully with Unique Hex ID: ${hexId}. Pending 2-of-3 medical signatures.`,
      cadaver: cadaverRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cadavers - List all registered cadavers
router.get('/', (req, res) => {
  const { status } = req.query;
  let list = cadaverRegistry;
  if (status) {
    list = list.filter(c => c.status === status);
  }
  res.json({ success: true, count: list.length, cadavers: list });
});

// GET /api/cadavers/:hexId - Get specific cadaver dossier
router.get('/:hexId', (req, res) => {
  const c = cadaverRegistry.find(item => item.hexId.toUpperCase() === req.params.hexId.toUpperCase());
  if (!c) {
    return res.status(404).json({ success: false, error: 'Cadaver Hex ID not found.' });
  }
  res.json({ success: true, cadaver: c });
});

// POST /api/cadavers/:hexId/sign - Doctor Digital Signature (2 of 3 rule)
router.post('/:hexId/sign', (req, res) => {
  try {
    const { doctorId, pin, signature, nonce } = req.body;
    const cadaver = cadaverRegistry.find(c => c.hexId.toUpperCase() === req.params.hexId.toUpperCase());

    if (!cadaver) {
      return res.status(404).json({ success: false, error: 'Cadaver record not found.' });
    }

    const payloadBuilder = () => ({
      hexId: cadaver.hexId,
      patientName: cadaver.patientName,
      causeOfDeath: cadaver.causeOfDeath,
      deathDate: cadaver.deathDate,
      bloodGroup: cadaver.bloodGroup,
      createdAt: cadaver.createdAt
    });

    const result = processThresholdApproval({
      record: cadaver,
      recordId: cadaver.hexId,
      doctorId,
      pin,
      providedSignature: signature || null,
      providedNonce: nonce || null,
      dept: 'CIFV',
      milestoneType: 'CADAVER_VERIFIED_BLOCK',
      payloadToSign: payloadBuilder(),
      getLatestPayloadToCommit: payloadBuilder,
      targetVerifiedStatus: 'VERIFIED_FOR_EXTRACTION',
      validatorNode: 'CIFV_CONSORTIUM_NODE',
      k: 2
    });

    if (!result.success) {
      return res.status(result.status || 400).json({ success: false, error: result.error });
    }

    // Persist changes to disk atomically
    saveCadavers(cadaverRegistry);

    res.json({
      success: true,
      message: result.message,
      signaturesCount: result.signaturesCount,
      status: result.status,
      isFullyVerified: result.isFullyVerified,
      blockMined: result.blockMined,
      cadaver
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
