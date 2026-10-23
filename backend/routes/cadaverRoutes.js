import express from 'express';
import crypto from 'crypto';
import { ledger } from '../blockchain/blockchain.js';
import { Transaction } from '../blockchain/transaction.js';
import { sha256, generateDoctorSignature } from '../blockchain/cryptoUtils.js';
import { CONSORTIUM_CREDENTIALS } from '../data/doctors.js';

const router = express.Router();

// In-memory store for pending/processed cadavers
// (Initialized with some realistic sample records for presentation)
let cadaverRegistry = [
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
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        doctorId: 'CIFV-DOC-102',
        doctorName: 'Dr. Ananya Iyer',
        role: 'Senior Medical Examiner',
        regNumber: 'MCI-ME-73215',
        signatureHash: '0x3c7e1f9a2b4d6e801a5f7c9b0e2d4a6f',
        publicKey: 'PK_CIFV_73215_IYER',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    blockchainHash: 'e4f1b8a9c2d7e0f3b5a1c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8'
  }
];

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
      bodyCondition: data.bodyCondition,
      deathDate: data.deathDate,
      deathTime: data.deathTime,
      arrivalDate: data.arrivalDate,
      arrivalTime: data.arrivalTime,
      otherMedicalTerms: data.otherMedicalTerms || '',
      
      // Biometric fields
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

      // Physical identifiers
      bloodGroup: data.bloodGroup,
      hairColor: data.hairColor,
      skinColor: data.skinColor,
      identificationMarks: data.identificationMarks || 'NA',

      // Consent & Legal
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
      status: 'PENDING_INSPECTION_SIGNATURES', // 'PENDING_INSPECTION_SIGNATURES' -> 'VERIFIED_FOR_EXTRACTION'
      signatures: [], // [{ doctorId, doctorName, signatureHash, timestamp }]
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
    const { doctorId, pin } = req.body;
    const cadaver = cadaverRegistry.find(c => c.hexId.toUpperCase() === req.params.hexId.toUpperCase());

    if (!cadaver) {
      return res.status(404).json({ success: false, error: 'Cadaver record not found.' });
    }

    // Verify Doctor belongs to CIFV department
    const doctor = CONSORTIUM_CREDENTIALS.personnel.find(
      d => d.id.toUpperCase() === (doctorId || '').trim().toUpperCase() && d.department === 'CIFV'
    );

    if (!doctor) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Doctor must be registered with CIFV Department.' });
    }

    if (doctor.pin !== pin) {
      return res.status(401).json({ success: false, error: 'Invalid Doctor Security PIN.' });
    }

    // Check if already signed by this doctor
    if (cadaver.signatures.some(s => s.doctorId === doctor.id)) {
      return res.status(400).json({ success: false, error: `Dr. ${doctor.name} has already signed this cadaver intake report.` });
    }

    // Generate cryptographic digital signature
    const sig = generateDoctorSignature(doctor.id, doctor.name, cadaver.blockchainHash);
    cadaver.signatures.push({
      doctorId: doctor.id,
      doctorName: doctor.name,
      role: doctor.role,
      regNumber: doctor.regNumber,
      signatureHash: sig.signatureHash,
      publicKey: sig.publicKey,
      timestamp: sig.timestamp
    });

    // Check 2-of-3 threshold
    let blockMined = null;
    if (cadaver.signatures.length >= 2 && cadaver.status === 'PENDING_INSPECTION_SIGNATURES') {
      cadaver.status = 'VERIFIED_FOR_EXTRACTION';

      // Create on-chain transaction & mine block
      const verifyTx = new Transaction({
        type: 'CADAVER_VERIFIED_BLOCK',
        payload: {
          hexId: cadaver.hexId,
          patientName: cadaver.patientName,
          bloodGroup: cadaver.bloodGroup,
          status: 'VERIFIED_FOR_EXTRACTION',
          signingDoctors: cadaver.signatures.map(s => `${s.doctorName} (${s.doctorId})`),
          digitalSignatures: cadaver.signatures.map(s => s.signatureHash),
          recordHash: cadaver.blockchainHash
        },
        senderDepartment: 'CIFV',
        submittedBy: doctor.name,
        signatures: cadaver.signatures
      });

      ledger.addTransaction(verifyTx);
      blockMined = ledger.minePendingTransactions('CIFV_CONSORTIUM_NODE');
    }

    res.json({
      success: true,
      message: `Digital signature registered successfully for Dr. ${doctor.name}. Current signatures: ${cadaver.signatures.length}/3.`,
      signaturesCount: cadaver.signatures.length,
      status: cadaver.status,
      isFullyVerified: cadaver.status === 'VERIFIED_FOR_EXTRACTION',
      blockMined: blockMined ? { index: blockMined.index, hash: blockMined.hash } : null,
      cadaver
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
