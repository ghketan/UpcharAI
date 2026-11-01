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
  AuthUser,
  LoginInput,
  RegisterInput,
  LoginResponse,
  RoleInfo,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'upcharai_auth_token';
const USER_KEY = 'upcharai_auth_user';
const LOCAL_USERS_KEY = 'upcharai_local_registered_users';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

// Canonical pre-configured demo credentials and personas
export const DEFAULT_DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  doctor: {
    password: 'doctor123',
    user: {
      id: 'usr_demo_doctor',
      username: 'doctor',
      email: 'doctor@upchar.ai',
      role: 'auth',
      full_name: 'Dr. Ananya Sharma (Clinician)',
      allowed_views: ['overview', 'triage', 'emergency', 'telemetry'],
      permissions: [
        'triage_queue:read',
        'patient:create',
        'patient:read',
        'assessment:create',
        'assessment:escalate',
        'assessment:finalise',
        'referral:create',
        'referral:read',
        'sync:manage',
      ],
      created_at: '2026-10-31T14:00:00.000Z',
    },
  },
  staff: {
    password: 'staff123',
    user: {
      id: 'usr_demo_staff',
      username: 'staff',
      email: 'staff@upchar.ai',
      role: 'auth',
      full_name: 'Pooja Devi (Triage Nurse)',
      allowed_views: ['overview', 'triage', 'emergency', 'telemetry'],
      permissions: [
        'triage_queue:read',
        'patient:create',
        'patient:read',
        'assessment:create',
        'assessment:escalate',
        'referral:create',
        'referral:read',
        'sync:manage',
      ],
      created_at: '2026-10-31T14:00:00.000Z',
    },
  },
  patient: {
    password: 'user123',
    user: {
      id: 'usr_demo_patient',
      username: 'patient',
      email: 'patient@upchar.ai',
      role: 'user',
      full_name: 'Rahul Verma (Patient)',
      allowed_views: ['sahayak'],
      permissions: ['chatbot:access'],
      created_at: '2026-10-31T14:00:00.000Z',
    },
  },
  user: {
    password: 'user123',
    user: {
      id: 'usr_demo_user',
      username: 'user',
      email: 'user@upchar.ai',
      role: 'user',
      full_name: 'Sita Devi (Citizen)',
      allowed_views: ['sahayak'],
      permissions: ['chatbot:access'],
      created_at: '2026-10-31T14:00:00.000Z',
    },
  },
};

export const DEFAULT_ROLES: RoleInfo[] = [
  {
    role: 'auth',
    name: 'Clinical & Triage Staff',
    description: 'Access to triage queue, vital assessments, emergency referrals, and telemetry sync.',
    allowed_views: ['overview', 'triage', 'emergency', 'telemetry'],
    permissions: [
      'triage_queue:read',
      'patient:create',
      'patient:read',
      'assessment:create',
      'assessment:escalate',
      'assessment:finalise',
      'referral:create',
      'referral:read',
      'sync:manage',
    ],
    can_access_triage: true,
    can_access_referrals: true,
    can_access_chatbot: false,
  },
  {
    role: 'user',
    name: 'Citizen / Patient',
    description: 'Restricted access to the Sahayak Multilingual Informational Chatbot only.',
    allowed_views: ['sahayak'],
    permissions: ['chatbot:access'],
    can_access_triage: false,
    can_access_referrals: false,
    can_access_chatbot: true,
  },
];

function getLocalRegisteredUsers(): Record<string, { password: string; user: AuthUser }> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRegisteredUser(record: { password: string; user: AuthUser }) {
  try {
    const existing = getLocalRegisteredUsers();
    existing[record.user.username.toLowerCase()] = record;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(existing));
  } catch {}
}

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

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to connect to UpcharAI API server (connection refused or network offline).',
      503,
      'network_offline',
      true
    );
  }

  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      // Non-JSON response (e.g. 404, 405 Method Not Allowed HTML, 502/504 gateway timeout)
    }

    let message =
      errorData?.message ||
      (typeof errorData?.detail === 'string'
        ? errorData.detail
        : Array.isArray(errorData?.detail) && errorData.detail[0]?.msg
        ? errorData.detail[0].msg
        : res.statusText);

    if (!message || message.trim() === '') {
      if (res.status === 404) {
        message = 'API endpoint not found on server.';
      } else if (res.status === 405) {
        message = 'Method Not Allowed on this host (static deployment).';
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        message = 'Backend API server is unreachable or timed out.';
      } else if (res.status === 500) {
        message = 'Internal server error from API.';
      } else {
        message = `API request failed with HTTP ${res.status}.`;
      }
    }

    throw new ApiError(
      message,
      res.status,
      errorData?.code || `http_${res.status}`,
      errorData?.retryable ?? (res.status >= 500)
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

  // Authentication & Access Control
  async login(input: LoginInput): Promise<LoginResponse> {
    const cleanUsername = input.username.trim().toLowerCase();
    const cleanPassword = input.password.trim();

    try {
      const res = await request<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: input.username.trim(), password: cleanPassword }),
      });
      setStoredAuth(res.access_token, res.user);
      return res;
    } catch (err: any) {
      // If the backend is running and returned 401 Unauthorized (invalid password for existing account) or 400/422,
      // propagate that error directly to the user so they know they entered incorrect credentials.
      if (err instanceof ApiError && (err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 422)) {
        throw err;
      }

      // If backend is unreachable (Failed to fetch, network offline, 404, 405, 500, 502, 503, 504),
      // seamlessly authenticate against demo credentials or locally registered accounts:
      const localUsers = getLocalRegisteredUsers();
      const demoAccount = DEFAULT_DEMO_USERS[cleanUsername] || localUsers[cleanUsername];

      if (demoAccount) {
        if (demoAccount.password === cleanPassword) {
          const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
          const fallbackRes: LoginResponse = {
            access_token: `offline_token_${Math.random().toString(36).substring(2, 12)}`,
            token_type: 'bearer',
            role: demoAccount.user.role,
            expires_at: expiresAt,
            user: demoAccount.user,
          };
          setStoredAuth(fallbackRes.access_token, fallbackRes.user);
          return fallbackRes;
        } else {
          throw new ApiError('Invalid password for demo account.', 401, 'invalid_credentials');
        }
      }

      // If username not found in demo or local accounts and server was offline:
      if (
        err instanceof ApiError &&
        (err.statusCode === 503 || err.statusCode === 404 || err.statusCode === 405 || err.statusCode >= 500)
      ) {
        throw new ApiError(
          `Backend server is offline (http://127.0.0.1:8000). Sign in using demo credentials (doctor/doctor123, staff/staff123, user/user123) or register a new identity in Offline Mode.`,
          503,
          'backend_offline'
        );
      }

      throw err;
    }
  },

  async register(input: RegisterInput): Promise<LoginResponse> {
    const cleanUsername = input.username.trim().toLowerCase();
    const cleanPassword = input.password.trim();
    const normalizedRole = input.role === 'client' || input.role === 'user' ? 'user' : 'auth';

    try {
      const res = await request<LoginResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          username: input.username.trim(),
          password: cleanPassword,
          role: normalizedRole,
        }),
      });
      setStoredAuth(res.access_token, res.user);
      return res;
    } catch (err: any) {
      // If live backend rejected with validation or conflict (e.g. username taken), throw it
      if (err instanceof ApiError && (err.statusCode === 400 || err.statusCode === 409 || err.statusCode === 422)) {
        throw err;
      }

      // If server is unreachable or offline, register in offline local storage:
      const localUsers = getLocalRegisteredUsers();
      if (DEFAULT_DEMO_USERS[cleanUsername] || localUsers[cleanUsername]) {
        throw new ApiError(
          `Username '${cleanUsername}' already exists. Please choose another username or sign in.`,
          409,
          'user_conflict'
        );
      }

      const newUser: AuthUser = {
        id: `usr_offline_${Math.random().toString(36).substring(2, 10)}`,
        username: cleanUsername,
        email: input.email?.trim() || `${cleanUsername}@upchar.local`,
        role: normalizedRole,
        full_name: input.full_name?.trim() || cleanUsername,
        allowed_views: normalizedRole === 'auth'
          ? ['overview', 'triage', 'emergency', 'telemetry']
          : ['sahayak'],
        permissions: normalizedRole === 'auth'
          ? [
              'triage_queue:read',
              'patient:create',
              'patient:read',
              'assessment:create',
              'assessment:escalate',
              'referral:create',
              'referral:read',
              'sync:manage',
            ]
          : ['chatbot:access'],
        created_at: new Date().toISOString(),
      };

      saveLocalRegisteredUser({ password: cleanPassword, user: newUser });

      const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      const fallbackRes: LoginResponse = {
        access_token: `offline_token_${Math.random().toString(36).substring(2, 12)}`,
        token_type: 'bearer',
        role: normalizedRole,
        expires_at: expiresAt,
        user: newUser,
      };

      setStoredAuth(fallbackRes.access_token, fallbackRes.user);
      return fallbackRes;
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      return await request<AuthUser>('/api/auth/me');
    } catch {
      const stored = getStoredUser();
      if (stored) return stored;
      throw new ApiError('Not authenticated', 401, 'unauthorized');
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      clearStoredAuth();
    }
  },

  async getRoles(): Promise<RoleInfo[]> {
    try {
      return await request<RoleInfo[]>('/api/auth/roles');
    } catch {
      return DEFAULT_ROLES;
    }
  },
};

export { ApiError };
