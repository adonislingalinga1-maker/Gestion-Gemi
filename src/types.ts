export type UserRole = 'admin' | 'doctor' | 'nurse' | 'secretary';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: any;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string;
  idNumber: string;
  createdAt: any;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startTime: any;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  date: any;
  acuityOD: string;
  acuityOS: string;
  pioOD: number;
  pioOS: number;
  slitLampSummary: string;
  fundusSummary: string;
  status: 'draft' | 'final';
}

export interface MedicalOpinion {
  id: string;
  consultationId: string;
  patientId?: string;
  state: 'Stable' | 'À surveiller' | 'Critique';
  evolution: 'Amélioration' | 'Stable' | 'Détérioration';
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  recommendation: string;
  notes: string;
  updatedAt: any;
}

export interface ImagingRecord {
  id: string;
  patientId: string;
  consultationId: string;
  type: 'OCT' | 'Fundus' | 'VisualField';
  eye: 'OD' | 'OS' | 'OU';
  storagePath: string;
  analysisResult?: any;
  diagnosisId?: string;
  createdAt: any;
}
