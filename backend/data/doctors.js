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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200047a9762c09c7f2736965675ccda56e856b9508b127c7ebda0f91b9be2ae0a3ab60b0d0540cce525f48e0f840bfe5fbc2b37e7d9415f1e56cde1693529b581b670'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004ef69d4dcf6778d4d1e7cba0dee94b212573f2fb9eacebf017dce8cafe55c1e48e64b8228d298f6307d1aae0ed47bfc0db5b5711135782ec8d0c10ed0e9a3edee'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d030107034200041871cfb25f5355560950f60f035974f117a68addf00a95764bc8ca2f6582b198bc6d607354a8d11ddbbdb5ff6c74399feab6ffb20507613487252b91d11813c7'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004f3664fd33677953a4e9df64e2e228555b72f5cafc01fc551e6517e781fbb48bd675601241a3112410d3548e47a5ef52399164f11258e0ac2f82744241a69f559'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004afd55c4d892081f6e5c7f730583248babe6ed4ba5d727ee32abfc5d995a3c40a2366d7a568f41de11150f179472fbbb87dc615a1faaa358eebe36bc453e0b82d'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d0301070342000425c1d8fc961c18c9b1b7be362e106ff9d2dfdf16b0866844ca75c41b3eec12193d8d9120206fe797ca45b0807062862ee2e33dcf4e444b36089d6f7594b0c746'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004d5afe77d175472bfc317ea338e5bcfc00e1597b898c970b2ce9e53ae0ace0d13f7e4a8aa69d64134bf00cae102cbca4da2d5a3f35b71ff0ba37caef0e9155db4'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004390e7591c42f4226352f1792671c3fcdb7a9dd4d07b4aea9beac3eb70367079b12d3ee1b97985e3092a5665c83b60ec51c0742926a1d2f1c2ac402da3b29db27'
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
      publicKey: '0x3059301306072a8648ce3d020106082a8648ce3d03010703420004726fbf8c9e7e26a2215c0387c8df65d237d6984d7acfff58fc86b6cdefa70c64dac27ec47d93fa7e8287fc3c79cec80b3941ed82a8e32185f77dbd8d8fb14b0e'
    }
  ]
};
