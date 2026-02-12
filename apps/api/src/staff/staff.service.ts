import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NoteVisibility, Role } from '@atempo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffNoteDto } from './dto';
import { ExportService } from './export.service';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService
  ) {}

  filterVisibleNotes<T extends { visibility: string }>(role: Role, notes: T[]) {
    if (role === Role.COACH) {
      return notes.filter((note) => note.visibility === NoteVisibility.COACH_VISIBLE);
    }
    return notes;
  }

  private canCreateVisibility(role: Role, visibility: string) {
    if (role === Role.COACH) {
      return visibility === NoteVisibility.COACH_VISIBLE;
    }

    if (role === Role.PSY_CLUB) {
      return visibility === NoteVisibility.COACH_VISIBLE || visibility === NoteVisibility.INTERNAL;
    }

    if (role === Role.PSY_ATEMPO) {
      return visibility === NoteVisibility.INTERNAL;
    }

    return false;
  }

  private async assertClubAccess(userId: string, role: Role, athleteUserId: string) {
    const athlete = await this.prisma.athleteProfile.findUnique({ where: { userId: athleteUserId } });
    if (!athlete) {
      throw new NotFoundException('Athlete not found');
    }

    if (role === Role.PSY_ATEMPO) {
      return athlete;
    }

    const staffProfile = await this.prisma.staffProfile.findUnique({ where: { userId } });
    if (!staffProfile) {
      throw new ForbiddenException('Staff profile not found');
    }

    if (staffProfile.clubId !== athlete.clubId) {
      throw new ForbiddenException('Athlete outside your club scope');
    }

    return athlete;
  }

  async listAthletes(userId: string, role: Role) {
    let athleteProfiles;

    if (role === Role.PSY_ATEMPO) {
      athleteProfiles = await this.prisma.athleteProfile.findMany({ orderBy: { createdAt: 'asc' } });
    } else {
      const staffProfile = await this.prisma.staffProfile.findUnique({ where: { userId } });
      if (!staffProfile) {
        throw new ForbiddenException('Staff profile not found');
      }

      athleteProfiles = await this.prisma.athleteProfile.findMany({
        where: { clubId: staffProfile.clubId },
        orderBy: { createdAt: 'asc' }
      });
    }

    const rows = await Promise.all(
      athleteProfiles.map(async (athlete) => {
        const [latestCheckin, checkins, notes] = await Promise.all([
          this.prisma.emotionCheckin.findFirst({
            where: { athleteUserId: athlete.userId },
            orderBy: { createdAt: 'desc' }
          }),
          this.prisma.emotionCheckin.findMany({
            where: { athleteUserId: athlete.userId },
            orderBy: { createdAt: 'desc' },
            take: 5
          }),
          this.prisma.note.findMany({
            where: { athleteUserId: athlete.userId },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
        ]);

        const visibleNotes = this.filterVisibleNotes(role, notes);
        const events = [
          ...checkins.map((c) => ({
            type: 'CHECKIN' as const,
            createdAt: c.createdAt,
            preview: `Mood ${c.moodScore}/10 Stress ${c.stressScore}/10`
          })),
          ...visibleNotes.map((n) => ({
            type: 'NOTE' as const,
            createdAt: n.createdAt,
            preview: n.text
          }))
        ]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5);

        return {
          athleteUserId: athlete.userId,
          name: athlete.name,
          sport: athlete.sport,
          goalText: athlete.goalText,
          latestMoodScore: latestCheckin?.moodScore ?? null,
          latestStressScore: latestCheckin?.stressScore ?? null,
          latestCheckinAt: latestCheckin?.createdAt ?? null,
          lastEvents: events
        };
      })
    );

    return rows;
  }

  async getAthleteDetail(userId: string, role: Role, athleteUserId: string) {
    const athleteProfile = await this.assertClubAccess(userId, role, athleteUserId);

    const [checkins, notes] = await Promise.all([
      this.prisma.emotionCheckin.findMany({
        where: { athleteUserId },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.note.findMany({
        where: { athleteUserId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const visibleNotes = this.filterVisibleNotes(role, notes);

    if (role === Role.COACH) {
      const grouped = new Map<string, { moodTotal: number; stressTotal: number; count: number }>();
      for (const checkin of checkins) {
        const key = checkin.createdAt.toISOString().slice(0, 10);
        const current = grouped.get(key) ?? { moodTotal: 0, stressTotal: 0, count: 0 };
        current.moodTotal += checkin.moodScore;
        current.stressTotal += checkin.stressScore;
        current.count += 1;
        grouped.set(key, current);
      }

      const aggregatedCheckins = Array.from(grouped.entries())
        .map(([date, value]) => ({
          date,
          moodAvg: Number((value.moodTotal / value.count).toFixed(2)),
          stressAvg: Number((value.stressTotal / value.count).toFixed(2))
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      return {
        athlete: athleteProfile,
        checkinsAggregated: aggregatedCheckins,
        notes: visibleNotes
      };
    }

    return {
      athlete: athleteProfile,
      checkins,
      notes: visibleNotes
    };
  }

  async createNote(userId: string, role: Role, athleteUserId: string, body: CreateStaffNoteDto) {
    await this.assertClubAccess(userId, role, athleteUserId);

    if (!this.canCreateVisibility(role, body.visibility)) {
      throw new ForbiddenException('You cannot create this note visibility');
    }

    return this.prisma.note.create({
      data: {
        athleteUserId,
        authorUserId: userId,
        visibility: body.visibility,
        text: body.text
      }
    });
  }

  async exportAthleteCsv(userId: string, role: Role, athleteUserId: string) {
    if (role === Role.COACH) {
      throw new ForbiddenException('Coaches cannot export CSV');
    }

    await this.assertClubAccess(userId, role, athleteUserId);

    const checkins = await this.prisma.emotionCheckin.findMany({
      where: { athleteUserId },
      orderBy: { createdAt: 'asc' }
    });

    return this.exportService.buildMetricsCsv(athleteUserId, checkins);
  }
}
