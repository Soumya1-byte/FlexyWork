import { Gig, ShiftApplication, UserRole } from '../types';
import { apiCall } from './api';

export async function getGigs(filters?: {
  search?: string;
  category?: string;
  minPay?: number;
}): Promise<Gig[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.minPay !== undefined) params.set('minPay', String(filters.minPay));

  const data = await apiCall<{ shifts: Gig[] }>(`/api/shifts${params.size ? `?${params}` : ''}`);
  return data.shifts;
}

export async function getGigById(id: string): Promise<Gig | null> {
  try {
    const data = await apiCall<{ shift: Gig }>(`/api/shifts/${id}`);
    return data.shift;
  } catch {
    return null;
  }
}

export type CreateGigInput = {
  title: string;
  description: string;
  category: string;
  requiredSkills?: string[];
  workersRequired?: number;
  date: string;
  startTime: string;
  endTime: string;
  time?: string;
  duration?: string;
  paymentType?: 'fixed' | 'hourly';
  paymentAmount: number;
  location: string;
  serviceMode?: 'scheduled' | 'emergency' | 'on_demand';
  customerType?: 'household' | 'institution' | 'cooperative';
  certificationRequired?: boolean;
  certificateRequirementDetails?: string;
  certificateName?: string;
  certificateType?: string;
  certificateDataUrl?: string;
  insuranceIncluded?: boolean;
  welfareContribution?: number;
  invoiceRequired?: boolean;
  emergencyContact?: string;
  urgency?: 'normal' | 'urgent';
  maximumDistance?: number;
};

export async function createGig(gigData: CreateGigInput): Promise<Gig> {
  const data = await apiCall<{ shift: Gig }>('/api/shifts', {
    method: 'POST',
    body: JSON.stringify(gigData)
  });
  return data.shift;
}

export async function applyForGig(gigId: string, _workerUserId?: string): Promise<void> {
  await apiCall(`/api/shifts/${gigId}/apply`, { method: 'POST' });
}

export async function acceptGig(gigId: string, _workerUserId?: string): Promise<void> {
  await apiCall(`/api/shifts/${gigId}/accept`, { method: 'POST' });
}

export async function recordAttendance(gigId: string, action: 'check-in' | 'check-out', otp?: string): Promise<void> {
  await apiCall(`/api/attendance/${gigId}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ otp })
  });
}

export async function getMyGigs(_userId?: string, _role?: UserRole): Promise<Gig[]> {
  const data = await apiCall<{ shifts: Gig[] }>('/api/shifts/mine');
  return data.shifts;
}

export async function getShiftApplications(shiftId: string): Promise<ShiftApplication[]> {
  try {
    const data = await apiCall<{ applications: ShiftApplication[] }>(`/api/shifts/${shiftId}/applications`);
    return data.applications;
  } catch {
    return [];
  }
}

export async function updateApplicationStatus(applicationId: string, status: 'accepted' | 'rejected'): Promise<any> {
  return await apiCall(`/api/shifts/applications/${applicationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function getRequiredCertificate(gigId: string): Promise<{ name?: string; type?: string; dataUrl: string } | null> {
  try {
    return await apiCall<{ name?: string; type?: string; dataUrl: string }>(`/api/shifts/${gigId}/certificate`);
  } catch {
    return null;
  }
}

export type ParsedShiftData = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  requiredSkills?: string[];
  workersRequired?: number | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  paymentAmount?: number | null;
  paymentType?: 'fixed' | 'hourly' | null;
  location?: string | null;
  urgency?: 'normal' | 'urgent' | null;
};

export type ParseShiftResponse = {
  parsedShift: ParsedShiftData;
  needsClarification: string[];
  parsed?: ParsedShiftData;
};

export async function parseShiftNaturalLanguage(rawText: string): Promise<ParseShiftResponse> {
  return await apiCall<ParseShiftResponse>('/api/shifts/parse', {
    method: 'POST',
    body: JSON.stringify({ rawText })
  });
}

export async function enhanceShiftDescription(shiftData: {
  title?: string;
  category?: string;
  location?: string;
  skills?: string[];
  description?: string;
}): Promise<string> {
  const data = await apiCall<{ enhancedDescription: string }>('/api/shifts/enhance-description', {
    method: 'POST',
    body: JSON.stringify(shiftData)
  });
  return data.enhancedDescription;
}

export async function parseAIPrompt(prompt: string): Promise<any> {
  const data = await parseShiftNaturalLanguage(prompt);
  return data.parsedShift || data.parsed;
}

export async function getWageBenchmarks(): Promise<Record<string, { hourlyMin: number; hourlyMax: number; hourlyAvg: number; fixedAvg: number; label: string }>> {
  const data = await apiCall<{ benchmarks: any }>('/api/shifts/wage-benchmarks');
  return data.benchmarks;
}
