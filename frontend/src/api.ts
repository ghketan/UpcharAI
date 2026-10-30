import {
  CreatePatientInput,
  Patient,
  AssessmentInputs,
  Assessment,
  PatientHistory,
  QueueResponse,
  Hospital,
  ReferralSummary,
  SyncStatus,
  ChatResponse,
  DemoRole,
  Priority,
} from './types';

const API_BASE = ''; // Relies on Vite proxy to http://127.0.0.1:8000

class ApiError extends Error {
  statusCode: number;
  code: string;
  retryable?: boolean;

  constructor(message: string, statusCode: number, code: string, retryable?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  role: DemoRole = 'NURSE'
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Demo-Role', role);

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorData = { message: res.statusText, code: 'unknown_error', retryable: false };
    try {
      errorData = await res.json();
    } catch {
      // Use fallback
    }
    throw new ApiError(
      errorData.message || 'API request failed',
      res.status,
      errorData.code || 'unknown_error',
      errorData.retryable
    );
  }

  return res.json();
}

export const api = {
  // Patients
  async createPatient(data: CreatePatientInput, role: DemoRole): Promise<Patient> {
    return request<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }, role);
  },

  async getPatientHistory(patientId: string, role: DemoRole): Promise<PatientHistory> {
    return request<PatientHistory>(`/api/patients/${patientId}`, {}, role);
  },

  // Assessments
  async createAssessment(
    patientId: string,
    inputs: AssessmentInputs,
    role: DemoRole
  ): Promise<Assessment> {
    return request<Assessment>(`/api/patients/${patientId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(inputs),
    }, role);
  },

  async escalateAssessment(
    assessmentId: string,
    toPriority: 'URGENT' | 'EMERGENCY',
    reason: string,
    role: DemoRole
  ): Promise<{ status: string; assessment_id: string; effective_priority: Priority; reason: string }> {
    return request(`/api/assessments/${assessmentId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ to_priority: toPriority, reason }),
    }, role);
  },

  async finaliseAssessment(
    assessmentId: string,
    finalPriority: Priority,
    reason: string | undefined,
    role: DemoRole
  ): Promise<{ status: string; assessment_id: string; final_priority: Priority; reason?: string }> {
    return request(`/api/assessments/${assessmentId}/finalise`, {
      method: 'POST',
      body: JSON.stringify({ final_priority: finalPriority, reason }),
    }, role);
  },

  // Queue
  async getQueue(role: DemoRole): Promise<QueueResponse> {
    return request<QueueResponse>('/api/queue', {}, role);
  },

  // Hospitals
  async getHospitals(role: DemoRole): Promise<Hospital[]> {
    return request<Hospital[]>('/api/hospitals', {}, role);
  },

  // Referrals
  async createReferral(
    assessmentId: string,
    hospitalId: string,
    role: DemoRole
  ): Promise<ReferralSummary> {
    return request<ReferralSummary>('/api/referrals', {
      method: 'POST',
      body: JSON.stringify({ assessment_id: assessmentId, hospital_id: hospitalId }),
    }, role);
  },

  // Sync
  async getSyncStatus(role: DemoRole): Promise<SyncStatus> {
    return request<SyncStatus>('/api/sync/status', {}, role);
  },

  async pushSync(role: DemoRole): Promise<{ processed: number; errors: number }> {
    return request<{ processed: number; errors: number }>('/api/sync/push', {
      method: 'POST',
    }, role);
  },

  // Chat
  async sendMessage(message: string, language: string = 'en', role: DemoRole): Promise<ChatResponse> {
    return request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    }, role);
  },

  // Demo
  async resetDemo(role: DemoRole): Promise<{ status: string; seeded_scenarios: number; message: string }> {
    return request('/api/demo/reset', {
      method: 'POST',
    }, role);
  },
};

export { ApiError };
