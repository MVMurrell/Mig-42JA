export interface TreasureChest {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  difficulty: string;
  spawnedAt: string;
  expiresAt: string;
  isCollected: boolean;
  nearestVideoId?: string;
  nearestVideoDistance?: number;
}