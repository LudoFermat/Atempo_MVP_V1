import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@atempo/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateStaffNoteDto } from './dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.COACH, Role.PSY_CLUB, Role.PSY_ATEMPO)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('athletes')
  listAthletes(@CurrentUser('sub') userId: string, @CurrentUser('role') role: Role) {
    return this.staffService.listAthletes(userId, role);
  }

  @Get('athletes/:athleteUserId')
  getAthleteDetail(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('athleteUserId') athleteUserId: string
  ) {
    return this.staffService.getAthleteDetail(userId, role, athleteUserId);
  }

  @Post('athletes/:athleteUserId/notes')
  createNote(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('athleteUserId') athleteUserId: string,
    @Body() body: CreateStaffNoteDto
  ) {
    return this.staffService.createNote(userId, role, athleteUserId, body);
  }

  @Get('athletes/:athleteUserId/export.csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="athlete-metrics.csv"')
  exportCsv(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('athleteUserId') athleteUserId: string
  ) {
    return this.staffService.exportAthleteCsv(userId, role, athleteUserId);
  }
}
