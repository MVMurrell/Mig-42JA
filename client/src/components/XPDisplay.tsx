import React from 'react';
import { Progress } from "@/components/ui/progress.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { calculateXPRequiredForLevel, calculateLevelFromXP } from '@shared/xpSystem.ts';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient.ts';
import { Skeleton } from "@/components/ui/skeleton.tsx";

interface XPDisplayProps {
  userId?: string;
  className?: string;
  showProgress?: boolean;
  showLevel?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

interface XPData {
  currentXP: number;
  currentLevel: number;
}

export const XPDisplay: React.FC<XPDisplayProps> = ({
  userId,
  className = '',
  showProgress = true,
  showLevel = true,
  variant = 'default'
}) => {
  const { data: xpData, isLoading } = useQuery<XPData>({
    queryKey: ['/api/xp/user', userId],
    queryFn: () => apiRequest('/api/xp/user'),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Skeleton className="h-6 w-16" />
        {showProgress && <Skeleton className="h-2 w-20" />}
      </div>
    );
  }

  if (!xpData) {
    return null;
  }

  const { currentXP, currentLevel } = xpData;
  const currentLevelXP = calculateXPRequiredForLevel(currentLevel);
  const nextLevelXP = calculateXPRequiredForLevel(currentLevel + 1);
  const progressXP = currentXP - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const progressPercentage = (progressXP / neededXP) * 100;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLevel && (
          <Badge variant="secondary" className="text-xs">
            Lv.{currentLevel}
          </Badge>
        )}
        <span className="text-sm font-medium">{currentXP.toLocaleString()} XP</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {showLevel && (
              <Badge variant="default" className="text-sm">
                Level {currentLevel}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()}
          </span>
        </div>
        {showProgress && (
          <div className="space-y-1">
            <Progress value={progressPercentage} className="w-full h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level {currentLevel}</span>
              <span>Level {currentLevel + 1}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showLevel && (
        <Badge variant="default" className="text-sm">
          Level {currentLevel}
        </Badge>
      )}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">
          {currentXP.toLocaleString()} XP
        </span>
        {showProgress && (
          <div className="flex items-center space-x-1">
            <Progress value={progressPercentage} className="w-16 h-2" />
            <span className="text-xs text-muted-foreground">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default XPDisplay;