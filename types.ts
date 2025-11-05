
export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  userId?: string; // Link to the User ID, if the player has an account
}

export interface Team {
  id: string;
  name: string;
  roster: Player[];
}

export enum StatType {
  GOAL = 'Goal',
  ASSIST = 'Assist',
  SHOT = 'Shot',
  SAVE = 'Save',
  GROUND_BALL = 'Ground Ball',
  TURNOVER = 'Turnover',
  CAUSED_TURNOVER = 'Caused Turnover',
  FACEOFF_WIN = 'Faceoff Win',
  FACEOFF_LOSS = 'Faceoff Loss',
}

export interface Stat {
  id: string;
  playerId: string;
  teamId: string;
  type: StatType;
  timestamp: number; // in-game clock time in seconds
  assistingPlayerId?: string;
}

export enum PenaltyType {
  SLASHING = 'Slashing',
  TRIPPING = 'Tripping',
  CROSS_CHECK = 'Cross Check',
  UNSPORTSMANLIKE_CONDUCT = 'Unsportsmanlike Conduct',
  ILLEGAL_BODY_CHECK = 'Illegal Body Check',
  HOLDING = 'Holding',
  INTERFERENCE = 'Interference',
  ILLEGAL_PROCEDURE = 'Illegal Procedure',
  PUSHING = 'Pushing',
  OFFSIDES = 'Offsides',
  WARDING = 'Warding',
  ILLEGAL_STICK = 'Illegal Stick'
}

export interface Penalty {
  id: string;
  playerId: string;
  teamId: string;
  type: PenaltyType;
  duration: number; // seconds
  startTime: number; // game clock time when penalty occurred
  releaseTime: number; // game clock time when player is released
}

export interface Game {
  id:string;
  homeTeam: Team;
  awayTeam: Team;
  scheduledTime: string;
  status: 'scheduled' | 'live' | 'finished';
  score: {
    home: number;
    away: number;
  };
  stats: Stat[];
  penalties: Penalty[];
  currentPeriod: number;
  gameClock: number; // seconds remaining in the period
  aiSummary?: string;
}

export enum Role {
  ADMIN = 'Admin',
  COACH = 'Coach',
  PARENT = 'Parent',
  PLAYER = 'Player',
  FAN = 'Fan',
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In a real app, this should be a hash.
  role: Role;
  teamIds?: string[]; // For coaches/players, teams they are a member of
  followedTeamIds?: string[]; // For parents, teams they are watching
  followedPlayerIds?: string[]; // For parents, players they are watching
  status?: 'active' | 'blocked';
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export interface AccessRequest {
  id: string;
  requestingUserId: string; // User ID of the player requesting access
  teamId: string;
  playerName: string; // The user's name at the time of request
  playerJersey: string;
  playerPosition?: string; 
  status: RequestStatus;
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

export interface ParentInvitation {
  id: string;
  invitingPlayerId: string; // The User ID of the player
  teamId: string; // The team the player was on when inviting
  parentEmail: string; // The email of the parent to be invited
  invitationCode: string; // A unique code
  status: InvitationStatus;
}

export enum DrillType {
  FACE_OFF = 'Face-Off',
  SHOOTING = 'Shooting',
}

export enum DrillStatus {
  ASSIGNED = 'Assigned',
  COMPLETED = 'Completed',
}

export interface DrillAssignment {
  id: string;
  assigningCoachId: string; // User ID of the coach
  playerId: string; // User ID of the player
  drillType: DrillType;
  notes: string;
  status: DrillStatus;
  assignedDate: string; // ISO string
  completedDate?: string; // ISO string
  results?: {
    reactionTimes?: number[]; // For face-off
    shotHistory?: number[];   // For shooting
  };
}

export type SoundEffectName = 'down' | 'set' | 'whistle';

export interface SoundEffects {
  down?: string; // Base64 encoded audio data
  set?: string;
  whistle?: string;
}

export enum FeedbackType {
  BUG_REPORT = 'Bug Report',
  FEATURE_REQUEST = 'Feature Request',
  GENERAL_COMMENT = 'General Comment',
}

export enum FeedbackStatus {
  NEW = 'New',
  VIEWED = 'Viewed',
  RESOLVED = 'Resolved',
}

export interface Feedback {
  id: string;
  userId: string;
  username: string;
  userRole: Role;
  type: FeedbackType;
  message: string;
  timestamp: string; // ISO string
  status: FeedbackStatus;
}