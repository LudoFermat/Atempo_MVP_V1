export enum Role {
  ATHLETE = 'ATHLETE',
  COACH = 'COACH',
  PSY_ATEMPO = 'PSY_ATEMPO',
  PSY_CLUB = 'PSY_CLUB'
}

export enum NoteVisibility {
  INTERNAL = 'INTERNAL',
  COACH_VISIBLE = 'COACH_VISIBLE'
}

export enum ChatSender {
  ATHLETE = 'ATHLETE',
  AI = 'AI'
}

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AthleteDashboardRow = {
  athleteUserId: string;
  name: string;
  sport: string;
  goalText: string;
  latestMoodScore: number | null;
  latestStressScore: number | null;
  latestCheckinAt: string | null;
  lastEvents: Array<{
    type: 'CHECKIN' | 'NOTE';
    createdAt: string;
    preview: string;
  }>;
};
