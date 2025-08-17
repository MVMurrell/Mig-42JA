import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import VideoUnlockModal from '@/components/VideoUnlockModal.tsx';
import VideoFeedModal from '@/components/VideoFeedModal.tsx';
import { calculateDistance } from '@/lib/utils.ts';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import type { DBVideoRow } from "@shared/schema.ts";
type ShareVideo = Pick<DBVideoRow, "id" | "videoUrl" | "userId" | "likes" | "views" | "latitude" | "longitude" | "title" | "category" | "bunnyVideoId">;

interface Video {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  bunnyVideoId?: string;
  [key: string]: any;
}

export default function VideoSharePage() {
  const [location] = useLocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isRemotelyUnlocked, setIsRemotelyUnlocked] = useState(false);

  // Extract video ID from URL path like /video/123
  const videoId = location.split('/video/')[1];

  // Fetch video data
  const { data: video, isLoading: videoLoading, error: videoError } = useQuery<ShareVideo>({
    queryKey: ['/api/videos', videoId],
    enabled: !!videoId
  });

  // Fetch current user data
  const { data: currentUser } = useQuery<{ id: string; coins?: number }>({
    queryKey: ['/api/auth/user']
  });

  // Fetch user's coin balance
  const { data: userCoins = 0 } = useQuery<number>({
    queryKey: ['/api/user/coins'],
    enabled: !!currentUser
  });

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError("Unable to get your current location");
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    );
  }, []);

  // Calculate distance when both locations are available
  const distance = userLocation && video 
    ? calculateDistance(userLocation.lat, userLocation.lng, Number(video.latitude), Number(video.longitude))
    : null;

  const isWithinRange = distance !== null && distance <= 30.48; // 100ft in meters
  const canPlayVideo = isWithinRange || isRemotelyUnlocked;

  // Handle video unlock decision
  useEffect(() => {
    if (video && userLocation && distance !== null) {
      if (isWithinRange) {
        // User is close enough - show video directly
        setShowVideoModal(true);
      } else {
        // User is too far - show unlock modal
        setShowUnlockModal(true);
      }
    }
  }, [video, userLocation, distance, isWithinRange]);

  const handleRemoteUnlock = () => {
    setIsRemotelyUnlocked(true);
    setShowUnlockModal(false);
    setShowVideoModal(true);
  };

  const handleCloseUnlockModal = () => {
    setShowUnlockModal(false);
    // Redirect to map showing video location
    window.location.href = `/?lat=${video?.latitude}&lng=${video?.longitude}&video=${video?.id}`;
  };

  if (videoLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Video Not Found</h2>
          <p className="text-gray-300 mb-6">
            The video you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  if (locationError) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto p-6">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-xl font-bold mb-2">Location Required</h2>
          <p className="text-gray-300 mb-6">
            {locationError}. Please enable location access and refresh the page to view location-based videos.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Video Unlock Modal */}
      {showUnlockModal && video && distance !== null && (
        <VideoUnlockModal
          isOpen={showUnlockModal}
          onClose={handleCloseUnlockModal}
          video={video}
          userDistance={distance * 3.28084} // Convert meters to feet
          userCoins={userCoins}
          onUnlock={handleRemoteUnlock}
        />
      )}

      {/* Video Player Modal */}
      {showVideoModal && canPlayVideo && video && (
        <VideoFeedModal
          videos={[video]}
          onClose={() => {
            setShowVideoModal(false);
            window.location.href = '/';
          }}
          initialVideoIndex={0}
        />
      )}
    </>
  );
}