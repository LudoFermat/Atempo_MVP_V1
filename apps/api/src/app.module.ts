import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AthleteModule } from './athlete/athlete.module';
import { PrismaModule } from './prisma/prisma.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Support running scripts from the monorepo root and from apps/api.
      envFilePath: ['apps/api/.env', '.env']
    }),
    PrismaModule,
    AuthModule,
    AthleteModule,
    StaffModule
  ]
})
export class AppModule {}
