import { NoteVisibility, Role } from '@atempo/shared';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  const prismaMock = {} as never;
  const exportMock = { buildMetricsCsv: jest.fn() } as never;
  const service = new StaffService(prismaMock, exportMock);

  it('filters internal notes for coach', () => {
    const notes = [
      { visibility: NoteVisibility.COACH_VISIBLE, text: 'visible' },
      { visibility: NoteVisibility.INTERNAL, text: 'hidden' }
    ];

    const result = service.filterVisibleNotes(Role.COACH, notes);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('visible');
  });
});
