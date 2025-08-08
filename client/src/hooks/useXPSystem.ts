import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient.ts';
import { XPRewardType } from '@shared/xpSystem.ts';

interface XPResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  currentXP: number;
  nextLevelXP: number;
}

interface XPNotificationState {
  isVisible: boolean;
  xpGained: number;
  activity: string;
  coinsGained?: number;
}

interface LevelUpModalState {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  currentXP: number;
  nextLevelXP: number;
}

export const useXPSystem = () => {
  const [xpNotification, setXPNotification] = useState<XPNotificationState>({
    isVisible: false,
    xpGained: 0,
    activity: '',
    coinsGained: undefined
  });
  
  const [levelUpModal, setLevelUpModal] = useState<LevelUpModalState>({
    isOpen: false,
    oldLevel: 0,
    newLevel: 0,
    currentXP: 0,
    nextLevelXP: 0
  });

  const queryClient = useQueryClient();

  // Fetch user's current XP data
  const { data: xpData, isLoading: isLoadingXP } = useQuery({
    queryKey: ['/api/xp/user'],
    queryFn: () => apiRequest('/api/xp/user'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Award XP mutation
  const awardXPMutation = useMutation({
    mutationFn: async (params: { activity: XPRewardType; customAmount?: number }) => {
      return await apiRequest('/api/xp/award', 'POST', params);
    },
    onSuccess: (data: any, variables) => {
      console.log('🔍 XP MUTATION SUCCESS: Raw server response:', data);
      
      // Update cache
      queryClient.invalidateQueries({ queryKey: ['/api/xp/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
      
      // Show XP notification
      const activityNames: Record<XPRewardType, string> = {
        'PLAY_VIDEOS_FREE': 'Watching Video',
        'PLAY_VIDEOS_PAID': 'Watching Premium Video',
        'POST_VIDEO': 'Posting Video',
        'VIDEO_COMMENT': 'Video Comment',
        'TEXT_COMMENT': 'Text Comment',
        'FIND_TREASURE': 'Finding Treasure',
        'CREATE_GROUP': 'Creating Group',
        'FLAG_VIDEO': 'Content Moderation',
        'TRACK_LOCATION_PER_MILE': 'Movement Tracking'
      };
      
      showXPNotification(data, activityNames[variables.activity] || 'Activity');
      
      // Show level up modal if leveled up
      if (data && data.leveledUp === true) {
        console.log('🎉 LEVEL UP DETECTED! Opening modal with data:', data);
        showLevelUpModal(data);
      } else {
        console.log('📊 XP GAINED: No level up, current level:', data?.newLevel, 'leveledUp:', data?.leveledUp);
      }
    },
    onError: (error) => {
      console.error('Failed to award XP:', error);
    }
  });

  const showXPNotification = useCallback((xpResult: XPResult, activity: string, coinsGained?: number) => {
    setXPNotification({
      isVisible: true,
      xpGained: xpResult.currentXP - (xpResult.oldLevel === xpResult.newLevel ? 0 : xpResult.currentXP),
      activity,
      coinsGained
    });
  }, []);

  const showLevelUpModal = useCallback((xpResult: XPResult) => {
    console.log('🎉 SHOW LEVEL UP MODAL: Setting modal state to open with:', xpResult);
    setLevelUpModal({
      isOpen: true,
      oldLevel: xpResult.oldLevel,
      newLevel: xpResult.newLevel,
      currentXP: xpResult.currentXP,
      nextLevelXP: xpResult.nextLevelXP
    });
  }, []);

  const closeXPNotification = useCallback(() => {
    setXPNotification(prev => ({ ...prev, isVisible: false }));
  }, []);

  const closeLevelUpModal = useCallback(() => {
    console.log('useXPSystem: closeLevelUpModal called');
    setLevelUpModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Manual XP awarding function
  const awardXP = useCallback((activity: XPRewardType, customAmount?: number) => {
    awardXPMutation.mutate({ activity, customAmount });
  }, [awardXPMutation]);

  return {
    // Data
    xpData,
    isLoadingXP,
    
    // Notification states
    xpNotification,
    levelUpModal,
    
    // Actions
    awardXP,
    showXPNotification,
    showLevelUpModal,
    closeXPNotification,
    closeLevelUpModal,
    
    // Mutation state
    isAwarding: awardXPMutation.isPending
  };
};