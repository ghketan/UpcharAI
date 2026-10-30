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
  RuleConfig,
  AssessmentPreviewInput,
  AssessmentPreviewResult,
  SyncOutboxItem,
  TargetHubSummary,
  VoiceProtocol,
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
    let errorData: any = { message: res.statusText, code: 'unknown_error', retryable: false };
    try {
      errorData = await res.json();
    } catch {
      // Use fallback
    }
    const message =
      errorData.message ||
      (typeof errorData.detail === 'string'
        ? errorData.detail
        : Array.isArray(errorData.detail) && errorData.detail[0]?.msg
        ? errorData.detail[0].msg
        : res.statusText || 'API request failed');

    throw new ApiError(
      message,
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
    const patientId = (data as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    return request<Patient>('/api/patients', {
      method: 'POST',
      body: JSON.stringify({ ...data, id: patientId }),
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
    const assessmentId = (inputs as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    return request<Assessment>(`/api/patients/${patientId}/assessments`, {
      method: 'POST',
      body: JSON.stringify({ ...inputs, id: assessmentId }),
    }, role);
  },

  async previewAssessment(
    inputs: AssessmentPreviewInput,
    role: DemoRole = 'NURSE'
  ): Promise<AssessmentPreviewResult> {
    return request<AssessmentPreviewResult>('/api/assessments/preview', {
      method: 'POST',
      body: JSON.stringify(inputs),
    }, role);
  },

  async getRuleConfig(role: DemoRole = 'NURSE'): Promise<RuleConfig> {
    return request<RuleConfig>('/api/rules/config', {}, role);
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

  async getSyncOutbox(
    limit: number = 50,
    role: DemoRole = 'NURSE'
  ): Promise<{ items: SyncOutboxItem[]; total_count: number }> {
    return request<{ items: SyncOutboxItem[]; total_count: number }>(`/api/sync/outbox?limit=${limit}`, {}, role);
  },

  async retryOutboxItem(
    itemId: string,
    role: DemoRole = 'NURSE'
  ): Promise<{ status: string; item: SyncOutboxItem }> {
    return request<{ status: string; item: SyncOutboxItem }>(`/api/sync/outbox/${itemId}/retry`, {
      method: 'POST',
    }, role);
  },

  async getTargetHubSummary(role: DemoRole = 'NURSE'): Promise<TargetHubSummary> {
    return request<TargetHubSummary>('/api/sync/target-hub', {}, role);
  },

  // Chat
  async sendMessage(message: string, language: string = 'en', role: DemoRole): Promise<ChatResponse> {
    return request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    }, role);
  },

  async getChatProtocols(role: DemoRole = 'NURSE'): Promise<VoiceProtocol[]> {
    return request<VoiceProtocol[]>('/api/chat/protocols', {}, role);
  },

  // Demo
  async resetDemo(role: DemoRole): Promise<{ status: string; seeded_scenarios: number; message: string }> {
    return request('/api/demo/reset', {
      method: 'POST',
    }, role);
  },
};

export { ApiError };
