import { Role } from '@atempo/shared';

type SessionData = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
  };
};

const SESSION_KEY = 'atempo_session';

export function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function setSession(session: SessionData) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getRole() {
  return getSession()?.user.role ?? null;
}

export function isStaffRole(role: Role | null) {
  return role === Role.COACH || role === Role.PSY_ATEMPO || role === Role.PSY_CLUB;
}
