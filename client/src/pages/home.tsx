import { useState, useEffect } from "react";
import type { DBUserRow } from "@shared/schema.ts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.ts";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Search, Bell, Sliders } from "lucide-react";
import MapInterface from "@/components/MapInterface.tsx";
import BottomNavigation from "@/components/BottomNavigation.tsx";
import DualModeSearch from "@/components/DualModeSearch.tsx";

import VideoPlayerModal from "@/components/VideoPlayerModal.tsx";
import VideoFeedModal from "@/components/VideoFeedModal.tsx";
// import GemCoinsModal from "@/components/GemCoinsModal";
import FiltersModal from "@/components/FiltersModal.tsx";

import CoinPaymentModal from "@/components/CoinPaymentModal.tsx";
import ScrollableVideoFeed from "@/components/ScrollableVideoFeed.tsx";
import VideoUploadModal from "@/components/VideoUploadModal.tsx";
import ProcessingNotificationModal from "@/components/ProcessingNotificationModal.tsx";
import AdSenseBanner from "@/components/AdSenseBanner.tsx";
import QuestDetailModal  from "@/components/QuestDetailModal.tsx";
import { WelcomeModal } from "@/components/WelcomeModal.tsx";
import { CoinEarningWidget } from "@/components/CoinEarningWidget.tsx";
import { MusicControlButton } from "@/components/MusicControlButton.tsx";
import { LanternPurchaseModal } from "@/components/LanternPurchaseModal.tsx";

import { LevelUpModal } from "@/components/LevelUpModal.tsx";
import { useXPSystem } from "@/hooks/useXPSystem.ts";
import { apiRequest, queryClient } from "@/lib/queryClient.ts";
import { formatDistance, calculateDistance } from "@/lib/distanceUtils.ts";
import { useButtonSound } from "@/hooks/useButtonSound.ts";
import { useGroupPlaySound } from "@/hooks/useGroupPlaySound.ts";
import { useLanternSound } from "@/hooks/useLanternSound.ts";

// Import assets
import jemzyLogo from "@assets/JemzyLogoIcon.png";
import coinIcon from "@assets/state=coins-empty.png";
import redIcon from "@assets/Property 1=Red.png";

import blueIcon from "@assets/Property 1=Blue.png";
import greenIcon from "@assets/Property 1=Green.png";
import orangeIcon from "@assets/Property 1=Orange.png";
import purpleIcon from "@assets/Purple_1749397661787.png";
import pinkIcon from "@assets/Property 1=Pink.png";
import yellowIcon from "@assets/Property 1=Yellow.png";
import blackIcon from "@assets/Black_1749397661786.png";
import aquaIcon from "@assets/Aqua_1749397661785.png";
import cobaltIcon from "@assets/Cobalt_1749397661786.png";
import lilacIcon from "@assets/Lilac_1749397661786.png";
import neonGreenIcon from "@assets/Neon Green_1749397661787.png";
import mintIcon from "@assets/Mint_1749397661787.png";
import lanternIcon from "@assets/Lantern2_1752195390568.png";
type AppUser = Partial<DBUserRow> & { id: string; email?: string; name?: string };

const categories = [
  { name: "Art", icon: redIcon, color: "bg-red-500" },
  { name: "Education", icon: orangeIcon, color: "bg-orange-500" },
  { name: "Review", icon: yellowIcon, color: "bg-yellow-500" },
  { name: "Games", icon: greenIcon, color: "bg-green-500" },
  { name: "Events", icon: blueIcon, color: "bg-blue-500" },
  { name: "Products", icon: purpleIcon, color: "bg-purple-500" },
  { name: "Services", icon: pinkIcon, color: "bg-pink-500" },
  { name: "Challenge", icon: blackIcon, color: "bg-gray-800" },
  { name: "Chat", icon: aquaIcon, color: "bg-cyan-500" },
  { name: "FYI", icon: cobaltIcon, color: "bg-blue-700" },
  { name: "Love", icon: lilacIcon, color: "bg-purple-300" },
  { name: "Nature", icon: neonGreenIcon, color: "bg-lime-400" },
  { name: "Coupon", icon: mintIcon, color: "bg-emerald-300" },
];

const colors = [
  'hsl(0, 72%, 51%)',     // Jemzy Red
  'hsl(24, 100%, 48%)',   // Jemzy Orange  
  'hsl(207, 90%, 54%)',   // Jemzy Blue
  'hsl(142, 71%, 45%)',   // Jemzy Green
  'hsl(259, 53%, 70%)',   // Jemzy Purple
  'hsl(45, 100%, 50%)',   // Jemzy Gold
  'hsl(320, 70%, 55%)',   // Pink
  'hsl(280, 65%, 60%)',   // Violet
  'hsl(180, 70%, 50%)',   // Cyan
  'hsl(50, 85%, 55%)',    // Bright Yellow
  'hsl(15, 80%, 60%)',    // Coral
  'hsl(270, 75%, 65%)',   // Magenta
];

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Sound effects hooks
  const playButtonSound = useButtonSound();
  const playGroupPlaySound = useGroupPlaySound();
  const playLanternSound = useLanternSound();
  const queryClient = useQueryClient();
  
  // XP System hook
  const {
    levelUpModal,
    closeLevelUpModal
  } = useXPSystem();
  
  // State management
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showProcessingNotification, setShowProcessingNotification] = useState(false);
  const [processingVideoTitle, setProcessingVideoTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hideWatchedVideos, setHideWatchedVideos] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [videoFeedVideos, setVideoFeedVideos] = useState<any[]>([]);
  const [highlightedVideoId, setHighlightedVideoId] = useState<string | null>(null);
  const [targetVideoId, setTargetVideoId] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<string>("");
  const [filteredVideos, setFilteredVideos] = useState<any[]>([]);
  const [videoContentFilter, setVideoContentFilter] = useState<string>("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<{ bounds: any; center: { lat: number; lng: number } } | null>(null);
  const [showSearchHereButton, setShowSearchHereButton] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [showNoResultsPopup, setShowNoResultsPopup] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCoinEarningWidget, setShowCoinEarningWidget] = useState(false);
  const [isLanternWorkflowActive, setIsLanternWorkflowActive] = useState(false);
  
  
  // Lantern state management
  const [isLanternActive, setIsLanternActive] = useState(false);
  const [lanternPosition, setLanternPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Handle lantern toggle
  const handleLanternToggle = (isActive: boolean) => {
    setIsLanternActive(isActive);
    if (isActive && userLocation) {
      // Position lantern at current map center or user location
      setLanternPosition(mapCenter || userLocation);
    } else {
      setLanternPosition(null);
    }
  };

  // Modal handlers
  const openModal = (modal: string) => setActiveModal(modal);
  const closeModal = () => {
    setActiveModal(null);
    setSelectedVideo(null);
  };

  // Welcome modal handler
  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    // Mark user as having seen the welcome modal
    localStorage.setItem('jemzy-welcome-seen', 'true');
  };

  // Navigation function for highlighting video on map
  const navigateToVideo = (video: any) => {
    console.log('Navigating to map for video:', video);
    console.log('Setting targetVideoId to:', video.id);
    setHighlightedVideoId(video.id);
    setTargetVideoId(video.id); // Track the specific video ID we want to play
    closeModal(); // Close any open modal
    
    // Clear highlighting after animation completes
    setTimeout(() => {
      setHighlightedVideoId(null);
      console.log('Cleared highlightedVideoId, but keeping targetVideoId:', video.id);
    }, 3000); // Clear after 3 seconds
  };

  // Location handling
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        
        // Check if there's a questId in URL params to center on quest
        const urlParams = new URLSearchParams(window.location.search);
        const questId = urlParams.get('questId');
        if (questId) {
          // Don't set map center yet, wait for quest data to load
          console.log('Found questId in URL:', questId);
        } else {
          setMapCenter(location);
        }
      });
    }
  }, []);

  // Check if user is first-time and show welcome modal
  useEffect(() => {
    if (user && !authLoading) {
      const hasSeenWelcome = localStorage.getItem('jemzy-welcome-seen');
      if (!hasSeenWelcome) {
        // Show welcome modal for first-time users
        setShowWelcomeModal(true);
      }
    }
  }, [user, authLoading]);

  // Data fetching - Use mapCenter if available, otherwise userLocation
  const queryLocation = mapCenter || userLocation;
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["/api/videos/nearby", queryLocation?.lat, queryLocation?.lng],
    queryFn: async () => {
      if (!queryLocation) return [];
      const params = new URLSearchParams({
        lat: queryLocation.lat.toString(),
        lng: queryLocation.lng.toString(),
        radius: "50000", // 50km radius to show all videos
        limit: "100"
      });
      const response = await fetch(`/api/videos/nearby?${params}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      return data;
    },
    enabled: !!queryLocation,
  });

  // Manual refresh function
  const handleRefreshMap = () => {
    console.log('Refresh button clicked - refetching videos');
    refetchVideos();
    queryClient.invalidateQueries({ predicate: (query) => 
      query.queryKey[0] === "/api/videos/nearby" 
    });
  };

  // Fetch quest data to handle quest centering
  const { data: quests = [] } = useQuery<any[]>({
    queryKey: ["/api/quests/active"],
    enabled: !!userLocation,
  });


  const { data: profileData } = useQuery<AppUser>({
  queryKey: ["/api/auth/user"],
  queryFn: async () => (await fetch("/api/auth/user", { credentials: "include" })).json(),
  enabled: !!user,
});

  // Debug profile data
  useEffect(() => {
    if (profileData) {
      console.log('Profile data loaded:', profileData);
      console.log('Profile image URL:', profileData.profileImageUrl);
      console.log('Ready Player Me URL:', profileData.readyPlayerMeAvatarUrl);
    }
  }, [profileData]);

  // Video comment restoration logic - moved after videos query
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRestoreVideoComment = urlParams.get('restoreVideoComment') === 'true';
    const openVideoId = urlParams.get('openVideo');
    const videoId = urlParams.get('videoId');
    const commentId = urlParams.get('commentId');
    const videoIndex = urlParams.get('videoIndex');
    const highlightVideoParam = urlParams.get('highlightVideo');
    
    // Handle video highlighting from group profile gems
    if (highlightVideoParam && videos?.length > 0) {
      console.log('Highlighting video from URL parameter:', highlightVideoParam);
      setHighlightedVideoId(highlightVideoParam);
      
      // Clean up URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Clear highlighting after animation completes
      setTimeout(() => {
        setHighlightedVideoId(null);
      }, 3000);
    }
    // Handle video modal restoration from profile navigation
    else if (openVideoId && videos?.length > 0) {
      console.log('Restoring video modal for videoId:', openVideoId);
      
      // Find the video to open
      const videoToOpen = videos.find((v: any) => v.id === openVideoId);
      if (videoToOpen) {
        // Clean up URL parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Check video modal context to determine which modal to open
        const storedContext = sessionStorage.getItem('videoModalContext');
        if (storedContext) {
          try {
            const context = JSON.parse(storedContext);
            if (context.modalType === 'videoFeedModal') {
              // Open VideoFeedModal
              setVideoFeedVideos([videoToOpen]);
              setActiveModal('videoFeedModal');
            } else {
              // Default to VideoPlayerModal
              setSelectedVideo(videoToOpen);
              setActiveModal('videoPlayer');
            }
            sessionStorage.removeItem('videoModalContext');
          } catch (error) {
            // Fallback to VideoPlayerModal
            setSelectedVideo(videoToOpen);
            setActiveModal('videoPlayer');
          }
        } else {
          // Default to VideoPlayerModal
          setSelectedVideo(videoToOpen);
          setActiveModal('videoPlayer');
        }
      }
    }
    // Handle video comment restoration
    else if (shouldRestoreVideoComment && videoId && commentId && videos?.length > 0) {
      console.log('Restoring video comment modal for:', { videoId, commentId, videoIndex });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Wait for videos to load then restore the modal
      setTimeout(() => {
        console.log('🏠 Home: Setting up VideoFeedModal with videos:', videos?.length);
        // Open video feed modal with the appropriate video
        setVideoFeedVideos(videos || []);
        setActiveModal('videoFeedModal');
        
        // Set additional restoration context for VideoFeedModal
        sessionStorage.setItem('restoreVideoCommentModal', JSON.stringify({
          videoId,
          commentId,
          videoIndex: parseInt(videoIndex || '0', 10)
        }));
      }, 1500); // Allow more time for videos to load
    }
  }, [videos]);

  // Handle quest centering from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const questId = urlParams.get('questId');
    
    if (questId && quests.length > 0 && userLocation) {
      const targetQuest = quests.find((q: any) => q.id === questId);
      if (targetQuest && targetQuest.latitude && targetQuest.longitude) {
        console.log('Centering map on quest:', targetQuest.title);
        // Ensure coordinates are numbers
        const lat = parseFloat(targetQuest.latitude);
        const lng = parseFloat(targetQuest.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter({
            lat: lat,
            lng: lng
          });
        } else {
          console.error('Invalid quest coordinates:', { lat: targetQuest.latitude, lng: targetQuest.longitude });
        }
        
        // Clear the URL parameter to avoid re-centering
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [quests, userLocation]);

  // Event handlers
  const centerOnUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(newLocation);
        setMapCenter(newLocation);
      });
    }
  };

  const handleVideoClick = async (video: any) => {
    console.log('handleVideoClick called with video:', video.id);
    console.log('Current targetVideoId:', targetVideoId);
    
    // If we have a target video ID, prefer that video over others at the same location
    let videoToPlay = video;
    if (targetVideoId && videos?.data) {
      const targetVideo = videos.data.find((v: any) => v.id === targetVideoId);
      if (targetVideo) {
        console.log('Using target video instead of clicked video:', targetVideo.id);
        videoToPlay = targetVideo;
        // Don't clear targetVideoId here - wait until video is actually played
      }
    }
    
    setSelectedVideo(videoToPlay);
    
    // Check if user is within activation radius (30.48 meters = 100 feet)
    if (userLocation && videoToPlay.latitude && videoToPlay.longitude) {
      const distance = calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        parseFloat(videoToPlay.latitude), 
        parseFloat(videoToPlay.longitude)
      );
      
      // If within activation radius, automatically activate the video
      if (distance <= 30.48) {
        try {
          console.log(`Within activation radius (${Math.round(distance)}m), activating video...`);
          await fetch(`/api/videos/${videoToPlay.id}/activate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: userLocation.lat,
              longitude: userLocation.lng,
            }),
          });
          console.log('Video activated successfully');
        } catch (error) {
          console.error('Error activating video:', error);
        }
        
        // Play video immediately since it's now activated - use single video modal
        setVideoFeedVideos([videoToPlay]);
        openModal("videoFeedModal");
        return;
      }
      
      // If outside activation radius, check if video is purchased or already activated
      try {
        const response = await fetch(`/api/videos/${videoToPlay.id}/purchased`);
        if (response.ok) {
          const data = await response.json();
          if (data.purchased) {
            // Video is purchased or activated - play for free
            console.log('Video has free access:', data.activated ? 'activated' : 'purchased');
            setVideoFeedVideos([videoToPlay]);
            openModal("videoFeedModal");
            return;
          }
        }
      } catch (error) {
        console.error('Error checking purchase status:', error);
      }
      
      // Video not purchased and not activated - show coin payment modal
      setSelectedVideo({ ...videoToPlay, distance: Math.round(distance) });
      openModal("coinPayment");
      return;
    }
    
    // No location available - play for free
    setVideoFeedVideos([videoToPlay]);
    openModal("videoFeedModal");
  };

  // Helper function to calculate distance between two points in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handlePlayVideosInRadius = (videos: any[]) => {
    // If we have a target video ID, prioritize it and play it directly
    if (targetVideoId) {
      const targetVideo = videos.find(v => v.id === targetVideoId);
      if (targetVideo) {
        console.log('Playing target video directly from radius:', targetVideo.id);
        handleVideoClick(targetVideo);
        return;
      }
    }
    
    setVideoFeedVideos(videos);
    openModal("videoFeed");
  };

  const handleQuestClick = (quest: any) => {
    console.log('Quest marker clicked:', quest.id, quest.title);
    setSelectedQuest(quest);
    openModal("questDetail");
  };

  // Search handler functions
  const handleLocationSearch = async (query: string, suggestions: any[]) => {
    setSearchQuery(query);
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      // The place search already includes coordinates, no need for additional API call
      if (suggestion.geometry?.location) {
        const newLocation = {
          lat: suggestion.geometry.location.lat,
          lng: suggestion.geometry.location.lng,
        };
        console.log('🗺️ LOCATION SEARCH: Navigating to:', newLocation, 'for query:', query);
        setMapCenter(newLocation);
        // Zoom will be handled by MapInterface component automatically
      } else {
        console.error('Location search: No coordinates found in suggestion:', suggestion);
      }
    }
  };

  const handleVideoContentSearch = async (query: string) => {
    setVideoContentFilter(query);
    setIsSearchActive(true);
    
    try {
      console.log(`🔍 VIDEO SEARCH: Searching for "${query}"`);
      const response = await fetch(`/api/search/videos?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const matchingVideos = await response.json();
        console.log(`🔍 VIDEO SEARCH: Found ${matchingVideos.length} videos matching "${query}"`);
        setFilteredVideos(matchingVideos);
        if (userLocation) {
          setSearchedLocation(userLocation);
        }
        
        // Show popup if no matches found
        if (matchingVideos.length === 0) {
          setShowNoResultsPopup(true);
          setTimeout(() => setShowNoResultsPopup(false), 3000);
        }
      }
    } catch (error) {
      console.error('Video content search failed:', error);
    }
  };

  const handleKeywordSearch = async (keyword: string) => {
    setKeywordFilter(keyword);
    setIsSearchActive(true);
    
    if (!userLocation) return;

    try {
      const response = await fetch(
        `/api/search/videos/keywords?keyword=${encodeURIComponent(keyword)}&lat=${userLocation.lat}&lng=${userLocation.lng}`
      );
      
      if (response.ok) {
        const matchingVideos = await response.json();
        setFilteredVideos(matchingVideos);
        setSearchedLocation(userLocation);
        
        // Show popup if no matches found
        if (matchingVideos.length === 0) {
          setShowNoResultsPopup(true);
          setTimeout(() => setShowNoResultsPopup(false), 3000);
        }
      }
    } catch (error) {
      console.error('Keyword search failed:', error);
    }
  };

  const handleClearSearch = () => {
    setKeywordFilter("");
    setVideoContentFilter("");
    setFilteredVideos([]);
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setIsSearchActive(false);
    setShowSearchHereButton(false);
    setSearchedLocation(null);
  };

  const handleSearchHere = () => {
    if (!currentViewport?.center) return;
    
    setUserLocation(currentViewport.center);
    setSearchedLocation(currentViewport.center);
    
    // Re-run the active search in the new location
    if (videoContentFilter) {
      handleVideoContentSearch(videoContentFilter);
    } else if (keywordFilter) {
      handleKeywordSearch(keywordFilter);
    }
    
    setShowSearchHereButton(false);
  };

  const handleViewportChange = (viewport: { bounds: any; center: { lat: number; lng: number } }) => {
    setCurrentViewport(viewport);
    
    // Show "search here" button if there's an active search and user has moved significantly
    if (isSearchActive && searchedLocation) {
      const distance = calculateDistance(
        searchedLocation.lat,
        searchedLocation.lng,
        viewport.center.lat,
        viewport.center.lng
      );
      
      // Show button if moved more than 1km
      if (distance > 1000) {
        setShowSearchHereButton(true);
      }
    }
  };

  const handlePayAndPlay = () => {
    console.log('handlePayAndPlay called, selectedVideo:', selectedVideo);
    // Store video reference before closing modal
    const videoToPlay = selectedVideo;
    setActiveModal(null); // Close coin payment modal without clearing selectedVideo
    // Small delay to ensure modal state is properly updated
    setTimeout(() => {
      if (videoToPlay) {
        setSelectedVideo(videoToPlay); // Ensure video is set
        console.log('Opening video player after payment');
        openModal("videoPlayer");
      }
    }, 100);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Ad Placeholder - Fixed at top */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gray-200 flex justify-center items-center">
        <div className="w-[320px] h-[50px] sm:w-[468px] sm:h-[60px] lg:w-[728px] lg:h-[90px] bg-gray-300 rounded flex items-center justify-center">
          <span className="text-gray-600 text-sm font-medium">Ad Space</span>
        </div>
      </div>
      
      {/* Map Interface - Full screen below ad */}
      <div className="absolute top-[50px] sm:top-[60px] lg:top-[90px] left-0 right-0 bottom-[80px]">
        <MapInterface
          videos={isSearchActive ? filteredVideos : videos}
          userLocation={userLocation}
          mapCenter={mapCenter}
          onVideoClick={handleVideoClick}
          onPlayVideosInRadius={handlePlayVideosInRadius}
          targetVideoId={targetVideoId}
          onLocationCenter={centerOnUserLocation}
          isLoading={videosLoading}
          selectedCategories={selectedCategories}
          hideWatchedVideos={hideWatchedVideos}
          appliedFilters={appliedFilters}
          userGemCoins={user?.gemCoins || 0}
          userLanterns={profileData?.lanterns || 0}
          onCoinClick={() => openModal("jems")}
          highlightedVideoId={highlightedVideoId ?? undefined}
          userProfileImage={profileData?.readyPlayerMeAvatarUrl || profileData?.profileImageUrl}
          onViewportChange={handleViewportChange}
          onQuestClick={handleQuestClick}
          lanternState={{
            isActive: isLanternActive,
            position: lanternPosition
          }}
          onLanternActivate={async (position) => {
            console.log('🏮 LANTERN ACTIVATION: Starting at position:', position);
            console.log('🏮 LANTERN COUNT: Current lanterns:', profileData?.lanterns);
            
            setLanternPosition(position);
            
            // Check if user has lanterns available
            if (!profileData?.lanterns || profileData.lanterns <= 0) {
              console.log('🏮 ERROR: No lanterns available');
              return;
            }
            
            // First, check for videos within the lantern play radius (100ft = 30.48 meters)
            const videosInRadius = videos.filter(video => {
              const lat = video.latitude || video.lat;
              const lng = video.longitude || video.lng;
              
              if (!lat || !lng) {
                return false;
              }
              
              const distance = calculateDistance(
                position.lat,
                position.lng,
                parseFloat(lat),
                parseFloat(lng)
              );
              return distance <= 30.48; // 100 feet in meters
            });
            
            console.log('🏮 VIDEOS FOUND: Videos in lantern radius:', videosInRadius.length);
            
            // Only consume lantern if there are videos to play
            if (videosInRadius.length === 0) {
              console.log('🏮 INFO: No videos in radius - lantern not consumed');
              return;
            }
            
            // Now deduct the lantern since we confirmed there are videos to play
            console.log('🏮 API CALL: Deducting lantern via /api/user/use-lantern...');
            try {
              const response = await fetch('/api/user/use-lantern', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('🏮 SUCCESS: Lantern deducted! Remaining:', result.remainingLanterns);
                // Force multiple cache invalidations to ensure UI updates
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }),
                  queryClient.refetchQueries({ queryKey: ['/api/users/me/profile'] })
                ]);
                console.log('🏮 CACHE: Forcibly refreshed profile data');
              } else {
                console.error('🏮 ERROR: Failed to deduct lantern:', response.status);
                return; // Don't proceed if lantern deduction failed
              }
            } catch (error) {
              console.error('🏮 ERROR: Lantern API call failed:', error);
              return; // Don't proceed if API call failed
            }
            
            // Play ONLY the lantern woosh sound (not the group play sound)
            playLanternSound();
            
            // Start playing the videos in the radius
            handlePlayVideosInRadius(videosInRadius);
            
            console.log('🏮 SUCCESS: Lantern used! Videos are now playing in group mode.');
          }}
          onLanternPurchase={() => {
            // Open purchase modal for lanterns
            openModal("buyLanterns");
          }}
        />
      </div>

      {/* Music Control Button */}
      <MusicControlButton 
        userProfile={profileData}
        isLanternActive={isLanternActive}
        onLanternToggle={handleLanternToggle}
      />

      {/* Floating Search and Categories - Over map */}
      <div className="absolute top-[64px] sm:top-[74px] lg:top-[104px] left-4 right-4 z-40">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg">
          <div className="flex items-center space-x-2 mb-3">
            <DualModeSearch
              onLocationSearch={handleLocationSearch}
              onKeywordSearch={handleKeywordSearch}
              onVideoContentSearch={handleVideoContentSearch}
              onClearSearch={handleClearSearch}
              userLocation={userLocation}
              className="flex-1"
              isSearchActive={isSearchActive}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playButtonSound();
                openModal("filters");
              }}
              onMouseEnter={(e) => {
                const randomColor = getRandomColor();
                e.currentTarget.style.setProperty('--hover-color', randomColor);
              }}
              className="p-2 border-gray-200 rounded-xl random-hover"
            >
              <Sliders className="w-4 h-4 text-gray-600" />
            </Button>
          </div>

          {/* Category Pills */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  playButtonSound();
                  setSelectedCategories(prev => {
                    const isSelected = prev.includes(category.name);
                    const allCategoriesSelected = prev.length === categories.length;
                    
                    if (allCategoriesSelected) {
                      return [category.name];
                    } else if (isSelected) {
                      return prev.filter(cat => cat !== category.name);
                    } else {
                      return [...prev, category.name];
                    }
                  });
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm min-w-0 flex-shrink-0 ${
                  selectedCategories.includes(category.name)
                    ? `${category.color} text-white`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <img src={category.icon} alt={category.name} className="w-4 h-auto object-contain" />
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Here Button - Shows when viewport has moved during active search */}
        {showSearchHereButton && (
          <div className="mt-3 flex justify-center">
            <Button
              onClick={handleSearchHere}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full shadow-lg"
            >
              Search here
            </Button>
          </div>
        )}
      </div>

      {/* No Results Popup */}
      {showNoResultsPopup && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm mx-4">
          <div className="text-center">
            <div className="text-gray-600 mb-2">
              No videos found matching your search
            </div>
            <div className="text-sm text-gray-500">
              Try searching in a different area or using different terms
            </div>
          </div>
        </div>
      )}

      {/* Combined Music and Activity Control Panel */}
      <MusicControlButton 
        onActivityTrackingClick={() => setShowCoinEarningWidget(true)}
        userProfile={profileData}
        isLanternActive={isLanternActive}
        onLanternToggle={(active: boolean) => {
          setIsLanternActive(active);
          if (active && userLocation) {
            setLanternPosition(userLocation);
          } else {
            setLanternPosition(null);
          }
        }}
      />

      {/* Bottom Navigation - Hidden during lantern workflow */}
      {!isLanternWorkflowActive && (
        <BottomNavigation
          onUpload={() => openModal("upload")}
        />
      )}

      {/* Modals */}

      {activeModal === "videoPlayer" && selectedVideo && (
        <VideoPlayerModal
          videos={[selectedVideo]}
          initialIndex={0}
          onClose={() => {
            setTargetVideoId(null); // Clear target video ID when closing player
            closeModal();
          }}
          onNavigateToMap={navigateToVideo}
          onNavigateToProfile={() => {
            // Store video modal context for back navigation
            const videoModalContext = {
              page: 'home',
              modalType: 'videoPlayer',
              videoId: selectedVideo.id,
              videoTitle: selectedVideo.title,
              returnPath: '/'
            };
            sessionStorage.setItem('videoModalContext', JSON.stringify(videoModalContext));
            
            closeModal();
            // Navigate to profile with openVideo parameter for restoration
            window.location.href = `/profile?openVideo=${selectedVideo.id}`;
          }}
        />
      )}

      {/* {activeModal === "jems" && (
        <GemCoinsModal onClose={closeModal} />
      )} */}

      {activeModal === "buyLanterns" && (
        <LanternPurchaseModal
          isOpen={true}
          onClose={closeModal}
          userProfile={profileData}
          onPurchaseSuccess={() => {
            // Refresh profile data after purchase
            queryClient.invalidateQueries({ queryKey: ['/api/users/me/profile'] });
            closeModal();
          }}
        />
      )}

      {activeModal === "filters" && (
        <FiltersModal 
          onClose={closeModal}
          currentHideWatchedVideos={hideWatchedVideos}
          onApplyFilters={(filters) => {
            setAppliedFilters(filters);
            setHideWatchedVideos(filters.hideWatchedVideos);
          }}
        />
      )}



      {activeModal === "coinPayment" && selectedVideo && (
        <CoinPaymentModal
          video={selectedVideo}
          onClose={closeModal}
          onPayAndPlay={handlePayAndPlay}
          onOpenCoinShop={() => openModal("jems")}
        />
      )}

      {activeModal === "videoFeed" && videoFeedVideos && (
        <ScrollableVideoFeed
          videos={videoFeedVideos}
          onClose={closeModal}
        />
      )}

      {activeModal === "videoFeedModal" && (
        <VideoFeedModal
          videos={videoFeedVideos || videos?.data || []}
          onClose={closeModal}
          initialVideoIndex={0}
        />
      )}

      {activeModal === "upload" && (
        <VideoUploadModal
          onClose={closeModal}
          userLocation={userLocation}
          onProcessingStarted={(videoTitle) => {
            setProcessingVideoTitle(videoTitle);
            setShowProcessingNotification(true);
            closeModal();
          }}
        />
      )}

      {/* Processing Notification Modal */}
      <ProcessingNotificationModal
        isOpen={showProcessingNotification}
        onClose={() => setShowProcessingNotification(false)}
        title={processingVideoTitle}
      />

      {/* Quest Detail Modal */}
      {activeModal === "questDetail" && selectedQuest && (
        <QuestDetailModal
          isOpen={true}
          onClose={closeModal}
          questId={typeof selectedQuest === 'string' ? selectedQuest : selectedQuest.id}
        />
      )}

      {/* Welcome Modal for First-Time Users */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
      />

      {/* Coin Earning Widget Modal */}
      {showCoinEarningWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <Button
              onClick={() => setShowCoinEarningWidget(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-2 z-10"
              size="sm"
            >
              ✕
            </Button>
            <div className="p-4">
              <CoinEarningWidget />
            </div>
          </div>
        </div>
      )}



      <LevelUpModal
        isOpen={levelUpModal.isOpen}
        oldLevel={levelUpModal.oldLevel}
        newLevel={levelUpModal.newLevel}
        currentXP={levelUpModal.currentXP}
        nextLevelXP={levelUpModal.nextLevelXP}
        onClose={closeLevelUpModal}
      />


    </div>
  );
}