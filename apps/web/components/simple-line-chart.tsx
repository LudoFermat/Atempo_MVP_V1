'use client';

type Point = {
  label: string;
  mood: number;
  stress: number;
};

function toPolyline(points: Point[], key: 'mood' | 'stress') {
  if (points.length === 0) return '';
  const stepX = 260 / Math.max(points.length - 1, 1);
  return points
    .map((point, idx) => {
      const x = idx * stepX;
      const y = 120 - (point[key] / 10) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

export function SimpleLineChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-500">No hay datos para graficar.</p>;
  }

  const moodLine = toPolyline(points, 'mood');
  const stressLine = toPolyline(points, 'stress');

  return (
    <div className="rounded border bg-white p-4">
      <p className="mb-2 text-sm font-semibold">Mood/Stress (1-10)</p>
      <svg viewBox="0 0 260 130" className="h-36 w-full">
        <polyline fill="none" stroke="#2c7be5" strokeWidth="2" points={moodLine} />
        <polyline fill="none" stroke="#dc2626" strokeWidth="2" points={stressLine} />
      </svg>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="text-brand-700">Mood</span>
        <span className="text-red-600">Stress</span>
      </div>
    </div>
  );
}
