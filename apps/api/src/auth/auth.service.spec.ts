import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prismaMock = {
    user: {
      findUnique: jest.fn()
    }
  };

  const configMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret-dev',
        JWT_REFRESH_SECRET: 'refresh-secret-dev',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d'
      };
      return values[key];
    })
  };

  const jwtMock = {
    signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
    verifyAsync: jest.fn()
  };

  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock }
      ]
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await hash('password123', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'athlete1@atempo.dev',
      role: 'ATHLETE',
      passwordHash
    });
    jwtMock.signAsync = jest
      .fn()
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login('athlete1@atempo.dev', 'password123');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.role).toBe('ATHLETE');
  });

  it('throws for invalid password', async () => {
    const passwordHash = await hash('other-password', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'athlete1@atempo.dev',
      role: 'ATHLETE',
      passwordHash
    });

    await expect(service.login('athlete1@atempo.dev', 'password123')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
