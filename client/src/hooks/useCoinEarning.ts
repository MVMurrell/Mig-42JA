/**
 * Hook for managing coin earning functionality
 * Handles daily login rewards and location-based distance tracking
 */

import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient.ts';
import { useToast } from '@/hooks/use-toast.ts';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

interface CoinEarningStats {
  totalCoinsEarned: number;
  totalDistance: number;
  dailyLoginStreak: number;
  activeSession?: {
    sessionDistance: number;
    coinsEarned: number;
    sessionStart: Date;
  };
}

interface LocationUpdateResult {
  coinsAwarded: number;
  totalDistance: number;
  sessionDistance: number;
  movementType: string;
  milestoneReached?: string;
}

export function useCoinEarning() {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<CoinEarningStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<LocationUpdateResult | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Process daily login reward
  const processDailyLogin = async () => {
    try {
      const result = await apiRequest('/api/coins/daily-login', 'POST');
      
      if (result.coinsAwarded > 0) {
        toast({
          title: "Daily Login Bonus!",
          description: result.message || `You earned ${result.coinsAwarded} coin!`,
          duration: 3000,
        });
      }
      
      // Refresh stats after daily login
      await fetchStats();
      
      return result;
    } catch (error) {
      console.error('Daily login error:', error);
      return { coinsAwarded: 0 };
    }
  };

  // Start location tracking session
  const startTracking = async () => {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        toast({
          title: "Location Not Supported",
          description: "Your device doesn't support location tracking.",
          variant: "destructive",
        });
        return false;
      }

      // Request location permission with laptop/desktop fallback
      const permission = await new Promise<PositionOptions>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({}),
          (error) => {
            console.log('Location error:', error);
            if (error.code === error.PERMISSION_DENIED) {
              reject(new Error('Location permission denied. For activity tracking on laptops/desktops, please enable location services in your browser settings.'));
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              reject(new Error('Location unavailable. Activity tracking works best on mobile devices with GPS. Desktop/laptop tracking may have limited accuracy.'));
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: false, // Less strict for laptops
            timeout: 15000, // Longer timeout for laptops
            maximumAge: 300000 // 5 minutes cache for laptops
          }
        );
      });

      // Start session
      const result = await apiRequest('/api/coins/start-session', 'POST');
      setSessionId(result.sessionId);

      // Start watching position with laptop-friendly settings
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleLocationUpdate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            altitude: position.coords.altitude || undefined,
          });
        },
        (error) => {
          console.error('Location tracking error:', error);
          toast({
            title: "Location Error",
            description: "Failed to track location. Please check your GPS settings.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        }
      );

      watchIdRef.current = watchId;
      setIsTracking(true);

      toast({
        title: "Tracking Started",
        description: "Earn coins as you walk and cycle!",
        duration: 3000,
      });

      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      
      if (error instanceof Error && error.message.includes('permission')) {
        toast({
          title: "Location Permission Required",
          description: "Please enable location access to earn distance-based coins.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tracking Failed",
          description: "Unable to start location tracking.",
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  // Handle location updates
  const handleLocationUpdate = async (location: LocationData) => {
    try {
      const result = await apiRequest('/api/coins/location-update', 'POST', location);
      
      setLastUpdate(result);

      // Show milestone notifications
      if (result.milestoneReached) {
        toast({
          title: "Milestone Reached! 🎉",
          description: `${result.milestoneReached} You earned ${result.coinsAwarded} coins!`,
          duration: 5000,
        });
      } else if (result.coinsAwarded > 0) {
        toast({
          title: "Distance Reward!",
          description: `You earned ${result.coinsAwarded} coin${result.coinsAwarded > 1 ? 's' : ''} for walking!`,
          duration: 3000,
        });
      }

      // Update stats after location update
      await fetchStats();
      
    } catch (error) {
      console.error('Location update error:', error);
    }
  };

  // Stop location tracking
  const stopTracking = async () => {
    try {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (sessionId) {
        await apiRequest('/api/coins/end-session', 'POST');
        setSessionId(null);
      }

      setIsTracking(false);
      setLastUpdate(null);

      toast({
        title: "Tracking Stopped",
        description: "Distance tracking has been disabled.",
        duration: 2000,
      });

      // Refresh stats after stopping
      await fetchStats();
      
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  };

  // Fetch user's coin earning stats
  const fetchStats = async () => {
    try {
      const result = await apiRequest('/api/coins/stats', 'GET');
      setStats(result);
      return result;
    } catch (error) {
      console.error('Failed to fetch coin stats:', error);
      return null;
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    sessionId,
    stats,
    lastUpdate,
    processDailyLogin,
    startTracking,
    stopTracking,
    fetchStats,
  };
}