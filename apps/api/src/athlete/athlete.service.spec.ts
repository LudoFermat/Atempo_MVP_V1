import { BadRequestException } from '@nestjs/common';
import { AthleteService } from './athlete.service';

describe('AthleteService', () => {
  const prismaMock = {} as never;
  const service = new AthleteService(prismaMock);

  it('validates score range', () => {
    expect(() => service.assertScoreRange(0)).toThrow(BadRequestException);
    expect(() => service.assertScoreRange(11)).toThrow(BadRequestException);
    expect(() => service.assertScoreRange(5)).not.toThrow();
  });
});
