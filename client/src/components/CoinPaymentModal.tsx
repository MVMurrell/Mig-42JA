import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import coinIcon from "@assets/state=coins-empty.png";
import { ResponsiveModal } from "@/components/ui/responsive-modal.tsx";
import { formatDistance } from "@/lib/distanceUtils.ts";

interface CoinPaymentModalProps {
  video: any;
  onClose: () => void;
  onPayAndPlay: () => void;
  onOpenCoinShop: () => void;
}

export default function CoinPaymentModal({ video, onClose, onPayAndPlay, onOpenCoinShop }: CoinPaymentModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userCoins = (user as any)?.gemCoins || 0;
  const hasEnoughCoins = userCoins >= 1;

  const spendCoinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/videos/${video.id}/purchase`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Payment Successful!",
        description: "1 coin spent. You now have permanent access to this video!",
      });
      onPayAndPlay();
    },
    onError: (error) => {
      setIsProcessing(false);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePayAndPlay = async () => {
    if (isProcessing || !hasEnoughCoins) return;
    
    setIsProcessing(true);
    spendCoinMutation.mutate();
  };

  return (
    <ResponsiveModal isOpen={true} onClose={onClose} title="Watch Video Remotely" className="max-w-sm">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
          <img src={coinIcon} alt="Coin" className="w-10 h-10" />
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {video.title}
        </h3>
        
        <p className="text-gray-600 mb-4">
          You're {formatDistance(video.distance)} away from this video. Use 1 coin to watch it remotely.
        </p>

        <div className="flex items-center justify-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
          <img src={coinIcon} alt="Coins" className="w-5 h-5" />
          <span className="text-sm font-medium text-yellow-800">
            Your Balance: {userCoins} coins
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {hasEnoughCoins ? (
          <Button
            onClick={handlePayAndPlay}
            disabled={isProcessing}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl"
          >
            {isProcessing ? "Processing..." : "Pay 1 Coin & Play"}
          </Button>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              You need 1 coin to watch this video remotely.
            </p>
            <Button
              onClick={onOpenCoinShop}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl"
            >
              Get Coins
            </Button>
          </div>
        )}
        
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full py-3 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </ResponsiveModal>
  );
}