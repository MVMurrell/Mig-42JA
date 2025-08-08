/**
 * Lantern Modal Component
 * Handles lantern activation and purchase functionality
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Coins, Zap, ShoppingCart, MapPin, Play, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { LanternPurchaseModal } from '@/components/LanternPurchaseModal.tsx';

import lanternIcon from '@assets/Lantern2_1752195390568.png';
import coinIcon from '@assets/state=coins-empty.png';

interface LanternModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
  isLanternActive?: boolean;
  onLanternToggle?: (isActive: boolean) => void;
}

export function LanternModal({ isOpen, onClose, userProfile, isLanternActive, onLanternToggle }: LanternModalProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const { toast } = useToast();
  const playButtonSound = useButtonSound();
  const queryClient = useQueryClient();

  const handleToggleLantern = () => {
    playButtonSound();
    if (!isLanternActive && (!userProfile?.lanterns || userProfile.lanterns <= 0)) {
      toast({
        title: "No Lanterns Available",
        description: "You need at least 1 lantern to activate this feature.",
        variant: "destructive",
      });
      return;
    }
    onLanternToggle?.(!isLanternActive);
    onClose(); // Close modal after toggle
  };

  const handleBuyLanterns = () => {
    playButtonSound();
    setShowPurchaseModal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Lantern System
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Lantern Count */}
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <img src={lanternIcon} alt="Lantern" className="w-8 h-8" />
                <div>
                  <div className="font-medium">Your Lanterns</div>
                  <div className="text-sm text-muted-foreground">Available to use</div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-lg px-3 py-1">
                {userProfile?.lanterns || 0}
              </Badge>
            </div>

            {/* How Lanterns Work */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How Lanterns Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <MapPin className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-medium">100ft Play Circle</div>
                    <div className="text-sm text-muted-foreground">
                      Lanterns create a 100ft play circle to activate multiple videos at once
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Play className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-medium">Group Video Playback</div>
                    <div className="text-sm text-muted-foreground">
                      Watch videos outside your normal play circle
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Coins className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-medium">Costs 3 Coins Per Use</div>
                    <div className="text-sm text-muted-foreground">
                      Each lantern activation uses 3 coins from your balance
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleToggleLantern}
                className={isLanternActive 
                  ? "w-full bg-red-600 hover:bg-red-700 text-white" 
                  : "w-full bg-amber-600 hover:bg-amber-700 text-white"
                }
                size="lg"
                disabled={!isLanternActive && (!userProfile?.lanterns || userProfile.lanterns <= 0)}
              >
                {isLanternActive ? (
                  <>
                    <X className="h-5 w-5 mr-2" />
                    Deactivate Lantern
                  </>
                ) : (
                  <>
                    <img src={lanternIcon} alt="Lantern" className="w-5 h-5 mr-2" />
                    Activate Lantern
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleBuyLanterns}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Buy More Lanterns
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Modal */}
      <LanternPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        userProfile={userProfile}
      />


    </>
  );
}