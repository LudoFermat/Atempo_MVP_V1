import { PrismaClient, Role, NoteVisibility, ChatSender } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.note.deleteMany();
  await prisma.emotionCheckin.deleteMany();
  await prisma.athleteProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.club.deleteMany();

  const club = await prisma.club.create({
    data: { name: 'Atempo Demo Club' }
  });

  const passwordHash = await hash('password123', 10);

  const staffData = [
    { email: 'coach1@atempo.dev', role: Role.COACH, name: 'Coach One' },
    { email: 'coach2@atempo.dev', role: Role.COACH, name: 'Coach Two' },
    { email: 'psyclub1@atempo.dev', role: Role.PSY_CLUB, name: 'Psy Club One' },
    { email: 'psyatempo1@atempo.dev', role: Role.PSY_ATEMPO, name: 'Psy Atempo One' }
  ];

  const staffUsers = await Promise.all(
    staffData.map(async (s) =>
      prisma.user.create({
        data: {
          email: s.email,
          passwordHash,
          role: s.role,
          staffProfile: {
            create: {
              clubId: club.id,
              name: s.name
            }
          }
        }
      })
    )
  );

  const athletes = await Promise.all(
    Array.from({ length: 10 }).map(async (_, idx) => {
      const number = idx + 1;
      return prisma.user.create({
        data: {
          email: `athlete${number}@atempo.dev`,
          passwordHash,
          role: Role.ATHLETE,
          athleteProfile: {
            create: {
              clubId: club.id,
              name: `Athlete ${number}`,
              sport: number % 2 === 0 ? 'Running' : 'Football',
              goalText: `Goal ${number}: Improve consistency`
            }
          }
        },
        include: {
          athleteProfile: true
        }
      });
    })
  );

  for (const athlete of athletes) {
    await prisma.emotionCheckin.createMany({
      data: [
        {
          athleteUserId: athlete.id,
          moodScore: 6,
          stressScore: 5,
          noteText: 'Seed check-in day -2',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          athleteUserId: athlete.id,
          moodScore: 7,
          stressScore: 4,
          noteText: 'Seed check-in day -1',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]
    });

    await prisma.note.createMany({
      data: [
        {
          athleteUserId: athlete.id,
          authorUserId: staffUsers[0].id,
          visibility: NoteVisibility.COACH_VISIBLE,
          text: 'Good training progression.'
        },
        {
          athleteUserId: athlete.id,
          authorUserId: staffUsers[3].id,
          visibility: NoteVisibility.INTERNAL,
          text: 'Internal psych note for follow-up.'
        }
      ]
    });

    await prisma.chatMessage.createMany({
      data: [
        {
          athleteUserId: athlete.id,
          sender: ChatSender.ATHLETE,
          text: 'I feel a bit tense before competition.'
        },
        {
          athleteUserId: athlete.id,
          sender: ChatSender.AI,
          text: 'Try 3 deep-breath cycles and focus on one actionable step.'
        }
      ]
    });
  }

  console.log('Seed completed with demo credentials password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
