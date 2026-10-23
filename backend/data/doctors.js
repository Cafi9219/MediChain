export const CONSORTIUM_CREDENTIALS = {
  departments: {
    CIFV: {
      id: 'DEPT_CIFV',
      name: 'Cadaveric Intake & Forensic Verification Wing (CIFV)',
      password: 'Pass@cifv2026',
      role: 'CIFV',
      badge: 'Forensic Intake',
      description: 'Cadaver registration, forensic examination, biometrics and legal consent verification'
    },
    SROPS: {
      id: 'DEPT_SROPS',
      name: 'Surgical Retrieval & Organ Preservation Suite (SROPS)',
      password: 'Pass@srops2026',
      role: 'SROPS',
      badge: 'Surgical Retrieval',
      description: 'Organ harvesting, viability assessment, cold preservation and algorithmic tracking'
    },
    ADMIN: {
      id: 'DEPT_ADMIN',
      name: 'Central Transplant Oversight Regulatory Board (CTORB)',
      password: 'Pass@admin2026',
      role: 'ADMIN',
      badge: 'Regulatory Oversight',
      description: 'Statewide audit, consortium governance, doctor registries and cryptographic verification'
    },
    EXTERNAL: {
      id: 'DEPT_EXTERNAL',
      name: 'Recipient Transplant Center Network (RTCN - External Hospital)',
      password: 'Pass@external2026',
      role: 'EXTERNAL',
      badge: 'Restricted Hospital',
      description: 'External recipient hospital portal (Phase 2 - Direct Consortium Ledger Access Prohibited)'
    }
  },

  // The 9 Certified Official Medical Personnel (3 per consortium department)
  personnel: [
    // CIFV Department (3 Doctors)
    {
      id: 'CIFV-DOC-101',
      name: 'Dr. Rajesh Sharma',
      department: 'CIFV',
      role: 'Forensic Pathologist',
      regNumber: 'MCI-FP-84920',
      pin: '1010',
      experience: '16 Years',
      hospital: 'State Institute of Forensic Sciences',
      publicKey: 'PK_CIFV_84920_SHARMA'
    },
    {
      id: 'CIFV-DOC-102',
      name: 'Dr. Ananya Iyer',
      department: 'CIFV',
      role: 'Senior Medical Examiner',
      regNumber: 'MCI-ME-73215',
      pin: '1020',
      experience: '12 Years',
      hospital: 'Dept of Forensic Medicine & Toxicology',
      publicKey: 'PK_CIFV_73215_IYER'
    },
    {
      id: 'CIFV-DOC-103',
      name: 'Dr. Vikram Malhotra',
      department: 'CIFV',
      role: 'Chief Medical Officer',
      regNumber: 'MCI-CMO-61840',
      pin: '1030',
      experience: '20 Years',
      hospital: 'State Cadaveric Procurement Wing',
      publicKey: 'PK_CIFV_61840_MALHOTRA'
    },

    // SROPS Department (3 Retrieval Surgeons)
    {
      id: 'SROPS-SUR-201',
      name: 'Dr. Sunil Kulkarni',
      department: 'SROPS',
      role: 'Lead Transplant Surgeon',
      regNumber: 'MCI-TS-91204',
      pin: '2010',
      experience: '18 Years',
      hospital: 'Apex Multi-Organ Transplant Center',
      publicKey: 'PK_SROPS_91204_KULKARNI'
    },
    {
      id: 'SROPS-SUR-202',
      name: 'Dr. Neha Deshmukh',
      department: 'SROPS',
      role: 'Organ Retrieval Specialist',
      regNumber: 'MCI-RS-83192',
      pin: '2020',
      experience: '11 Years',
      hospital: 'Thoracic & Abdominal Recovery Unit',
      publicKey: 'PK_SROPS_83192_DESHMUKH'
    },
    {
      id: 'SROPS-SUR-203',
      name: 'Dr. Arvind Menon',
      department: 'SROPS',
      role: 'Perfusion & Cryo-Preservation Officer',
      regNumber: 'MCI-PO-74019',
      pin: '2030',
      experience: '14 Years',
      hospital: 'Hypothermic Organ Perfusion Division',
      publicKey: 'PK_SROPS_74019_MENON'
    },

    // CTORB Admin Department (3 Regulatory Officials)
    {
      id: 'CTORB-ADM-301',
      name: 'Dir. B. K. Raman',
      department: 'ADMIN',
      role: 'State Transplant Commissioner',
      regNumber: 'GOV-SOTTO-001',
      pin: '3010',
      experience: '24 Years',
      hospital: 'State Organ & Tissue Transplant Directorate',
      publicKey: 'PK_CTORB_001_RAMAN'
    },
    {
      id: 'CTORB-ADM-302',
      name: 'Dr. Kavita Nair',
      department: 'ADMIN',
      role: 'Chief Ethics & Allocation Officer',
      regNumber: 'MCI-ETH-49102',
      pin: '3020',
      experience: '17 Years',
      hospital: 'National Transplant Allocation Committee',
      publicKey: 'PK_CTORB_49102_NAIR'
    },
    {
      id: 'CTORB-ADM-303',
      name: 'Insp. Sanjay Verma',
      department: 'ADMIN',
      role: 'Vigilance & Medico-Legal Auditor',
      regNumber: 'IPS-MED-92011',
      pin: '3030',
      experience: '15 Years',
      hospital: 'Transplant Regulatory Enforcement Wing',
      publicKey: 'PK_CTORB_92011_VERMA'
    }
  ]
};
