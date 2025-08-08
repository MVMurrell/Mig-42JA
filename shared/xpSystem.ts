/**
 * XP System Utilities
 * 
 * Non-linear progression formula: XP_req = C * L^P
 * Where C = 10 (constant multiplier), P = 2 (quadratic curve)
 * 
 * Level progression:
 * Level 1: 10 * 1^2 = 10 XP
 * Level 2: 10 * 2^2 = 40 XP
 * Level 3: 10 * 3^2 = 90 XP
 * Level 4: 10 * 4^2 = 160 XP
 * Level 5: 10 * 5^2 = 250 XP
 */

// XP Constants
const XP_CONSTANT = 10;
const XP_EXPONENT = 2;

// XP Rewards based on CSV data
export const XP_REWARDS = {
  POST_VIDEO: 20,
  WATCH_VIDEO: 1,
  TEXT_COMMENT: 2,
  VIDEO_COMMENT: 5,
  FLAG_VIDEO: 25,
  CREATE_GROUP: 10,
  TRACK_LOCATION_PER_MILE: 5,
  FIND_TREASURE: 5,
  QUEST_PARTICIPATION: 10,
  QUEST_COMPLETION: 20,
  DRAGON_HELP: 1,
  DRAGON_DEFEAT: 25,
  PLAY_VIDEOS_FREE: 1,
  PLAY_VIDEOS_PAID: 1,
} as const;

// Calculate XP required to reach a specific level
export function calculateXPRequiredForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(XP_CONSTANT * Math.pow(level, XP_EXPONENT));
}

// Calculate XP needed to reach next level from current XP
export function calculateXPToNextLevel(currentXP: number, currentLevel: number): number {
  const nextLevelXP = calculateXPRequiredForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentXP);
}

// Calculate level from current XP
export function calculateLevelFromXP(currentXP: number): number {
  if (currentXP <= 0) return 0;
  
  // Binary search to find the level
  let level = 0;
  while (calculateXPRequiredForLevel(level + 1) <= currentXP) {
    level++;
  }
  return level;
}

// Calculate progress percentage for current level
export function calculateLevelProgress(currentXP: number, currentLevel: number): number {
  const currentLevelXP = calculateXPRequiredForLevel(currentLevel);
  const nextLevelXP = calculateXPRequiredForLevel(currentLevel + 1);
  
  if (nextLevelXP === currentLevelXP) return 100;
  
  const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.max(0, Math.min(100, progress));
}

// Check if user leveled up after gaining XP
export function checkLevelUp(oldXP: number, newXP: number): { leveledUp: boolean; newLevel: number; oldLevel: number } {
  const oldLevel = calculateLevelFromXP(oldXP);
  const newLevel = calculateLevelFromXP(newXP);
  
  return {
    leveledUp: newLevel > oldLevel,
    newLevel,
    oldLevel
  };
}

// Generate level progression table (for reference)
export function generateLevelTable(maxLevel: number = 50): Array<{ level: number; xpRequired: number; xpToNext: number }> {
  const table = [];
  
  for (let level = 0; level <= maxLevel; level++) {
    const xpRequired = calculateXPRequiredForLevel(level);
    const xpToNext = level < maxLevel ? calculateXPRequiredForLevel(level + 1) - xpRequired : 0;
    
    table.push({
      level,
      xpRequired,
      xpToNext
    });
  }
  
  return table;
}

export type XPRewardType = keyof typeof XP_REWARDS;