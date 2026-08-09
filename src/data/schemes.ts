import type { HealthScheme } from '../types';

export const DEMO_SCHEMES: HealthScheme[] = [
  {
    id: 'scheme-pmjay',
    name: 'Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (PM-JAY)',
    shortName: 'PM-JAY (Ayushman Bharat)',
    description: 'Provides health coverage of up to ₹5 Lakh per family per year for secondary and tertiary care hospitalization to over 12 crore poor and vulnerable families.',
    coverageDetails: 'Up to ₹5,00,000 per family per year for inpatient hospital care across empaneled public & private hospitals.',
    maxCoverageAmount: '₹5,00,000 / year',
    state: 'National',
    targetGroup: 'SECC (Socio-Economic Caste Census) listed families, BPL Ration Card holders, EWS households.',
    eligibilityRules: {
      maxIncomeCategory: ['BPL', 'EWS'],
      rationCardTypes: ['PHH (Priority Household)', 'AAY (Antyodaya Anna Yojana)', 'BPL Card'],
    },
    benefits: [
      'Cashless treatment at empaneled government and private hospitals',
      'Pre and post-hospitalization expense coverage (up to 15 days)',
      'Over 1,900 medical procedures covered (surgeries, oncology, cardiology, etc.)',
      'No cap on family size or age of members'
    ],
    documentsRequired: [
      'Aadhaar Card of head of family / member',
      'Ration Card / SECC Household verification proof',
      'PM-JAY Golden Card / Ayushman Card (if already issued)',
      'Active Mobile Number'
    ],
    applicationSteps: [
      'Visit nearest PM-JAY Empaneled Public/Private Hospital or Common Service Centre (CSC).',
      'Approach the "Ayushman Mitra" counter at the hospital entrance.',
      'Provide your Aadhaar and Ration Card for instant e-KYC eligibility verification.',
      'Receive instant Ayushman Card approval if listed in SECC/BPL database.'
    ],
    officialSource: 'https://pmjay.gov.in',
    lastVerified: '2026-08-01',
    status: 'active'
  },
  {
    id: 'scheme-vaya-vandana',
    name: 'Ayushman Vaya Vandana Yojana (Health Coverage for Senior Citizens 70+)',
    shortName: 'Ayushman Vaya Vandana (70+ Senior Citizens)',
    description: 'Provides distinct health cover of up to ₹5 Lakh per year for all senior citizens aged 70 years and above, regardless of income status or socio-economic background.',
    coverageDetails: 'Dedicated ₹5,00,000 top-up cover for senior citizens aged 70+ for inpatient hospital treatment.',
    maxCoverageAmount: '₹5,00,000 / year',
    state: 'National',
    targetGroup: 'All Indian Citizens aged 70 years and above (Universal coverage for elderly).',
    eligibilityRules: {
      minAge: 70,
    },
    benefits: [
      'Universal health insurance coverage regardless of income or BPL status',
      'Cashless hospital admission in all PM-JAY empanelled hospitals',
      'Covers pre-existing medical conditions from Day 1',
      'Separate family card allotment for elderly members'
    ],
    documentsRequired: [
      'Aadhaar Card (Date of Birth verification showing age 70+)',
      'Active mobile number linked with Aadhaar for e-KYC OTP'
    ],
    applicationSteps: [
      'Download Ayushman App or visit beneficiary.nha.gov.in',
      'Select "Senior Citizen 70+" enrollment tab.',
      'Enter Aadhaar number and complete OTP authentication.',
      'Instantly generate Ayushman Vaya Vandana Card.'
    ],
    officialSource: 'https://beneficiary.nha.gov.in',
    lastVerified: '2026-08-05',
    status: 'active'
  },
  {
    id: 'scheme-pmbjp',
    name: 'Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)',
    shortName: 'Jan Aushadhi Scheme (Generic Medicines)',
    description: 'Makes quality generic medicines available at affordable prices to all citizens through special Jan Aushadhi Kendras, providing 50% to 90% savings compared to branded drugs.',
    coverageDetails: 'Subsidized price savings (50% to 90% discount on 2,00,00+ medicines and surgical products).',
    state: 'National',
    targetGroup: 'All Indian Citizens (Universal Access). No income or eligibility restrictions.',
    eligibilityRules: {},
    benefits: [
      'Access to WHO-GMP quality tested generic medicines',
      'Saves up to 90% cost on chronic disease medicines (Diabetes, Hypertension, Heart care)',
      'Direct counter purchase without complex registration'
    ],
    documentsRequired: [
      'Valid Doctor Prescription (Rx) listing medicine generic name or brand name'
    ],
    applicationSteps: [
      'Locate nearest Jan Aushadhi Kendra using Sehat Setu facility finder.',
      'Present your doctor’s prescription to the store pharmacist.',
      'Purchase generic equivalents at heavily discounted rates.'
    ],
    officialSource: 'https://janaushadhi.gov.in',
    lastVerified: '2026-08-01',
    status: 'active'
  },
  {
    id: 'scheme-nhm',
    name: 'National Health Mission Free Drugs & Diagnostics Service',
    shortName: 'NHM Free Care in Public Hospitals',
    description: 'Ensures free essential drugs, free diagnostic tests, and free emergency transport (108/102) for all patients visiting Primary Health Centres, CHCs, and District Government Hospitals.',
    coverageDetails: '100% Free consultation, free essential lab tests, free inpatient stay, free drugs at public facilities.',
    state: 'National',
    targetGroup: 'All patients visiting Public Healthcare Facilities (PHC, CHC, District Hospitals). Special focus on rural poor & pregnant women (JSY / JSSK).',
    eligibilityRules: {},
    benefits: [
      'Zero OPD consultation fee at Government Hospitals',
      'Free essential blood tests, X-ray, and ultrasound at public health centers',
      'Free ambulance transport via 108/102 for emergencies and deliveries',
      'Janani Shishu Suraksha Karyakram (JSSK): Free delivery and zero-expense care for mother and newborn'
    ],
    documentsRequired: [
      'OPD Slip / Hospital Registration card (Issued free at hospital counter)',
      'Government Photo ID (Aadhaar or Voter ID for IPD registration)'
    ],
    applicationSteps: [
      'Visit any Primary Health Centre (PHC), CHC, or Government District Hospital.',
      'Get a free OPD slip at the registration counter.',
      'Consult the medical officer and receive free medicines from the hospital pharmacy.'
    ],
    officialSource: 'https://nhm.gov.in',
    lastVerified: '2026-07-20',
    status: 'active'
  },
  {
    id: 'scheme-arogyasri-ka',
    name: 'Ayushman Bharat - Arogya Karnataka Scheme',
    shortName: 'Arogya Karnataka (State Co-branded Scheme)',
    description: 'Karnataka state co-branded health protection scheme for BPL and APL families providing cashless treatment for complex diseases up to ₹5 Lakh/family for BPL and financial assistance for APL families.',
    coverageDetails: '₹5 Lakh for BPL families (Cashless); 30% financial assistance for APL families (up to ₹1.5 Lakh).',
    maxCoverageAmount: '₹5,00,000 / year',
    state: 'Karnataka',
    targetGroup: 'Residents of Karnataka State holding BPL or APL Ration Cards.',
    eligibilityRules: {
      stateSpecific: ['Karnataka'],
      rationCardTypes: ['BPL', 'APL', 'Antyodaya'],
    },
    benefits: [
      'Cashless hospital care across Karnataka empaneled hospitals',
      'Referral system from PHC/District Hospital to private empaneled hospitals',
      'Covers emergency tertiary care procedures'
    ],
    documentsRequired: [
      'Karnataka BPL / APL Ration Card',
      'Aadhaar Card of patient',
      'Referral letter from Government Public Health Facility (except emergencies)'
    ],
    applicationSteps: [
      'Visit nearest PHC or Government District Hospital for initial examination.',
      'Obtain official referral code/letter if super-specialty treatment is required.',
      'Present referral & Ration Card at Arogya Karnataka helpdesk in empaneled hospital.'
    ],
    officialSource: 'https://arogya.karnataka.gov.in',
    lastVerified: '2026-07-25',
    status: 'active'
  }
];
