import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  buildMetricsCsv(
    athleteId: string,
    rows: Array<{ createdAt: Date; moodScore: number; stressScore: number; noteText: string | null }>
  ) {
    const header = 'athleteUserId,createdAt,moodScore,stressScore,noteText';
    const csvRows = rows.map((row) => {
      const note = row.noteText ? row.noteText.replace(/"/g, '""') : '';
      return `${athleteId},${row.createdAt.toISOString()},${row.moodScore},${row.stressScore},"${note}"`;
    });
    return [header, ...csvRows].join('\n');
  }
}
