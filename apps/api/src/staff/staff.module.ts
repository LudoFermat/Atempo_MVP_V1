import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { ExportService } from './export.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService, ExportService],
  exports: [StaffService, ExportService]
})
export class StaffModule {}
