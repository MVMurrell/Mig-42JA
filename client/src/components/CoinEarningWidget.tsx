/**
 * Coin Earning Widget Component
 * Displays coin earning controls and statistics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Coins, MapPin, Clock, Trophy, Play, Square } from 'lucide-react';
import { useCoinEarning } from '@/hooks/useCoinEarning.ts';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { useQuery } from '@tanstack/react-query';


export function CoinEarningWidget() {
  const {
    isTracking,
    stats,
    lastUpdate,
    processDailyLogin,
    startTracking,
    stopTracking,
    fetchStats,
  } = useCoinEarning();
  
  // Sound effects hook
  const playButtonSound = useButtonSound();

  const [hasClaimed, setHasClaimed] = useState(false);

  // Auto-claim daily login on component mount
  useEffect(() => {
    const autoClaimDailyLogin = async () => {
      const result = await processDailyLogin();
      if (result.coinsAwarded > 0) {
        setHasClaimed(true);
      }
    };
    
    autoClaimDailyLogin();
  }, []);

  const handleTrackingToggle = async () => {
    playButtonSound();
    if (isTracking) {
      await stopTracking();
    } else {
      const success = await startTracking();
      if (!success) {
        // Handle failure case if needed
      }
    }
  };

  const formatDistance = (distance: number | undefined | null) => {
    if (!distance || distance === 0) {
      return '0 mi';
    }
    if (distance < 0.1) {
      return `${(distance * 5280).toFixed(0)} ft`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} mi`;
    } else {
      return `${distance.toFixed(0)} mi`;
    }
  };

  const formatMovementType = (type: string) => {
    switch (type) {
      case 'walking': return 'Walking 🚶‍♂️';
      case 'cycling': return 'Cycling 🚴‍♂️';
      case 'driving': return 'Driving 🚗';
      case 'stationary': return 'Stationary ⏸️';
      default: return type;
    }
  };

  // Calculate progress to next milestone
  const getNextMilestone = (distance: number) => {
    if (distance < 5) return { target: 5, reward: 5 };
    if (distance < 10) return { target: 10, reward: 10 };
    if (distance < 20) return { target: 20, reward: 20 };
    return { target: 20, reward: 20 }; // Max milestone
  };

  const sessionDistance = stats?.activeSession?.sessionDistance || 0;
  const nextMilestone = getNextMilestone(sessionDistance);
  const progressPercent = Math.min((sessionDistance / nextMilestone.target) * 100, 100);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5 text-yellow-500" />
          Coin Earning
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.totalCoinsEarned}</div>
              <div className="text-xs text-muted-foreground">Total Coins</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatDistance(stats.totalDistance)}</div>
              <div className="text-xs text-muted-foreground">Total Distance</div>
            </div>
          </div>
        )}

        {/* Daily Login Streak */}
        {stats && stats.dailyLoginStreak > 0 && (
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Login Streak</span>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              {stats.dailyLoginStreak} day{stats.dailyLoginStreak > 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        {/* Active Session Info */}
        {stats?.activeSession && (
          <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">Active Session</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {stats.activeSession.coinsEarned} coins earned
              </Badge>
            </div>
            
            <div className="text-sm text-green-700">
              <div>Distance: {formatDistance(sessionDistance)}</div>
              {lastUpdate && (
                <div>Status: {formatMovementType(lastUpdate.movementType)}</div>
              )}
            </div>

            {/* Milestone Progress */}
            {sessionDistance < nextMilestone.target && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-green-600">
                  <span>Next milestone: {nextMilestone.target} mi</span>
                  <span>+{nextMilestone.reward} coins</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Distance Tracking Controls */}
        <div className="space-y-2">
          <Button
            onClick={handleTrackingToggle}
            className={`w-full ${isTracking 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
            }`}
            size="lg"
          >
            {isTracking ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Tracking
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Distance Tracking
              </>
            )}
          </Button>
          

          
          <div className="text-xs text-muted-foreground text-center">
            Earn 1 coin per mile walked or cycled
          </div>
        </div>

        {/* Milestone Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Daily Milestones
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-bold">5 mi</div>
              <div className="text-muted-foreground">+5 coins</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-bold">10 mi</div>
              <div className="text-muted-foreground">+10 coins</div>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-bold">20 mi</div>
              <div className="text-muted-foreground">+20 coins</div>
            </div>
          </div>
        </div>

        {/* Location Permission Notice */}
        <div className="text-xs text-muted-foreground p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-blue-800 mb-1">Location Required</div>
              <div className="text-blue-700">
                We track your movement to award distance-based coins. 
                Driving speeds don't count to prevent abuse.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      

    </Card>
  );
}