import type { User, UserRole } from '../types';
import { apiCall } from './api';

type ApiUser = Omit<User, 'role' | 'avatarUrl'> & {
  role: 'worker' | 'employer' | 'admin';
  profileImage?: string;
};

function fromApiUser(user: ApiUser): User {
  return {
    ...user,
    role: user.role === 'employer' ? 'seeker' : user.role,
    avatarUrl: user.profileImage
  };
}

function toApiRole(role: UserRole): 'worker' | 'employer' {
  return role === 'worker' ? 'worker' : 'employer';
}

export async function login(email: string, password: string, role?: UserRole): Promise<User> {
  const data = await apiCall<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      role: role ? toApiRole(role) : undefined
    })
  });
  return fromApiUser(data.user);
}

export async function sendOtp(email: string): Promise<{ success: boolean; message: string; devNotice?: string }> {
  return apiCall<{ success: boolean; message: string; devNotice?: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  return apiCall<{ success: boolean; message: string }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function signup(
  name: string,
  email: string,
  password: string,
  role: UserRole,
  location: string,
  otp?: string,
  businessName?: string
): Promise<User> {
  const data = await apiCall<{ user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      password,
      role: toApiRole(role),
      location,
      otp,
      businessName
    })
  });
  return fromApiUser(data.user);
}

export async function loginWithGoogle(payload: {
  credential?: string;
  email?: string;
  name?: string;
  picture?: string;
  googleId?: string;
  role?: UserRole;
  location?: string;
}): Promise<User> {
  const data = await apiCall<{ user: ApiUser }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      role: payload.role ? toApiRole(payload.role) : 'employer'
    })
  });
  return fromApiUser(data.user);
}

export async function logout(): Promise<void> {
  await apiCall<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User | null> {
  try {
    const data = await apiCall<{ user: ApiUser }>('/api/auth/me');
    return fromApiUser(data.user);
  } catch {
    return null;
  }
}

export interface SeekerLocationUpdate {
  city?: string;
  latitude?: number;
  longitude?: number;
}

export async function updateMyLocation(payload: SeekerLocationUpdate): Promise<User> {
  const data = await apiCall<{ user: ApiUser }>('/api/auth/me/location', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  return fromApiUser(data.user);
}
