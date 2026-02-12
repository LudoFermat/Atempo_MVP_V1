import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@atempo/shared';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/jwt-user.type';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.signTokens({ sub: user.id, email: user.email, role: user.role as Role });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role
      }
    };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'refresh-secret-dev';

    let payload: JwtUser;
    try {
      payload = await this.jwtService.verifyAsync<JwtUser>(refreshToken, {
        secret: refreshSecret
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.signTokens({ sub: user.id, email: user.email, role: user.role as Role });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        athleteProfile: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profileStatus =
      user.role === Role.ATHLETE && !user.athleteProfile ? 'NEEDS_ONBOARDING' : 'COMPLETE';

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role
      },
      profileStatus
    } as const;
  }

  private async signTokens(payload: JwtUser): Promise<TokenPair> {
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'access-secret-dev',
        expiresIn: accessExpiresIn
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'refresh-secret-dev',
        expiresIn: refreshExpiresIn
      })
    ]);

    return { accessToken, refreshToken };
  }
}
