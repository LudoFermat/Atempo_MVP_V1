'use client';

import { NoteVisibility, Role } from '@atempo/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { SimpleLineChart } from '../../../components/simple-line-chart';
import { apiFetch } from '../../../lib/api';
import { clearSession, getRole, isStaffRole } from '../../../lib/auth';

type DetailPayload = {
  athlete: {
    userId: string;
    name: string;
    sport: string;
    goalText: string;
  };
  notes: Array<{ id: string; visibility: NoteVisibility; text: string; createdAt: string }>;
  checkins?: Array<{ id: string; moodScore: number; stressScore: number; createdAt: string }>;
  checkinsAggregated?: Array<{ date: string; moodAvg: number; stressAvg: number }>;
};

export default function AthleteDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const athleteId = params.id;

  const [role, setRole] = useState<Role | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>(NoteVisibility.COACH_VISIBLE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentRole = getRole();
    if (!isStaffRole(currentRole)) {
      router.replace('/');
      return;
    }

    setRole(currentRole);
    if (currentRole === Role.PSY_ATEMPO) setVisibility(NoteVisibility.INTERNAL);
    void loadDetail();
  }, [router, athleteId]);

  async function loadDetail() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/staff/athletes/${athleteId}`);

      if (response.status === 401 || response.status === 403) {
        clearSession();
        router.replace('/');
        return;
      }

      if (!response.ok) {
        setError('No se pudo cargar el detalle del atleta.');
        return;
      }

      const payload = await response.json();
      setDetail(payload);
    } catch {
      setError('No se pudo conectar con la API.');
    } finally {
      setIsLoading(false);
    }
  }

  const chartPoints = useMemo(() => {
    if (!detail) return [];
    if (detail.checkinsAggregated) {
      return detail.checkinsAggregated
        .slice()
        .reverse()
        .map((row) => ({
          label: row.date,
          mood: row.moodAvg,
          stress: row.stressAvg
        }));
    }

    if (!detail.checkins) return [];
    return detail.checkins
      .slice()
      .reverse()
      .map((row) => ({
        label: row.createdAt,
        mood: row.moodScore,
        stress: row.stressScore
      }));
  }, [detail]);

  function visibilityOptions(currentRole: Role | null) {
    if (currentRole === Role.COACH) {
      return [NoteVisibility.COACH_VISIBLE];
    }

    if (currentRole === Role.PSY_ATEMPO) {
      return [NoteVisibility.INTERNAL];
    }

    return [NoteVisibility.COACH_VISIBLE, NoteVisibility.INTERNAL];
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (isSavingNote) return;
    if (!newNoteText.trim()) {
      setActionMessage('La nota no puede estar vacia.');
      return;
    }
    setActionMessage(null);
    setIsSavingNote(true);

    try {
      const response = await apiFetch(`/staff/athletes/${athleteId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: newNoteText.trim(), visibility })
      });

      if (!response.ok) {
        setActionMessage('No se pudo crear la nota.');
        return;
      }

      setNewNoteText('');
      setActionMessage('Nota guardada.');
      await loadDetail();
    } catch {
      setActionMessage('No se pudo conectar con la API.');
    } finally {
      setIsSavingNote(false);
    }
  }

  async function exportCsv() {
    if (isExporting) return;
    setActionMessage(null);
    setIsExporting(true);
    try {
      const response = await apiFetch(`/staff/athletes/${athleteId}/export.csv`);
      if (!response.ok) {
        setActionMessage('No se pudo exportar el CSV.');
        return;
      }

      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `athlete-${athleteId}-metrics.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setActionMessage('CSV exportado.');
    } catch {
      setActionMessage('No se pudo conectar con la API.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return <p>Cargando...</p>;
  }

  if (error) {
    return (
      <section className="space-y-4">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        <div className="flex gap-3">
          <button className="rounded border px-3 py-2 text-sm" onClick={() => void loadDetail()}>
            Reintentar
          </button>
          <Link className="rounded border px-3 py-2 text-sm" href="/dashboard">
            Volver
          </Link>
        </div>
      </section>
    );
  }

  if (!detail) {
    return <p className="text-sm text-slate-600">No se encontro el atleta.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{detail.athlete.name}</h1>
        <Link className="text-sm text-brand-700 underline" href="/dashboard">
          Volver al dashboard
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <p className="font-semibold">Perfil</p>
          <p className="text-sm">Sport: {detail.athlete.sport}</p>
          <p className="text-sm">Goal: {detail.athlete.goalText}</p>
          <p className="mt-2 text-xs text-slate-500">Role activo: {role}</p>
        </div>
        <SimpleLineChart points={chartPoints} />
      </div>

      <div className="rounded border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">Notas</p>
          {role === Role.PSY_ATEMPO || role === Role.PSY_CLUB ? (
            <button
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              onClick={exportCsv}
              disabled={isExporting}
            >
              {isExporting ? 'Exportando...' : 'Export CSV'}
            </button>
          ) : null}
        </div>
        <ul className="space-y-2 text-sm">
          {detail.notes.map((note) => (
            <li key={note.id} className="rounded bg-slate-100 p-2">
              <span className="mr-2 text-xs font-semibold">{note.visibility}</span>
              {note.text}
            </li>
          ))}
        </ul>
        {detail.notes.length === 0 ? <p className="text-sm text-slate-500">Sin notas visibles.</p> : null}
      </div>

      <form className="rounded border bg-white p-4" onSubmit={submitNote}>
        <p className="font-semibold">Nueva nota</p>
        <textarea
          className="mt-2 w-full rounded border p-2"
          rows={3}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <select
            className="rounded border p-2 text-sm"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as NoteVisibility)}
          >
            {visibilityOptions(role).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            className="rounded bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSavingNote}
          >
            {isSavingNote ? 'Guardando...' : 'Guardar nota'}
          </button>
        </div>
        {actionMessage ? <p className="mt-2 text-sm text-slate-600">{actionMessage}</p> : null}
      </form>
    </section>
  );
}
