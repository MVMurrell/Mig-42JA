/**
 * Lantern Activation Modal Component
 * Handles lantern placement and activation on the map
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { MapPin, Search, Zap, X, Play } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { apiRequest } from '@/lib/queryClient.ts';
import lanternIcon from '@assets/Lantern2_1752195390568.png';

interface LanternActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
}

export function LanternActivationModal({ isOpen, onClose, userProfile }: LanternActivationModalProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lanternPosition, setLanternPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  
  const { toast } = useToast();
  const playButtonSound = useButtonSound();
  const queryClient = useQueryClient();

  // Get user's current location for initial map center
  useEffect(() => {
    if (isOpen && !mapCenter) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMapCenter(center);
          setLanternPosition(center); // Start with lantern at user's location
        },
        () => {
          // Default to a central location if geolocation fails
          const defaultCenter = { lat: 36.0571, lng: -94.1607 };
          setMapCenter(defaultCenter);
          setLanternPosition(defaultCenter);
        }
      );
    }
  }, [isOpen, mapCenter]);

  // Fetch videos in lantern area
  const { data: videosInRange } = useQuery({
    queryKey: ['/api/videos/in-radius', lanternPosition],
    queryFn: async () => {
      if (!lanternPosition) return [];
      
      const response = await apiRequest(
        `/api/videos/nearby?lat=${lanternPosition.lat}&lng=${lanternPosition.lng}&radius=100&limit=50`,
        'GET'
      );
      return response;
    },
    enabled: !!lanternPosition,
    staleTime: 5000,
  });

  // Lantern activation mutation
  const activateLanternMutation = useMutation({
    mutationFn: async () => {
      if (!lanternPosition) throw new Error('No lantern position set');
      
      const response = await apiRequest('/api/lanterns/activate', 'POST', {
        latitude: lanternPosition.lat,
        longitude: lanternPosition.lng,
        costCoins: 3
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Lantern Activated!",
        description: `${data.videosActivated} videos are now available in your feed.`,
      });
      
      // Update user profile cache
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
      
      // Close modal and show videos
      onClose();
      
      // TODO: Navigate to video feed with lantern videos
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Unable to activate lantern. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleActivate = async () => {
    playButtonSound();
    
    if (!userProfile?.gemCoins || userProfile.gemCoins < 3) {
      toast({
        title: "Insufficient Coins",
        description: "You need at least 3 coins to activate a lantern.",
        variant: "destructive",
      });
      return;
    }

    if (!lanternPosition) {
      toast({
        title: "Position Required",
        description: "Please set a lantern position on the map.",
        variant: "destructive",
      });
      return;
    }

    setIsActivating(true);
    try {
      await activateLanternMutation.mutateAsync();
    } finally {
      setIsActivating(false);
    }
  };

  const handleCancel = () => {
    playButtonSound();
    onClose();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    // TODO: Implement geocoding search to move map center
    // For now, just show search functionality
    toast({
      title: "Search Feature",
      description: "Search functionality will be implemented with Google Maps integration.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
            Activate Lantern
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Cost Information */}
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
              <span className="font-medium">Activation Cost</span>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              3 Coins
            </Badge>
          </div>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Map Preview (Placeholder) */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <img src={lanternIcon} alt="Lantern" className="w-12 h-12 mx-auto mb-4" />
                  <div className="text-lg font-medium">Lantern Position</div>
                  <div className="text-sm text-muted-foreground">
                    {lanternPosition 
                      ? `${lanternPosition.lat.toFixed(6)}, ${lanternPosition.lng.toFixed(6)}`
                      : 'Setting position...'
                    }
                  </div>
                  <div className="mt-4 text-sm text-amber-600">
                    100ft activation radius
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Videos in Range */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Play className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Videos in Range</span>
                <Badge variant="secondary">
                  {videosInRange?.length || 0} videos
                </Badge>
              </div>
              
              {videosInRange && videosInRange.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {videosInRange.slice(0, 5).map((video: any) => (
                    <div key={video.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm">{video.title}</span>
                    </div>
                  ))}
                  {videosInRange.length > 5 && (
                    <div className="text-sm text-muted-foreground">
                      +{videosInRange.length - 5} more videos
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No videos found in this area
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>Position the lantern anywhere on the map to activate videos within 100ft</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>Use the search bar to navigate to specific locations</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div>Activated videos will appear in your video feed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              onClick={handleActivate}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={isActivating || activateLanternMutation.isPending || !lanternPosition}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isActivating ? 'Activating...' : 'Activate Lantern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}