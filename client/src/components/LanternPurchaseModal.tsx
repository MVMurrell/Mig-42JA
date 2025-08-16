/**
 * Lantern Purchase Modal Component
 * Handles lantern purchase options via ads and Stripe payments
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Coins, Zap, ShoppingCart, PlayCircle, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { useLanternCollectionSound } from '../hooks/useLanternCollectionSound.js';
import { apiRequest } from '@/lib/queryClient.ts';
import { LanternAdRewardModal } from './LanternAdRewardModal.js';
import lanternIcon from '@assets/Lantern2_1752195390568.png';
import coinIcon from '@assets/Coins_1752104970427.png';

interface LanternPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  onPurchaseSuccess?: () => void; // optional callback for purchase success
}

export function LanternPurchaseModal({ isOpen, onClose, userProfile }: LanternPurchaseModalProps) {
  const [processingPurchase, setProcessingPurchase] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedAdType, setSelectedAdType] = useState<'30s' | '60s' | null>(null);
  const { toast } = useToast();
  const playButtonSound = useButtonSound();
  const playLanternSound = useLanternCollectionSound();
  const queryClient = useQueryClient();

  // Ad reward mutation
  const watchAdMutation = useMutation({
    mutationFn: async (adType: '30s' | '60s') => {
      const response = await apiRequest(`/api/ad-rewards/watch`, { method:'POST',data: {
        adType,
        rewardType: 'lanterns',
        amount: adType === '30s' ? 1 : 4
      }});
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Ad Reward Earned!",
        description: `You earned ${data.lanternsAwarded} lantern${data.lanternsAwarded > 1 ? 's' : ''}!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
    },
    onError: (error) => {
      toast({
        title: "Ad Reward Failed",
        description: "Unable to process ad reward. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Coin-based purchase mutation
  const purchaseLanternsMutation = useMutation({
    mutationFn: async (packageData: { lanterns: number; coins: number }) => {
      const response = await apiRequest('/api/lanterns/purchase', {method: 'POST', data: {
        lanterns: packageData.lanterns,
        coins: packageData.coins
      }});
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Successful!",
        description: `You purchased ${data.newLanternBalance - (userProfile?.lanterns || 0)} lantern${data.newLanternBalance - (userProfile?.lanterns || 0) > 1 ? 's' : ''} for ${data.newCoinBalance - (userProfile?.gemCoins || 0)} coins!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error?.response?.data?.error || "Unable to process purchase. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleWatchAd = async (adType: '30s' | '60s') => {
    playButtonSound();
    setSelectedAdType(adType);
    setShowAdModal(true);
  };

  const handleLanternsEarned = (lanterns: number) => {
    playLanternSound();
    queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
    setShowAdModal(false);
    setSelectedAdType(null);
  };

  const handlePurchase = async (lanterns: number, coins: number) => {
    playButtonSound();
    setProcessingPurchase(true);
    
    try {
      await purchaseLanternsMutation.mutateAsync({ lanterns, coins });
    } finally {
      setProcessingPurchase(false);
    }
  };

  const purchaseOptions = [
    { lanterns: 1, coins: 3, popular: false },
    { lanterns: 10, coins: 28, popular: true, discount: '7% OFF' },
    { lanterns: 20, coins: 54, popular: false, discount: '10% OFF' },
    { lanterns: 40, coins: 102, popular: false, discount: '15% OFF' },
    { lanterns: 200, coins: 480, popular: false, bestValue: true, discount: '20% OFF' },
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
            Buy Lanterns
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
                <span className="font-medium text-sm">Lanterns</span>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {userProfile?.lanterns || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-blue-600" />
                <span className="font-medium text-sm">Coins</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {userProfile?.gemCoins || 0}
              </Badge>
            </div>
          </div>

          {/* Watch Ads Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <PlayCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium">Watch Ads for Free Lanterns</h3>
                <p className="text-sm text-muted-foreground">Earn lanterns by watching advertisements</p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleWatchAd('30s')}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={showAdModal}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Watch 30s Ad
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                    +1 Lantern
                  </Badge>
                </Button>
                
                <Button
                  onClick={() => handleWatchAd('60s')}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={showAdModal}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Watch 60s Ad
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                    +4 Lanterns
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Options */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <img src={coinIcon} alt="Coins" className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-medium">Purchase Lanterns with Coins</h3>
                <p className="text-sm text-muted-foreground">Use your earned coins to buy lanterns</p>
              </div>
              
              <div className="space-y-3">
                {purchaseOptions.map((option, index) => {
                  const hasEnoughCoins = (userProfile?.gemCoins || 0) >= option.coins;
                  return (
                    <div
                      key={index}
                      className={`relative border border-gray-200 rounded-lg p-4 ${!hasEnoughCoins ? 'opacity-60' : ''}`}
                    >
                      {option.discount && (
                        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs">
                          {option.discount}
                        </Badge>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
                          <div>
                            <div className="font-medium">{option.lanterns} Lantern{option.lanterns > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePurchase(option.lanterns, option.coins)}
                          disabled={!hasEnoughCoins || processingPurchase || purchaseLanternsMutation.isPending}
                          className={`${hasEnoughCoins ? 'bg-black hover:bg-gray-800 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                          <img src={coinIcon} alt="Coins" className="w-4 h-4 mr-1" />
                          {option.coins}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Full-screen Lantern Ad Modal - Outside main dialog to prevent z-index conflicts */}
    {selectedAdType && (
      <LanternAdRewardModal
        isOpen={showAdModal}
        onClose={() => {
          setShowAdModal(false);
          setSelectedAdType(null);
        }}
        adType={selectedAdType}
        onLanternsEarned={handleLanternsEarned}
      />
    )}
    </>
  );
}