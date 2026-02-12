import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@atempo/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AthleteService } from './athlete.service';
import { CreateCheckinDto, CreateChatMessageDto, OnboardingDto } from './dto';

@ApiTags('athlete')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ATHLETE)
@Controller('athlete')
export class AthleteController {
  constructor(private readonly athleteService: AthleteService) {}

  @Post('onboarding')
  onboarding(@CurrentUser('sub') userId: string, @Body() body: OnboardingDto) {
    return this.athleteService.onboarding(userId, body);
  }

  @Get('home')
  home(@CurrentUser('sub') userId: string) {
    return this.athleteService.home(userId);
  }

  @Post('checkins')
  createCheckin(@CurrentUser('sub') userId: string, @Body() body: CreateCheckinDto) {
    return this.athleteService.createCheckin(userId, body);
  }

  @Get('checkins')
  listCheckins(@CurrentUser('sub') userId: string) {
    return this.athleteService.listCheckins(userId);
  }

  @Get('chat')
  listChat(@CurrentUser('sub') userId: string) {
    return this.athleteService.listChat(userId);
  }

  @Post('chat')
  sendChatMessage(@CurrentUser('sub') userId: string, @Body() body: CreateChatMessageDto) {
    return this.athleteService.sendChatMessage(userId, body);
  }
}
