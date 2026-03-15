export const ROLES = {
  FOUNDER: 'Founder',
  COUNTRY_DIRECTOR: 'CountryDirector',
  BRANCH_MANAGER: 'BranchManager',
  RECRUITER: 'Recruiter',
  VISA_OFFICER: 'VisaOfficer',
  TEACHER: 'Teacher',
  FINANCE: 'Finance',
  PARTNER: 'Partner',
} as const;

export const CRM_PIPELINE_STAGES = [
  'leads',
  'candidates',
  'employer_decision',
  'visa_process',
  'completed',
  'rejected',
] as const;

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'consultation_scheduled',
  'passed_initial_filter',
  'rejected',
  'converted_to_candidate',
] as const;

export const VISA_PIPELINE_STAGES = [
  'contract_received',
  'document_preparation',
  'tls_appointment',
  'submission',
  'waiting_decision',
  'visa_approved',
  'flight_scheduled',
] as const;
