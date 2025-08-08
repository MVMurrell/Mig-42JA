import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { X, Play, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { useCoinCollectionSound } from '@/hooks/useCoinCollectionSound.ts';
import { useMusic } from '@/contexts/MusicContext.tsx';

interface AdRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  adType: '5sec' | '30sec' | null;
  onCoinsEarned: (coins: number) => void;
}

export function AdRewardModal({ isOpen, onClose, adType, onCoinsEarned }: AdRewardModalProps) {
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
  const playCoinCollectionSound = useCoinCollectionSound();
  const { pauseForVideo, resumeAfterVideo } = useMusic();

  const adConfig = {
    '5sec': { duration: 5, coins: 1, title: '5-Second Ad for 1 Coin' },
    '30sec': { duration: 30, coins: 5, title: '30-Second Ad for 5 Coins' }
  };

  const currentConfig = adType ? adConfig[adType] : null;

  useEffect(() => {
    // Clear any existing timers when component re-renders
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

    if (isOpen && adType && currentConfig) {
      setAdState('loading');
      setTimeLeft(currentConfig.duration);
      setShowExitConfirm(false);
      setRewardClaimed(false);
      
      // Pause background music when ad modal opens
      pauseForVideo();
      
      // Simulate ad loading
      loadingTimeoutRef.current = setTimeout(() => {
        setAdState('playing');
        startAdTimer();
      }, 1500);
    }
    
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
      // Only resume music if modal was actually open
      if (isOpen) {
        resumeAfterVideo();
      }
    };
  }, [isOpen, adType]); // Removed pauseForVideo/resumeAfterVideo from dependencies

  const startAdTimer = () => {
    // Clear any existing timer before starting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Clear the timer immediately
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          setAdState('completed');
          
          // Use ref for success timeout to allow cleanup
          successTimeoutRef.current = setTimeout(() => {
            setAdState('success');
            playCoinCollectionSound();
            
            // Only call onCoinsEarned once to prevent duplicate requests
            if (!rewardClaimed && currentConfig) {
              setRewardClaimed(true);
              onCoinsEarned(currentConfig.coins);
            }
            
            // Resume music after successful ad completion
            setTimeout(() => {
              resumeAfterVideo();
            }, 2000);
          }, 1000);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    if (adState === 'playing' && timeLeft > 0) {
      setShowExitConfirm(true);
    } else {
      // Clear all timers before closing
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
      
      // Resume music when closing
      resumeAfterVideo();
      onClose();
      setAdState('loading');
    }
  };

  const confirmExit = () => {
    // Clear all timers before exiting
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
    
    setShowExitConfirm(false);
    // Resume music when exiting early
    resumeAfterVideo();
    onClose();
    setAdState('loading');
    toast({
      title: "Ad Skipped",
      description: "You won't receive coins for incomplete ads.",
      variant: "destructive"
    });
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

  if (!isOpen || !currentConfig) return null;

  return (
    <>
      <Dialog open={isOpen && !showExitConfirm} onOpenChange={handleClose}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 bg-black border-none rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Watch Ad to Earn Coins</DialogTitle>
            <DialogDescription>Complete the ad video to earn coins for your account</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
              <div className="bg-black/80 rounded-lg px-3 py-2">
                <h3 className="text-white font-semibold">{currentConfig.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="bg-black/80 hover:bg-black/90 text-white rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Ad Content Area */}
            <div className="flex-1 relative bg-gradient-to-br from-blue-900 to-purple-900">
              {adState === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Loading your ad...</p>
                  </div>
                </div>
              )}

              {adState === 'playing' && (
                <>
                  {/* Demo Ad Video */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted={isMuted}
                    playsInline
                    style={{
                      maxWidth: '100vw',
                      maxHeight: '100vh'
                    }}
                  >
                    <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                  </video>
                  
                  {/* Ad Controls */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="bg-black/80 rounded-lg px-4 py-2">
                      <span className="text-white font-mono text-lg">
                        {timeLeft}s remaining
                      </span>
                    </div>
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
                      className="h-full bg-white transition-all duration-1000 ease-linear"
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
                    <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center mx-auto mb-4">
                      <Play className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-lg">Ad completed!</p>
                  </div>
                </div>
              )}

              {adState === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900">
                  <div className="text-center text-white max-w-md mx-auto p-8">
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                      <span className="text-2xl font-bold">{currentConfig.coins}</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
                    <p className="text-lg mb-6">
                      You earned {currentConfig.coins} Jem Coin{currentConfig.coins > 1 ? 's' : ''}!
                    </p>
                    <Button
                      onClick={() => {
                        onClose();
                        setAdState('loading');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                    >
                      Collect Coins
                    </Button>
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
              If you leave now, you won't receive the {currentConfig.coins} Jem Coin{currentConfig.coins > 1 ? 's' : ''}. 
              Are you sure you want to exit?
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={continueWatching}>
                Continue Watching
              </Button>
              <Button variant="destructive" onClick={confirmExit}>
                Leave Without Coins
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}