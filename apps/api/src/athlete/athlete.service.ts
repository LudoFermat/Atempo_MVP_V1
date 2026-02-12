import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatSender } from '@atempo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckinDto, CreateChatMessageDto, OnboardingDto } from './dto';

@Injectable()
export class AthleteService {
  constructor(private readonly prisma: PrismaService) {}

  assertScoreRange(score: number) {
    if (score < 1 || score > 10) {
      throw new BadRequestException('Scores must be between 1 and 10');
    }
  }

  async onboarding(userId: string, body: OnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { athleteProfile: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.athleteProfile) {
      return this.prisma.athleteProfile.update({
        where: { userId },
        data: {
          name: body.name,
          sport: body.sport,
          goalText: body.goalText
        }
      });
    }

    const demoClub = await this.prisma.club.findFirst();
    if (!demoClub) {
      throw new NotFoundException('Demo club not found');
    }

    return this.prisma.athleteProfile.create({
      data: {
        userId,
        clubId: demoClub.id,
        name: body.name,
        sport: body.sport,
        goalText: body.goalText
      }
    });
  }

  async home(userId: string) {
    const [profile, lastCheckin] = await Promise.all([
      this.prisma.athleteProfile.findUnique({ where: { userId } }),
      this.prisma.emotionCheckin.findFirst({
        where: { athleteUserId: userId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      hasOnboarding: Boolean(profile),
      profile,
      latestCheckin: lastCheckin
        ? {
            moodScore: lastCheckin.moodScore,
            stressScore: lastCheckin.stressScore,
            createdAt: lastCheckin.createdAt
          }
        : null
    };
  }

  async createCheckin(userId: string, body: CreateCheckinDto) {
    this.assertScoreRange(body.moodScore);
    this.assertScoreRange(body.stressScore);

    return this.prisma.emotionCheckin.create({
      data: {
        athleteUserId: userId,
        moodScore: body.moodScore,
        stressScore: body.stressScore,
        noteText: body.noteText
      }
    });
  }

  listCheckins(userId: string) {
    return this.prisma.emotionCheckin.findMany({
      where: { athleteUserId: userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  listChat(userId: string) {
    return this.prisma.chatMessage.findMany({
      where: { athleteUserId: userId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async sendChatMessage(userId: string, body: CreateChatMessageDto) {
    const athleteMessage = await this.prisma.chatMessage.create({
      data: {
        athleteUserId: userId,
        sender: ChatSender.ATHLETE,
        text: body.text
      }
    });

    const aiText = this.buildAiStubResponse(body.text);

    const aiMessage = await this.prisma.chatMessage.create({
      data: {
        athleteUserId: userId,
        sender: ChatSender.AI,
        text: aiText
      }
    });

    return { athleteMessage, aiMessage };
  }

  private buildAiStubResponse(input: string) {
    return `AI stub: gracias por compartir "${input}". Te propongo una respiracion 4-4-4 y definir una accion concreta hoy.`;
  }
}
