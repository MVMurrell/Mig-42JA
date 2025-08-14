/**
 * Lantern Map Interface Component
 * Full-page map interface for lantern activation workflow
 */
/// <reference types="@types/google.maps" />


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Search, X, Zap, MapPin, Play } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { apiRequest } from '@/lib/queryClient.ts';
import { Loader } from "@googlemaps/js-api-loader";
import lanternIcon from '@assets/Lantern2_1752195390568.png';
import coinIcon from '@assets/state=coins-empty.png';
type ApiKeyResp = { apiKey: string };

const defaultCenter = {
  lat: 36.0571829,
  lng: -94.1606752
};

interface LanternMapInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: any;
}

export function LanternMapInterface({ isOpen, onClose, userProfile }: LanternMapInterfaceProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [lanternPosition, setLanternPosition] = useState<{lat: number, lng: number} | null>(null);
  let   [lanternMarker, setLanternMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  let   [radiusCircle, setRadiusCircle] = useState<google.maps.Circle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [videosInRange, setVideosInRange] = useState<any[]>([]);
  const [searchCircle, setSearchCircle] = useState<google.maps.Circle | null>(null);

  
  const mapRef = useRef<HTMLDivElement>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const { toast } = useToast();
  const playButtonSound = useButtonSound();
  const queryClient = useQueryClient();

  // Get API key
const { data: apiKeyData } = useQuery<ApiKeyResp>({
  queryKey: ['/api/config/maps-key'],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);

  
  // Initialize Google Maps


useEffect(() => {
  let cancelled = false;

  (async () => {
    if (!apiKeyData?.apiKey || mapRef.current) return;

    try {
      const loader = new Loader({
        apiKey: apiKeyData.apiKey,
        version: 'weekly',
        libraries: ['places', 'geometry', 'marker'],
      });

      // 🔑 Wait here so TS knows google exists afterwards
      await loader.load();

      if (cancelled) return;

      const map = new google.maps.Map(mapRef.current!, {
        center: defaultCenter,
        zoom: 15,
        clickableIcons: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      setMap(map);
      setIsMapLoaded(true);

      geocoderRef.current = new google.maps.Geocoder();

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setLanternPosition(pos);
        updateLanternMarker(pos, map);  // see helper below
      });
    } catch (err) {
      console.error('Error loading Google Maps:', err);
    }
  })();

  return () => { cancelled = true; };
}, [apiKeyData?.apiKey]);


function updateLanternMarker(
  position: { lat: number; lng: number },
  map: google.maps.Map
) {
  // marker
  if (!lanternMarker) {
    lanternMarker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position,
    });
  } else {
    lanternMarker.position = position;
  }

  // 100ft circle (≈ 30.48m)
  if (!radiusCircle) {
    radiusCircle = new google.maps.Circle({
      map,
      center: position,
      radius: 30.48,
      strokeColor: '#8B5CF6',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: '#8B5CF6',
      fillOpacity: 0.15,
    });
  } else {
    radiusCircle.setCenter(position);
  }
}


  // Set initial lantern position to user's current location
  useEffect(() => {
    if (map && !lanternPosition) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLanternPosition(pos);
          map.setCenter(pos);
        },
        () => {
          // Fallback to default center
          setLanternPosition(defaultCenter);
        }
      );
    }
  }, [map, lanternPosition]);

  // Create lantern marker and radius circle
  useEffect(() => {
    if (!map || !lanternPosition || !isMapLoaded) return;

    // Clear existing marker and circle
    if (lanternMarker) {
      lanternMarker.map = null;
    }
    if (radiusCircle) {
      radiusCircle.setMap(null);
    }

    // Create lantern marker
    const markerElement = document.createElement('div');
    markerElement.innerHTML = `
      <div style="
        width: 48px;
        height: 48px;
        background: white;
        border: 3px solid #f59e0b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
      ">
        <img src="${lanternIcon}" alt="Lantern" style="width: 24px; height: 24px;" />
      </div>
    `;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: lanternPosition,
      content: markerElement,
      title: 'Lantern Position'
    });

    // Create activation radius circle
    const circle = new google.maps.Circle({
      strokeColor: '#f59e0b',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.15,
      map,
      center: lanternPosition,
      radius: 30.48 // 100 feet in meters
    });

    setLanternMarker(marker);
    setRadiusCircle(circle);

    // Make marker draggable by adding click listener to move position
    markerElement.addEventListener('click', () => {
      // Enable click-to-move mode
      const moveListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newPos = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          };
          setLanternPosition(newPos);
        }
        google.maps.event.removeListener(moveListener);
      });
    });

    // Fetch videos in range
    fetchVideosInRange(lanternPosition);

  }, [map, lanternPosition, isMapLoaded]);

  // Fetch videos within lantern range
  const fetchVideosInRange = async (position: {lat: number, lng: number}) => {
    try {
      const response = await apiRequest(`/api/videos/nearby?lat=${position.lat}&lng=${position.lng}&radius=100&limit=20`);
      setVideosInRange(response || []);
    } catch (error) {
      console.error('Error fetching videos in range:', error);
      setVideosInRange([]);
    }
  };

  // Handle location search
  const handleSearch = useCallback(() => {
    if (!geocoderRef.current || !searchQuery.trim()) return;

    geocoderRef.current.geocode(
      { address: searchQuery },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const newPos = {
            lat: location.lat(),
            lng: location.lng()
          };
          setLanternPosition(newPos);
          map?.setCenter(newPos);
          map?.setZoom(16);
        } else {
          toast({
            title: "Location not found",
            description: "Please try a different search term.",
            variant: "destructive",
          });
        }
      }
    );
  }, [searchQuery, map, toast]);

  // Activate lantern mutation
  const activateLanternMutation = useMutation({
    mutationFn: async () => {
      if (!lanternPosition) throw new Error('No lantern position set');
      
      return apiRequest('/api/lanterns/activate', {
        method: 'POST',
        data: {
          latitude: lanternPosition!.lat,
          longitude: lanternPosition!.lng,
          radiusMeters: 30.48 // 100 feet
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Lantern Activated!",
        description: `${videosInRange.length} videos are now available to watch.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Unable to activate lantern. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleActivate = () => {
    playButtonSound();
    setIsActivating(true);
    activateLanternMutation.mutate();
  };

  const handleCancel = () => {
    playButtonSound();
    onClose();
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Debug info */}
      <div className="absolute top-4 left-4 z-50 bg-black text-white p-2 text-xs rounded">
        Map: {map ? '✅' : '❌'} | API: {apiKeyData?.apiKey ? '✅' : '❌'} | Loaded: {isMapLoaded ? '✅' : '❌'}
      </div>
      {/* Search Bar */}
      <div className="absolute top-16 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-3 flex gap-2">
          <Input
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} variant="outline" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapRef} style={{ width: '100%', height: '100vh' }}></div>

      {/* Info Panel */}
      <div className="absolute top-28 right-4 bg-white rounded-lg shadow-lg p-4 w-64 z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src={lanternIcon} alt="Lantern" className="w-6 h-6" />
            <span className="font-medium">Lantern Activation</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Cost:</span>
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              3 Coins
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Range:</span>
            <span className="text-sm font-medium">100ft radius</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-1">
              <Play className="h-3 w-3" />
              Videos:
            </span>
            <Badge variant="secondary">
              {videosInRange.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="absolute bottom-20 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4 flex gap-3">
          <Button
            onClick={() => {
              playButtonSound();
              onClose(); // This will return to the map home page
            }}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <Button
            onClick={handleActivate}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            size="lg"
            disabled={isActivating || activateLanternMutation.isPending || !lanternPosition}
          >
            <img src={coinIcon} alt="Coins" className="w-4 h-4 mr-2" />
            {isActivating ? 'Activating...' : 'Use Lantern'}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur rounded-lg p-3">
          <div className="text-sm text-gray-600 text-center">
            Tap anywhere on the map to position your lantern
          </div>
        </div>
      </div>
    </div>
  );
}