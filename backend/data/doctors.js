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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200043e069bb6ceb230fceb7318fd44037646343cb35ada67a2cb812b25a45295ab0b9469e476af7e237e0baf357cac105b97a66f3ab859ba49cfa1f5e5748d9ac018'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004cfbfcee73d2cd2f6a811a24f1bfc25f5c7787b7e76ce17f77368146216d9c8ee4798c8a5889fbcc7120c04b003c4cc67cb590f485a12b4b186c6c99e89648f0a'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200046dab234f18ec29bc44c008c61c22386a1e0251d5f1c2c6387628ec0179eb9cee73d1a824e2b52631281876d6fa6b8077e96753878666626e7b7bfbab96367050'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200049b92a5a86da4506cd46a966995bb6ba827237e91ac127ae974a7e7fa2e91b4d23fd56710ff307157ac8f0fe6985bc5a06a8b918780544f3d53b5313ea59c4906'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004ee13d7435b1e477c9065540baa5a34740dafb749028541dad2b0b1f958c6063e2da4fd30f9b47a2ea4fb26aa443f3f060221d5046e1ee17fd7970362ab43b20e'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004e7631767e7833495b44dd2828ef96778fb843ba9605f0e5a1c8f73854126c6a8e96e16dfb28aa5b99bceab55977c7acfc7deb034e4794b6b4c410f39147a08fa'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200045c2f4f4c5c97e88bcaad13af2927d7711c681e0e5391f7da0175ed6e2e452f2b0fd0a7fed1176c308c7271c3d39b3391bbcd2742e205edb6c3a9d6c49ae1d576'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d0301070342000406cc17c482abf14b3097bea1c5db338ab2ba23142f1b6ccfbe2b9a54340d2106d5e9f72afab0a82ecfd4083c42ac725ea180a13bb0f8d318d5106d475b6c218b'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200040cb6f0e6be826891d18435db063b37c662d13f8b8a468ec307b435ff28b861d23b59c5693ed5e8601d6272b688f1ea95f1a4437fd26c70b1106e1e6f1729557f'
    }
  ]
};
