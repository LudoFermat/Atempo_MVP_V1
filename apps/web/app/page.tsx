'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@atempo/shared';
import { apiFetch } from '../lib/api';
import { setSession } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('coach1@atempo.dev');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await apiFetch(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password })
      },
      false
    );

    if (!response.ok) {
      setError('Credenciales invalidas');
      return;
    }

    const payload = await response.json();

    if (payload.user.role === Role.ATHLETE) {
      setError('El rol ATHLETE debe usar la app mobile. Usa un usuario staff en web.');
      return;
    }

    setSession(payload);
    router.push('/dashboard');
  }

  return (
    <section className="mx-auto mt-12 max-w-md rounded border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Atempo Web Login</h1>
      <p className="mt-1 text-sm text-slate-600">Roles web: COACH / PSY_CLUB / PSY_ATEMPO</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            className="mt-1 w-full rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded border p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-brand-500 p-2 font-semibold text-white" type="submit">
          Entrar
        </button>
      </form>
    </section>
  );
}
