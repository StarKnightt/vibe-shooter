export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ANOMALY = 'ANOMALY',
  GAME_OVER = 'GAME_OVER'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY',
  BULLET = 'BULLET',
  PARTICLE = 'PARTICLE',
  SCRAP = 'SCRAP',
  ANOMALY_CORE = 'ANOMALY_CORE'
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  color: string;
  health: number;
  maxHealth: number;
  rotation: number;
  life?: number; // For particles/bullets
  maxLife?: number;
  value?: number; // For scrap
  owner?: 'PLAYER' | 'ENEMY'; // Who fired the bullet
  lastShot?: number; // For rate of fire
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  scrap: number;
  score: number;
  level: number;
}

export interface AnomalyOption {
  text: string;
  outcomeDescription: string;
  effect: 'HEAL' | 'DAMAGE' | 'SCRAP' | 'WEAPON' | 'NOTHING';
  value: number;
}

export interface AnomalyEvent {
  title: string;
  description: string;
  options: AnomalyOption[];
}
