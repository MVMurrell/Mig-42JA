import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { X, Play, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useLanternCollectionSound } from '../hooks/useLanternCollectionSound.ts';
import { useMusic } from '@/contexts/MusicContext.tsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient.ts';
import lanternIcon from '@assets/Lantern2_1752195390568.png';

interface LanternAdRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  adType: '30s' | '60s' | null;
  onLanternsEarned: (lanterns: number) => void;
}

export function LanternAdRewardModal({ isOpen, onClose, adType, onLanternsEarned }: LanternAdRewardModalProps) {
  const [adState, setAdState] = useState<'loading' | 'playing' | 'completed' | 'success'>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const playLanternCollectionSound = useLanternCollectionSound();
  const { pauseForVideo, resumeAfterVideo } = useMusic();
  const queryClient = useQueryClient();

  const adConfig = {
    '30s': { duration: 30, lanterns: 1, title: '30-Second Ad for 1 Lantern' },
    '60s': { duration: 60, lanterns: 4, title: '60-Second Ad for 4 Lanterns' }
  };

  const currentConfig = adType ? adConfig[adType] : null;

  // Ad reward mutation
  const claimLanternRewardMutation = useMutation({
    mutationFn: async ({ adType, adDuration }: { adType: string; adDuration: number }) => {
      return await apiRequest('/api/ad-rewards/watch',{ method: 'POST', data: { 
        adType: `${adDuration}s`,
        rewardType: 'lanterns',
        amount: currentConfig?.lanterns || 1
      }});
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      // Don't show toast here - it's handled in claimReward function
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to claim lantern reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isOpen || !adType || !currentConfig) {
      return;
    }


    
    // Reset state only when modal first opens
    setAdState('loading');
    setTimeLeft(currentConfig.duration);
    setShowExitConfirm(false);
    setRewardClaimed(false);
    
    // Pause background music when ad modal opens
    pauseForVideo();
    
    // Simulate ad loading
    const loadingTimeout = setTimeout(() => {

      setAdState('playing');
      
      // Start countdown timer
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setAdState('completed');
            
            // Auto-progress to success after a brief pause
            setTimeout(() => {
              claimReward();
            }, 1000);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      timerRef.current = timer;
    }, 1500);
    
    loadingTimeoutRef.current = loadingTimeout;
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [isOpen, adType]); // Removed currentConfig from dependencies to prevent loop



  const claimReward = () => {
    if (!currentConfig || rewardClaimed) return;
    
    setRewardClaimed(true);
    
    // Resume background music
    resumeAfterVideo();
    
    // Award lanterns
    claimLanternRewardMutation.mutate({
      adType: adType || '30s',
      adDuration: currentConfig.duration,
    });
    
    // Play collection sound
    playLanternCollectionSound();
    
    // Show success toast
    toast({
      title: "Lanterns Earned!",
      description: `You earned ${currentConfig.lanterns} lantern${currentConfig.lanterns > 1 ? 's' : ''}!`,
      duration: 3000,
    });
    
    // Auto-close modal immediately
    handleClose();
  };

  const handleClose = () => {
    // Clear any running timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    
    // Resume background music
    resumeAfterVideo();
    
    // Close modal
    onClose();
    
    // Notify parent if lanterns were earned
    if (rewardClaimed && currentConfig) {
      onLanternsEarned(currentConfig.lanterns);
    }
  };

  const handleEarlyExit = () => {
    if (adState === 'playing' && timeLeft > 5) {
      setShowExitConfirm(true);
    } else {
      handleClose();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    handleClose();
  };

  const continueWatching = () => {
    setShowExitConfirm(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };



  if (!currentConfig) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleEarlyExit}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 border-0 bg-black">
          <DialogTitle className="sr-only">Lantern Advertisement</DialogTitle>
          <DialogDescription className="sr-only">Watch this advertisement to earn lanterns</DialogDescription>
          <div className="relative w-full h-full">
            {/* Mock Video Player */}
            <div className="relative w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              {/* Header with close button and title */}
              <div className="absolute top-0 left-0 right-0 z-50 p-4">
                <div className="flex justify-between items-center">
                  <div className="text-white">
                    <p className="text-sm opacity-75">Advertisement</p>
                    <h2 className="text-lg font-medium">{currentConfig.title}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEarlyExit}
                    className="bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {adState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xl">Loading advertisement...</p>
                    <p className="text-sm opacity-75 mt-2">
                      Watch for {currentConfig.duration} seconds to earn {currentConfig.lanterns} lantern{currentConfig.lanterns > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {adState === 'playing' && (
                <>
                  {/* Mock video content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white max-w-2xl mx-auto p-8">
                      <img src={lanternIcon} alt="Lantern" className="w-32 h-32 mx-auto mb-6 animate-pulse" />
                      <h1 className="text-4xl font-bold mb-4">Magical Lanterns Await!</h1>
                      <p className="text-xl mb-8">
                        Light up your adventures with mystical lanterns that reveal hidden treasures and unlock special content.
                      </p>
                      <div className="text-6xl font-bold mb-4">{timeLeft}</div>
                      <p className="text-lg opacity-75">
                        {timeLeft > 1 ? 'seconds remaining' : 'second remaining'}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="absolute bottom-20 right-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="bg-black/80 hover:bg-black/90 text-white"
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div 
                      className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${((currentConfig.duration - timeLeft) / currentConfig.duration) * 100}%` 
                      }}
                    />
                  </div>
                </>
              )}

              {adState === 'completed' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-400 flex items-center justify-center mx-auto mb-4">
                      <Play className="h-8 w-8 text-amber-400" />
                    </div>
                    <p className="text-lg">Ad completed!</p>
                  </div>
                </div>
              )}


            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Modal */}
      <Dialog open={showExitConfirm} onOpenChange={() => setShowExitConfirm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Ad Early?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-6">
              If you leave now, you won't receive the {currentConfig.lanterns} Lantern{currentConfig.lanterns > 1 ? 's' : ''}. 
              Are you sure you want to exit?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={continueWatching}>
                Continue Watching
              </Button>
              <Button variant="destructive" onClick={confirmExit}>
                Leave Without Lanterns
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}