import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class OnboardingDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  sport!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  goalText!: string;
}

export class CreateCheckinDto {
  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  moodScore!: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  stressScore!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteText?: string;
}

export class CreateChatMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  text!: string;
}
