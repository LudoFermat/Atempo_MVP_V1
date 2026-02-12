import { ExportService } from './export.service';

describe('ExportService', () => {
  it('creates csv with header and rows', () => {
    const service = new ExportService();
    const csv = service.buildMetricsCsv('athlete-1', [
      {
        createdAt: new Date('2026-01-01T12:00:00.000Z'),
        moodScore: 7,
        stressScore: 4,
        noteText: 'ok'
      }
    ]);

    expect(csv).toContain('athleteUserId,createdAt,moodScore,stressScore,noteText');
    expect(csv).toContain('athlete-1,2026-01-01T12:00:00.000Z,7,4,"ok"');
  });
});
