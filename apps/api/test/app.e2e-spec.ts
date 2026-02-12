import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type UserRow = {
  id: string;
  email: string;
  role: 'ATHLETE' | 'COACH' | 'PSY_CLUB' | 'PSY_ATEMPO';
  passwordHash: string;
};

function createMockPrisma(users: UserRow[]) {
  const athleteProfiles = [
    {
      userId: 'ath1',
      clubId: 'club1',
      name: 'Athlete One',
      sport: 'Running',
      goalText: 'Improve consistency',
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    }
  ];

  const staffProfiles = [
    {
      userId: 'coach1',
      clubId: 'club1',
      name: 'Coach One',
      createdAt: new Date('2026-01-01T00:00:00.000Z')
    }
  ];

  const checkins = [
    {
      id: 'c1',
      athleteUserId: 'ath1',
      moodScore: 8,
      stressScore: 4,
      noteText: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z')
    }
  ];

  const notes = [
    {
      id: 'n1',
      athleteUserId: 'ath1',
      authorUserId: 'coach1',
      visibility: 'COACH_VISIBLE',
      text: 'Public note',
      createdAt: new Date('2026-01-03T00:00:00.000Z')
    },
    {
      id: 'n2',
      athleteUserId: 'ath1',
      authorUserId: 'coach1',
      visibility: 'INTERNAL',
      text: 'Internal note',
      createdAt: new Date('2026-01-04T00:00:00.000Z')
    }
  ];

  return {
    user: {
      findUnique: jest.fn(async (args: any) => {
        if (args.where?.email) {
          return users.find((u) => u.email === args.where.email) ?? null;
        }

        if (args.where?.id) {
          const found = users.find((u) => u.id === args.where.id);
          if (!found) return null;
          if (args.include?.athleteProfile) {
            return {
              ...found,
              athleteProfile: athleteProfiles.find((a) => a.userId === found.id) ?? null
            };
          }
          return found;
        }

        return null;
      })
    },
    staffProfile: {
      findUnique: jest.fn(async (args: any) => {
        return staffProfiles.find((s) => s.userId === args.where.userId) ?? null;
      })
    },
    athleteProfile: {
      findUnique: jest.fn(async (args: any) => {
        return athleteProfiles.find((a) => a.userId === args.where.userId) ?? null;
      }),
      findMany: jest.fn(async (args: any) => {
        if (!args.where) return athleteProfiles;
        return athleteProfiles.filter((a) => a.clubId === args.where.clubId);
      })
    },
    emotionCheckin: {
      findFirst: jest.fn(async (args: any) => {
        return checkins.find((c) => c.athleteUserId === args.where.athleteUserId) ?? null;
      }),
      findMany: jest.fn(async (args: any) => {
        const rows = checkins.filter((c) => c.athleteUserId === args.where.athleteUserId);
        return args.take ? rows.slice(0, args.take) : rows;
      })
    },
    note: {
      findMany: jest.fn(async (args: any) => {
        const rows = notes.filter((n) => n.athleteUserId === args.where.athleteUserId);
        return args.take ? rows.slice(0, args.take) : rows;
      }),
      create: jest.fn(async ({ data }: any) => ({ id: 'n3', createdAt: new Date(), ...data }))
    },
    chatMessage: {
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => ({ id: 'm1', createdAt: new Date(), ...data }))
    },
    club: {
      findFirst: jest.fn(async () => ({ id: 'club1', name: 'Demo club' }))
    }
  };
}

describe('App e2e', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'access-secret-dev';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret-dev';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    const users: UserRow[] = [
      {
        id: 'ath1',
        email: 'athlete1@atempo.dev',
        role: 'ATHLETE',
        passwordHash: await hash('password123', 10)
      },
      {
        id: 'coach1',
        email: 'coach1@atempo.dev',
        role: 'COACH',
        passwordHash: await hash('password123', 10)
      }
    ];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrisma(users))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('login -> refresh -> me works', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'athlete1@atempo.dev', password: 'password123' })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(201);

    expect(refreshResponse.body.accessToken).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body.user.email).toBe('athlete1@atempo.dev');
  });

  it('coach cannot see internal notes and athlete cannot access staff routes', async () => {
    const coachLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'coach1@atempo.dev', password: 'password123' })
      .expect(201);

    const detailResponse = await request(app.getHttpServer())
      .get('/staff/athletes/ath1')
      .set('Authorization', `Bearer ${coachLogin.body.accessToken}`)
      .expect(200);

    const noteTexts = detailResponse.body.notes.map((n: { text: string }) => n.text);
    expect(noteTexts).toContain('Public note');
    expect(noteTexts).not.toContain('Internal note');

    const athleteLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'athlete1@atempo.dev', password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/staff/athletes')
      .set('Authorization', `Bearer ${athleteLogin.body.accessToken}`)
      .expect(403);
  });
});
