import { ApiProperty } from '@nestjs/swagger';
import { NoteVisibility } from '@atempo/shared';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateStaffNoteDto {
  @ApiProperty({ enum: NoteVisibility })
  @IsEnum(NoteVisibility)
  visibility!: NoteVisibility;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  text!: string;
}
