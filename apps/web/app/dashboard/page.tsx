'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Role } from '@atempo/shared';
import { apiFetch } from '../../lib/api';
import { clearSession, getRole, isStaffRole } from '../../lib/auth';

type DashboardRow = {
  athleteUserId: string;
  name: string;
  sport: string;
  latestMoodScore: number | null;
  latestStressScore: number | null;
  lastEvents: Array<{ type: string; preview: string; createdAt: string }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentRole = getRole();
    if (!isStaffRole(currentRole)) {
      router.replace('/');
      return;
    }

    setRole(currentRole);
    void loadRows();
  }, [router]);

  async function loadRows() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/staff/athletes');
      if (response.status === 401 || response.status === 403) {
        clearSession();
        router.replace('/');
        return;
      }

      if (!response.ok) {
        setError('No se pudo cargar el dashboard.');
        return;
      }

      const payload = await response.json();
      setRows(payload);
    } catch {
      setError('No se pudo conectar con la API.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard Staff</h1>
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-200 px-3 py-1 text-xs">{role}</span>
          <button
            className="rounded border px-3 py-1 text-sm"
            onClick={() => {
              clearSession();
              router.push('/');
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button className="ml-3 underline" onClick={() => void loadRows()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded border bg-white p-4 text-sm text-slate-600">Cargando atletas...</div>
      ) : null}

      {!isLoading && !error && rows.length === 0 ? (
        <div className="rounded border bg-white p-4 text-sm text-slate-600">
          No hay atletas disponibles para este rol/club.
        </div>
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3">Athlete</th>
              <th className="p-3">Sport</th>
              <th className="p-3">Latest mood</th>
              <th className="p-3">Latest stress</th>
              <th className="p-3">Last events</th>
              <th className="p-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.athleteUserId} className="border-t">
                <td className="p-3">{row.name}</td>
                <td className="p-3">{row.sport}</td>
                <td className="p-3">{row.latestMoodScore ?? '-'}</td>
                <td className="p-3">{row.latestStressScore ?? '-'}</td>
                <td className="p-3">
                  <ul className="space-y-1 text-xs text-slate-600">
                    {row.lastEvents.slice(0, 5).map((event, idx) => (
                      <li key={`${row.athleteUserId}-${idx}`}>
                        [{event.type}] {event.preview}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-3">
                  <Link className="text-brand-700 underline" href={`/athletes/${row.athleteUserId}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : null}
    </section>
  );
}
