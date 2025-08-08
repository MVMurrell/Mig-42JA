import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Sparkles, Clock, MapPin, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useLocation } from 'wouter';
import coinsImage from '@assets/Coins_1752104970427.png';
import dragonImage from '@assets/Dragon_1752105853943.png';

interface DragonAttack {
  id: string;
  userId: string;
  videoId: string;
  damage: number;
  attackedAt: Date;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImageUrl?: string;
  readyPlayerMeAvatarUrl?: string;
}

interface DragonAttacker {
  userId: string;
  totalDamage: number;
  profile?: UserProfile;
}

interface DragonDetails {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  totalHealth: number;
  currentHealth: number;
  videoCount: number;
  nearestVideoIds: string[];
  expiresAt: Date;
  attacks: DragonAttack[];
  attackers: DragonAttacker[];
}

interface DragonModalProps {
  dragonId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDragonDefeated?: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Calculate distance between two coordinates in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Format distance for display in feet
function formatDistance(meters: number): string {
  const feet = meters * 3.28084; // Convert meters to feet
  if (feet < 1000) {
    return `${Math.round(feet)} ft`;
  } else {
    const miles = feet / 5280;
    return `${miles.toFixed(1)} mi`;
  }
}

// Component to display clickable attacker profiles
function AttackerProfile({ attacker, onClose }: { attacker: DragonAttacker; onClose?: () => void }) {
  const [, setLocation] = useLocation();

  // Get current user data to check if this is the current user's profile
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: [`/api/users/${attacker.userId}/profile`],
    enabled: !!attacker.userId,
  });

  const handleProfileClick = () => {
    console.log('🔍 DRAGON PROFILE CLICK: Attempting to navigate to profile:', profile?.username);
    console.log('🔍 DRAGON PROFILE CLICK: Current user ID:', currentUser?.id, 'Attacker user ID:', attacker.userId);
    
    if (profile?.username) {
      // Check if this is the current user's profile
      const isCurrentUser = currentUser?.id === attacker.userId;
      const targetRoute = isCurrentUser ? '/profile' : `/profile/${profile.username}`;
      
      console.log('🔍 DRAGON PROFILE CLICK: Is current user:', isCurrentUser, 'Navigating to:', targetRoute);
      
      // Close the modal first to ensure navigation works properly
      if (onClose) {
        onClose();
      }
      // Use a small delay to ensure modal closes before navigation
      setTimeout(() => {
        setLocation(targetRoute);
      }, 100);
    } else {
      console.log('🔍 DRAGON PROFILE CLICK: No username available for navigation');
    }
  };

  const displayName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.username 
    ? profile.username
    : `User ${attacker.userId.slice(-8)}`;

  const profileImage = profile?.readyPlayerMeAvatarUrl || profile?.profileImageUrl;

  return (
    <div 
      key={attacker.userId} 
      className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
      onClick={handleProfileClick}
    >
      <div className="flex items-center space-x-2">
        {profileImage ? (
          <img 
            src={profileImage} 
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
          {displayName}
        </span>
      </div>
      <span className="font-medium text-gray-900 dark:text-white">
        {attacker.totalDamage} dmg
      </span>
    </div>
  );
}

export default function DragonModal({ dragonId, isOpen, onClose, onDragonDefeated, userLocation }: DragonModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: dragon, refetch } = useQuery<DragonDetails>({
    queryKey: [`/api/dragons/${dragonId}`],
    enabled: isOpen && !!dragonId,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const attackMutation = useMutation({
    mutationFn: async ({ videoId }: { videoId: string }) => {
      return apiRequest(`/api/dragons/${dragonId}/attack`, 'POST', { videoId });
    },
    onSuccess: (result) => {
      if (result.dragonDefeated) {
        toast({
          title: "🐉 Dragon Defeated!",
          description: `Congratulations! You earned ${result.coinsEarned} coins!`,
        });
        onDragonDefeated?.();
        onClose();
      } else {
        toast({
          title: "⚔️ Attack Successful!",
          description: result.message,
        });
      }
      // Refresh dragon data and coins
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Attack Failed",
        description: error.message || "Failed to attack dragon",
        variant: "destructive",
      });
    }
  });

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const handleAttack = () => {
    if (!selectedVideoId) {
      toast({
        title: "Select a Jem",
        description: "Please select a Jem to watch for your attack",
        variant: "destructive",
      });
      return;
    }
    
    attackMutation.mutate({ videoId: selectedVideoId });
  };

  if (!dragon) return null;

  const healthPercentage = (dragon.currentHealth / dragon.totalHealth) * 100;
  const isDefeated = dragon.currentHealth <= 0;
  
  // Calculate distance from user to dragon
  const userDistance = userLocation ? calculateDistance(
    userLocation.lat,
    userLocation.lng,
    parseFloat(dragon.latitude),
    parseFloat(dragon.longitude)
  ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-0 z-[9999]">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-xl font-bold text-center text-gray-900 dark:text-white flex items-center justify-center space-x-2">
            <img src={dragonImage} alt="Dragon" className="w-8 h-8" />
            <span>Ancient Dragon</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-4 space-y-4">
          {/* How Dragons Work */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How to Defeat Dragons:</p>
              <p className="text-xs">
                Work together to watch Jems within the dragon's attack radius to deal damage. When health reaches zero, all attackers share the coin reward!
              </p>
            </div>
          </div>
          {/* Dragon Status */}
          <div className="text-center">
            {isDefeated ? (
              <Badge variant="destructive" className="text-sm">
                Defeated
              </Badge>
            ) : (
              <Badge variant="default" className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Active
              </Badge>
            )}
          </div>

          {/* Health Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Health
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {dragon.currentHealth} / {dragon.totalHealth}
              </span>
            </div>
            <Progress value={healthPercentage} className="h-3" />
          </div>

          {/* Reward Info */}
          <div className="flex items-center justify-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <img src={coinsImage} alt="Coins" className="w-6 h-6" />
            <span className="font-bold text-yellow-800 dark:text-yellow-200">
              {dragon.coinReward} Coins Reward
            </span>
            <Sparkles className="w-4 h-4 text-yellow-600" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Expires</div>
              <div className="font-bold text-gray-900 dark:text-white text-xs">
                {formatTimeRemaining(dragon.expiresAt)}
              </div>
            </div>
            
            {userDistance !== null && (
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Distance</div>
                <div className="font-bold text-gray-900 dark:text-white text-xs">
                  {formatDistance(userDistance)}
                </div>
              </div>
            )}
          </div>

          {/* Distance */}
          {userLocation && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {formatDistance(
                  calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    parseFloat(dragon.latitude),
                    parseFloat(dragon.longitude)
                  )
                )} away
              </span>
            </div>
          )}

          {/* Attack Progress */}
          {dragon.attackers && dragon.attackers.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Attackers ({dragon.attackers.length})
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {dragon.attackers.map((attacker, index) => (
                  <AttackerProfile key={index} attacker={attacker} onClose={onClose} />
                ))}
              </div>
            </div>
          )}



          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}