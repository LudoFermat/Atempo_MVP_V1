import { getSession, setSession, clearSession } from './auth';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch(path: string, init: RequestInit = {}, requiresAuth = true) {
  const session = getSession();

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (requiresAuth && session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers
  });

  if (response.status === 401 && requiresAuth && session?.refreshToken) {
    const refreshResponse = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });

    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json();
      setSession({ ...session, ...refreshed });
      return apiFetch(path, init, requiresAuth);
    }

    clearSession();
  }

  return response;
}
