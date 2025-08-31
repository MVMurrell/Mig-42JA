import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Bell, Settings, Edit, Share, MapPin, MessageCircle, Heart, Play, Camera, Upload, User, X, Bookmark, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { useAuth } from "@/hooks/useAuth.ts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { apiRequest } from "@/lib/queryClient.ts";
import VideoPlayerModal from "@/components/VideoPlayerModal.tsx";
import ProcessingNotificationModal from "@/components/ProcessingNotificationModal.tsx";
import PendingVideoModal from "@/components/PendingVideoModal.tsx";
import AudioTestModal from "@/components/AudioTestModal.tsx";
import VideoRejectionModal from "@/components/VideoRejectionModal.tsx";
import VideoErrorModal from "@/components/VideoErrorModal.tsx";
import { ReadyPlayerMeInfoModal } from "@/components/ReadyPlayerMeInfoModal.tsx";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { XPDisplay } from "@/components/XPDisplay.tsx";
import { useLocation } from "wouter";
import {  fmtNum } from "@/lib/format.ts";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("videos");

  // Fetch enhanced user profile with database data
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["/api/users/me/profile"],
    queryFn: async () => {
      // Fetching enhanced profile data
      const response = await fetch(`/api/users/me/profile?t=${Date.now()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
        if (response.status === 401) {
            return null;                        // gracefully handle logged-out
        }
        if (!response.ok) {
        console.error('❌ Profile fetch failed:', response.status, response.statusText);
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      // Enhanced profile data received
      return data;
    },
    enabled: !!user?.id,
    retry: 2,
    staleTime: 0, // Force fresh fetch every time
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Profile query state (logging removed for performance)

  // Fallback to user data if profile data isn't available
  const displayProfile = profile || user || {};

  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showReadyPlayerMeModal, setShowReadyPlayerMeModal] = useState(false);
  const [showReadyPlayerMeInfo, setShowReadyPlayerMeInfo] = useState(false);
  const [showDisconnectConfirmModal, setShowDisconnectConfirmModal] = useState(false);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up Ready Player Me listeners when component unmounts
      if ((window as any).readyPlayerMeCleanup) {
        (window as any).readyPlayerMeCleanup();
        (window as any).readyPlayerMeCleanup = null;
      }
    };
  }, []);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showProcessingNotification, setShowProcessingNotification] = useState(false);
  const [showPendingVideoModal, setShowPendingVideoModal] = useState(false);
  const [showAudioTestModal, setShowAudioTestModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedTestVideo, setSelectedTestVideo] = useState<any>(null);
  const [processingVideoTitle, setProcessingVideoTitle] = useState("");
  const [selectedPendingVideo, setSelectedPendingVideo] = useState<any>(null);
  const [selectedRejectedVideo, setSelectedRejectedVideo] = useState<any>(null);
  const [selectedErrorVideo, setSelectedErrorVideo] = useState<any>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Back button handler with proper browser history
  const handleBackNavigation = () => {
    console.log('Back button clicked - starting navigation');
    
    // Force cleanup of any Ready Player Me state
    if ((window as any).readyPlayerMeCleanup) {
      console.log('Cleaning up Ready Player Me state before navigation');
      (window as any).readyPlayerMeCleanup();
      (window as any).readyPlayerMeCleanup = null;
    }
    
    // Check for stored video modal context first
    const videoModalContext = sessionStorage.getItem('videoModalContext');
    if (videoModalContext) {
      try {
        const context = JSON.parse(videoModalContext);
        console.log('Profile: Restoring video modal context:', context);
        
        // Clear the stored context
        sessionStorage.removeItem('videoModalContext');
        
        // Navigate back to the original page and trigger the video modal
        if (context.page === 'home') {
          navigate(`/?openVideo=${context.videoId}`);
          return;
        } else if (context.page === 'group-profile') {
          navigate(`${context.returnPath}?openVideo=${context.videoId}`);
          return;
        }
      } catch (error) {
        console.error('Failed to parse stored video modal context:', error);
        sessionStorage.removeItem('videoModalContext');
      }
    }

    // Check for stored video comment context
    const storedContext = sessionStorage.getItem('videoCommentContext');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        console.log('Profile: Restoring video comment context:', context);
        
        // Clear the stored context
        sessionStorage.removeItem('videoCommentContext');
        
        // Navigate back to home with restoration parameters
        navigate(`/?restoreVideoComment=true&videoId=${context.videoId}&commentId=${context.commentId}&videoIndex=${context.videoIndex}`);
        return;
      } catch (error) {
        console.error('Failed to parse stored video comment context:', error);
        sessionStorage.removeItem('videoCommentContext');
      }
    }
    
    // Check for previous page context
    const referrerContext = sessionStorage.getItem('profileReferrer');
    if (referrerContext) {
      try {
        const context = JSON.parse(referrerContext);
        console.log('Profile: Using stored referrer context:', context);
        sessionStorage.removeItem('profileReferrer');
        
        // Navigate back to the previous page
        if (context.path) {
          // Check if we need to restore modal state
          if (context.modalContext?.isInThread && context.modalContext?.threadId) {
            console.log('Profile: Restoring thread modal context:', context.modalContext);
            // Navigate to group page with thread restoration parameters
            const groupId = context.path.split('/group/')[1];
            if (groupId) {
              navigate(`/group/${groupId}?restoreThread=${context.modalContext.threadId}&threadName=${encodeURIComponent(context.modalContext.threadName || '')}`);
              return;
            }
          }
          navigate(context.path);
          return;
        }
      } catch (error) {
        console.error('Failed to parse referrer context:', error);
        sessionStorage.removeItem('profileReferrer');
      }
    }
    
    console.log('No stored context found, using fallback navigation');
    
    // Default to home page since there's no navigation context
    console.log('Navigating to home page');
    navigate('/');
  };

  // Share profile handler
  const handleShareProfile = async () => {
    try {
      const shareUrl = `${window.location.origin}/profile/${user?.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Profile",
          text: `Check out ${user?.firstName || ""} ${user?.lastName || ""}`.trim() + "'s profile on Jemzy!",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Profile link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fallback to copying to clipboard
      try {
        const shareUrl = `${window.location.origin}/profile/${user?.id}`;
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Profile link copied to clipboard",
        });
      } catch (copyError) {
        toast({
          title: "Share failed",
          description: "Unable to share profile",
          variant: "destructive",
        });
      }
    }
  };



  // Fetch user's videos (including processing videos for own profile)
  const { data: userVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["/api/users", profile?.id || user?.id, "videos"],
    queryFn: async () => {
      const userId = profile?.id || user?.id;
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/videos`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
    enabled: !!(profile?.id || user?.id),
    refetchInterval: 5000, // Refresh every 5 seconds to show processing updates
    staleTime: 2000, // Cache for 2 seconds to reduce loading flicker
  });

  // Fetch user's liked videos
  const { data: likedVideos = [], isLoading: likedLoading } = useQuery({
    queryKey: ["/api/users", profile?.id || user?.id, "liked"],
    queryFn: async () => {
      const userId = profile?.id || user?.id;
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/liked`);
      if (!response.ok) throw new Error('Failed to fetch liked videos');
      return response.json();
    },
    enabled: !!(profile?.id || user?.id),
  });

  // Fetch user's saved videos
  const { data: savedVideos = [], isLoading: savedLoading } = useQuery({
    queryKey: ["/api/users", profile?.id || user?.id, "saved"],
    queryFn: async () => {
      const userId = profile?.id || user?.id;
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/saved`);
      if (!response.ok) throw new Error('Failed to fetch saved videos');
      return response.json();
    },
    enabled: !!(profile?.id || user?.id),
    staleTime: 30000, // Cache saved videos for 30 seconds
  });

  // Fetch user's video comments
  const { data: videoComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/users", profile?.id || user?.id, "video-comments"],
    queryFn: async () => {
      const userId = profile?.id || user?.id;
      if (!userId) return [];
      const response = await fetch(`/api/users/${userId}/video-comments?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch video comments');
      return response.json();
    },
    enabled: !!(profile?.id || user?.id),
    refetchInterval: 5000, // Refresh to show processing updates
    staleTime: 2000, // Cache for 2 seconds to reduce loading flicker
  });



  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest("/api/users/profile", "PUT", profileData);
    },
    onSuccess: () => {
      // Invalidate both auth user and profile queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      
      // Force a fresh fetch with cache busting
      queryClient.removeQueries({ queryKey: ["/api/users/me/profile"] });
      queryClient.refetchQueries({ queryKey: ["/api/users/me/profile"] });
      
      setShowEditProfileModal(false);
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to update your profile.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update profile picture mutation (now uses FormData like quest images)
  const updateProfilePictureMutation = useMutation({
    mutationFn: async (imageBlob: Blob) => {
      console.log('🔥 FRONTEND: Starting profile picture upload mutation (quest pattern)');
      const formData = new FormData();
      formData.append('image', imageBlob, 'profile-picture.jpg');
      console.log('🔥 FRONTEND: FormData prepared, making request to /api/users/profile-picture');
      
      // Step 1: Upload to GCS (without database update)
      const response = await fetch('/api/users/profile-picture', {
        method: 'POST',
        credentials: 'include', // Include authentication cookies
        body: formData,
      });
      
      console.log('🔥 FRONTEND: Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log('🔥 FRONTEND: Upload failed:', errorData);
        const error = new Error(errorData?.message || `HTTP ${response.status}`);
        (error as any).response = { 
          status: response.status, 
          data: errorData 
        };
        throw error;
      }
      
      const result = await response.json();
      console.log('✅ FRONTEND: Profile picture upload completed successfully:', result);
      
      return result;
    },
    onSuccess: () => {
      // Force immediate cache invalidation and refetch with delay to ensure DB update completes
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Add a short delay before refetching to ensure database update is complete
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/users/me/profile"] });
      }, 500);
      
      // Force image refresh by updating the key
      setImageRefreshKey(prev => prev + 1);
      
      setShowProfilePictureModal(false);
      setIsUsingCamera(false);
      setCapturedImage(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      toast({
        title: "Profile picture updated!",
        description: "Your profile picture has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Profile picture upload error:", error);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to update your profile picture.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle content moderation rejection
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update profile picture. Please try again.";
      const errorReason = error?.response?.data?.reason;
      
      toast({
        title: error?.response?.status === 400 ? "Content Rejected" : "Update failed",
        description: errorReason || errorMessage,
        variant: "destructive",
      });
    },
  });

  // Avatar availability checker
  const checkAvatarAvailability = async (avatarUrl: string): Promise<boolean> => {
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Update Ready Player Me avatar mutation
  const updateReadyPlayerMeAvatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      console.log('🔄 MUTATION: Starting Ready Player Me avatar update with URL:', avatarUrl);
      try {
        const result = await apiRequest("/api/users/ready-player-me-avatar", "POST", { avatarUrl });
        console.log('✅ MUTATION: Avatar update successful:', result);
        
        // Immediately refresh profile - don't wait for PNG availability
        console.log('🔄 Immediately refreshing profile with new avatar...');
        queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
        queryClient.refetchQueries({ queryKey: ["/api/users/me/profile"] });
        
        toast({
          title: "Avatar connected!",
          description: "Your Ready Player Me avatar has been saved to your profile.",
        });
        
        return result;
      } catch (error) {
        console.error('❌ MUTATION: Avatar update failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Close the Ready Player Me modal
      setShowReadyPlayerMeModal(false);
      
      // Show the informational modal
      setShowReadyPlayerMeInfo(true);
      
      // Immediate cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/users/me/profile"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to connect Ready Player Me.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to connect avatar",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const openEditProfileModal = () => {
    setEditFirstName(displayProfile.firstName || displayProfile.given_name || "");
    setEditLastName(displayProfile.lastName || displayProfile.family_name || "");
    setEditBio(displayProfile.bio || "");
    setEditUsername(displayProfile.username || "");
    setShowEditProfileModal(true);
  };

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      firstName: editFirstName,
      lastName: editLastName,
      bio: editBio,
      username: editUsername,
    });
  };

  // Handler for clicking on video comments - navigates to original video
  const handleVideoCommentClick = async (comment: any) => {
    if (!comment.video?.id) {
      toast({
        title: "Original video not found",
        description: "Cannot navigate to the original video.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch all videos to create proper context for navigation
      const response = await fetch('/api/videos/nearby?lat=36.057103538352976&lng=-94.16056871585545&radius=50000&limit=100');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const allVideos = await response.json();
      
      // Find the original video in the list and add highlight comment ID
      const originalVideoIndex = allVideos.findIndex((v: any) => v.id === comment.video.id);
      if (originalVideoIndex === -1) {
        toast({
          title: "Video not found",
          description: "The original video is no longer available.",
          variant: "destructive",
        });
        return;
      }

      // Add the highlight comment ID to the original video
      const enhancedVideos = [...allVideos];
      enhancedVideos[originalVideoIndex] = {
        ...enhancedVideos[originalVideoIndex],
        highlightCommentId: comment.id
      };

      console.log('Navigating to video comment:', {
        commentId: comment.id,
        originalVideoId: comment.video.id,
        highlightCommentId: enhancedVideos[originalVideoIndex].highlightCommentId,
        videoIndex: originalVideoIndex
      });

      // Navigate to the original video with proper context
      setVideos(enhancedVideos);
      setSelectedVideoIndex(originalVideoIndex);
      setShowVideoPlayer(true);
    } catch (error) {
      console.error('Error navigating to original video:', error);
      toast({
        title: "Navigation failed",
        description: "Could not open the original video.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideoComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/video-comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Refresh video comments
        queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "video-comments"] });
        toast({
          title: "Video comment deleted",
          description: "Your video comment has been successfully deleted.",
        });
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting video comment:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete video comment. Please try again.",
        variant: "destructive",
      });
    }
  };

// called from a click handler
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,                // no audio -> fewer autoplay issues
    });
    setCameraStream(stream);
    setIsUsingCamera(true);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      // safer: wait for metadata, then try to play
      videoRef.current.onloadedmetadata = async () => {
        try { await videoRef.current!.play(); } catch { /* user gesture required; ignore */ }
      };
    }
  } catch (error) {
    // toast remains as you have it
  }
};


  // Effect to set video stream when camera starts
  // useEffect(() => {
  //   if (cameraStream && videoRef.current && isUsingCamera) {
  //     console.log('📸 CAMERA: Setting video source and playing...');
  //     videoRef.current.srcObject = cameraStream;
  //     videoRef.current.play().then(() => {
  //       console.log('📸 CAMERA: Video playing successfully');
  //     }).catch(console.error);
  //   }
  // }, [cameraStream, isUsingCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For file uploads, we can use the file directly without converting to base64
      updateProfilePictureMutation.mutate(file);
    }
  };

  const handleConnectReadyPlayerMe = () => {
    // Create a modal with Ready Player Me iframe
    setShowReadyPlayerMeModal(true);
  };

  // Disconnect Ready Player Me avatar mutation
  const disconnectReadyPlayerMeMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 MUTATION: Disconnecting Ready Player Me avatar');
      const result = await apiRequest("/api/users/ready-player-me-avatar/disconnect", "POST", {});
      console.log('✅ MUTATION: Ready Player Me disconnected successfully:', result);
      return result;
    },
    onSuccess: () => {
      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ["/api/users/me/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/users/me/profile"] });
      
      // Force image refresh by updating the key
      setImageRefreshKey(Date.now());
      
      setShowProfilePictureModal(false);
      
      toast({
        title: "Avatar disconnected!",
        description: "Ready Player Me avatar has been removed from your profile.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to log in to disconnect Ready Player Me.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to disconnect avatar",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDisconnectReadyPlayerMe = () => {
    // Show the in-app confirmation modal instead of browser dialog
    setShowDisconnectConfirmModal(true);
  };

  const confirmDisconnect = () => {
    setShowDisconnectConfirmModal(false);
    disconnectReadyPlayerMeMutation.mutate();
  };

  const handleSaveProfilePicture = () => {
    if (capturedImage) {
      // Convert base64 data URL to Blob (similar to quest image upload)
      const base64Data = capturedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      updateProfilePictureMutation.mutate(blob);
    }
  };

  const cancelCamera = () => {
    setIsUsingCamera(false);
    setCapturedImage(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleVideoClick = (video: any, index: number) => {
    setSelectedVideoIndex(index);
    setShowVideoPlayer(true);
  };

  // Retry mechanism for failed video processing
  const retryVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      // For now, use regular delete since retry-processing endpoint doesn't exist
      const response = await apiRequest(`/api/videos/${videoId}`, "DELETE");
      // apiRequest already returns parsed JSON data
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "videos"] });
      toast({
        title: "Processing restarted",
        description: "Your video is being processed again. This may take a few minutes.",
      });
    },
    onError: (error: any) => {
      console.error('Retry failed:', error);
      toast({
        title: "Retry failed",
        description: "Unable to restart video processing. Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Delete failed video mutation
  const deleteFailedVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest(`/api/videos/${videoId}`, "DELETE");
      // apiRequest already returns parsed JSON data
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "videos"] });
      toast({
        title: "Video deleted",
        description: "Failed video has been completely removed.",
      });
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
      toast({
        title: "Delete failed",
        description: "Unable to delete video. Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleRetryVideoProcessing = (video: any) => {
    if (video?.id) {
      retryVideoMutation.mutate(video.id);
    }
  };

  const handleDeleteFailedVideo = (video: any) => {
    if (video?.id) {
      deleteFailedVideoMutation.mutate(video.id);
    }
  };

  const renderTabContent = () => {
    if (activeTab === "videos") {
      if (videosLoading) {
        return (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        );
      }

      if (userVideos.length === 0) {
        return (
          <div className="text-center py-8">
            <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No videos yet</p>
          </div>
        );
      }

      // Filter videos properly based on processing status
      const pendingVideos = userVideos.filter((video: any) => 
        ['processing', 'uploaded', 'pending', 'failed', 'rejected', 'rejected_by_moderation', 'rejected_by_ai', 'under_appeal', 'flagged_by_user'].includes(video.processingStatus)
      );
      
      const activeVideos = userVideos.filter((video: any) => 
        video.videoUrl && video.videoUrl !== '' && video.isActive === true && 
        video.processingStatus === 'approved'
      );

      return (
        <div className="grid grid-cols-3 gap-1">
          {/* Pending videos first */}
          {pendingVideos.map((video: any, index: number) => {
            const isRejected = video.processingStatus === 'rejected_by_moderation' || video.processingStatus === 'rejected';
            const isRejectedByAI = video.processingStatus === 'rejected_by_ai';
            const isFailed = video.processingStatus === 'failed';
            const isUnderAppeal = video.processingStatus === 'under_appeal';
            const isFlaggedByUser = video.processingStatus === 'flagged_by_user';
            
            // Check if AI rejection is due to technical failure (audio processing)
            const isTechnicalFailure = isRejectedByAI && video.flaggedReason && 
              (video.flaggedReason.includes('Audio processing failed') || 
               video.flaggedReason.includes('FFmpeg') ||
               video.flaggedReason.includes('technical'));
            
            return (
              <button
                key={`pending-${video.id}`}
                onClick={() => {
                  if (isFailed || isTechnicalFailure) {
                    setSelectedErrorVideo(video);
                    setShowErrorModal(true);
                  } else if (isRejected || (isRejectedByAI && !isTechnicalFailure)) {
                    setSelectedRejectedVideo(video);
                    setShowRejectionModal(true);
                  } else if (isFlaggedByUser) {
                    setSelectedRejectedVideo(video);
                    setShowRejectionModal(true);
                  } else {
                    setSelectedPendingVideo(video);
                    setShowPendingVideoModal(true);
                  }
                }}
                className={`aspect-square rounded overflow-hidden relative group border-2 ${
                  isRejected ? 'bg-red-100 border-red-200' : 
                  isFailed ? 'bg-red-100 border-red-200' : 
                  isUnderAppeal ? 'bg-blue-100 border-blue-200' :
                  'bg-orange-100 border-orange-200'
                }`}
              >
                <div className={`w-full h-full flex flex-col items-center justify-center ${
                  isRejected ? 'bg-gradient-to-br from-red-200 to-red-300' :
                  isFailed ? 'bg-gradient-to-br from-red-200 to-red-300' :
                  isUnderAppeal ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                  'bg-gradient-to-br from-orange-200 to-orange-300'
                }`}>
                  <Clock className={`w-8 h-8 mb-2 ${
                    isRejected ? 'text-red-600' :
                    isFailed ? 'text-red-600' :
                    isUnderAppeal ? 'text-blue-600 animate-pulse' :
                    'text-orange-600 animate-pulse'
                  }`} />
                  <span className={`text-xs font-medium px-2 text-center ${
                    isRejected ? 'text-red-700' :
                    isFailed ? 'text-red-700' :
                    isUnderAppeal ? 'text-blue-700' :
                    'text-orange-700'
                  }`}>
                    {video.processingStatus === 'processing' ? 'Processing...' : 
                     video.processingStatus === 'uploaded' ? 'Reviewing...' : 
                     video.processingStatus === 'failed' ? 'Failed' :
                     video.processingStatus === 'rejected_by_moderation' ? 'Rejected' : 
                     video.processingStatus === 'rejected_by_ai' ? (isTechnicalFailure ? 'Processing Failed' : 'Content Rejected') :
                     video.processingStatus === 'under_appeal' ? 'Under Appeal' : 
                     video.processingStatus === 'flagged_by_user' ? 'Under Review' : 'Pending...'}
                  </span>

                  {video.processingStatus === 'uploaded' && (
                    <span className="text-xs text-orange-600 px-2 text-center mt-1">
                      Content Review
                    </span>
                  )}
                  {video.processingStatus === 'rejected_by_moderation' && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Content Violation
                    </span>
                  )}
                  {video.processingStatus === 'failed' && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Upload Error
                    </span>
                  )}
                  {video.processingStatus === 'rejected_by_ai' && isTechnicalFailure && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Tap for Options
                    </span>
                  )}
                  {video.processingStatus === 'rejected_by_ai' && !isTechnicalFailure && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Content Issue
                    </span>
                  )}
                  {video.processingStatus === 'under_appeal' && (
                    <span className="text-xs text-blue-600 px-2 text-center mt-1">
                      Being Reviewed
                    </span>
                  )}
                </div>
                <div className="absolute top-2 left-2 right-2">
                  <div className={`text-xs font-medium truncate px-2 py-1 rounded ${
                    isRejected ? 'text-red-800 bg-red-200/80' :
                    isFailed ? 'text-red-800 bg-red-200/80' :
                    'text-orange-800 bg-orange-200/80'
                  }`}>
                    {video.title}
                  </div>
                </div>
                {isRejected && (
                  <div className="absolute bottom-2 right-2">
                    <div className="text-xs text-red-700 bg-red-300/90 px-2 py-1 rounded-full">
                      Tap to Appeal
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Active videos */}
          {activeVideos.map((video: any, index: number) => (
            <div 
              key={video.id} 
              className="relative aspect-square bg-black rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => handleVideoClick(video, userVideos.findIndex(v => v.id === video.id))}
            >
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-300 to-blue-400">
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Play className="w-3 h-3 mr-1" />
                        {video.views || 0}
                      </div>
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Heart className="w-3 h-3 mr-1" />
                        {video.likes || 0}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 left-2 right-2">
                  <div className="text-white text-xs font-medium truncate bg-black/70 px-2 py-1 rounded">
                    {video.title}
                  </div>
                </div>
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "liked") {
      if (likedLoading) {
        return (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        );
      }

      if (likedVideos.length === 0) {
        return (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No liked videos yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-1">
          {likedVideos.map((video: any, index: number) => (
            <div 
              key={video.id} 
              className="relative aspect-square bg-black rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => handleVideoClick(video, index)}
            >
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-300 to-red-400">
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Play className="w-3 h-3 mr-1" />
                        {video.views || 0}
                      </div>
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Heart className="w-3 h-3 mr-1" />
                        {video.likes || 0}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 left-2 right-2">
                  <div className="text-white text-xs font-medium truncate bg-black/70 px-2 py-1 rounded">
                    {video.title}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "comments") {
      if (commentsLoading) {
        return (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        );
      }

      if (videoComments.length === 0) {
        return (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No video comments yet</p>
          </div>
        );
      }

      // Filter video comments properly based on processing status
      const pendingComments = videoComments.filter((comment: any) => 
        ['processing', 'uploaded', 'pending', 'failed', 'rejected_by_moderation', 'rejected_by_ai', 'under_appeal', 'flagged'].includes(comment.processingStatus)
      );
      
      const activeComments = videoComments.filter((comment: any) => 
        comment.commentVideoUrl && comment.commentVideoUrl !== '' && comment.isActive === true && 
        !['processing', 'uploaded', 'pending', 'failed', 'rejected_by_moderation', 'under_appeal'].includes(comment.processingStatus)
      );

      return (
        <div className="grid grid-cols-3 gap-1">
          {/* Pending video comments first */}
          {pendingComments.map((comment: any, index: number) => {
            const isRejected = comment.processingStatus === 'rejected_by_moderation';
            const isRejectedByAI = comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'flagged';
            const isFailed = comment.processingStatus === 'failed';
            const isUnderAppeal = comment.processingStatus === 'under_appeal';
            
            return (
              <button
                key={`pending-comment-${comment.id}`}
                onClick={() => {
                  if (isRejected || isRejectedByAI) {
                    // Create a proper video comment object for the rejection modal
                    const videoCommentForModal = {
                      id: `comment-${comment.id}`, // Use prefixed ID for video comments
                      title: `Comment on "${comment.video?.title || 'Video'}"`,
                      videoUrl: comment.commentVideoUrl,
                      thumbnailUrl: `https://vz-7c674c55-8ff.b-cdn.net/${comment.bunnyVideoId}/thumbnail.jpg`,
                      duration: comment.duration || "0:00",
                      processingStatus: comment.processingStatus,
                      flaggedReason: comment.flaggedReason,
                      audioFlagReason: comment.audioFlagReason,
                      createdAt: comment.createdAt,
                      bunnyVideoId: comment.bunnyVideoId,
                      commentType: comment.commentType,
                      originalVideo: comment.video,
                      commentId: comment.id, // Keep the actual comment ID
                      userId: user?.id,
                      views: 0,
                      likes: 0,
                      isActive: true
                    };
                    setSelectedRejectedVideo(videoCommentForModal);
                    setShowRejectionModal(true);
                  } else if (isFailed) {
                    setSelectedErrorVideo(comment);
                    setShowErrorModal(true);
                  } else {
                    setSelectedPendingVideo(comment);
                    setShowPendingVideoModal(true);
                  }
                }}
                className={`aspect-square rounded overflow-hidden relative group border-2 ${
                  isRejected ? 'bg-red-100 border-red-200' : 
                  isFailed ? 'bg-red-100 border-red-200' : 
                  isUnderAppeal ? 'bg-blue-100 border-blue-200' :
                  'bg-orange-100 border-orange-200'
                }`}
              >
                <div className={`w-full h-full flex flex-col items-center justify-center ${
                  isRejected ? 'bg-gradient-to-br from-red-200 to-red-300' :
                  isFailed ? 'bg-gradient-to-br from-red-200 to-red-300' :
                  isUnderAppeal ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                  'bg-gradient-to-br from-orange-200 to-orange-300'
                }`}>
                  <MessageCircle className={`w-8 h-8 mb-2 ${
                    isRejected ? 'text-red-600' :
                    isFailed ? 'text-red-600' :
                    isUnderAppeal ? 'text-blue-600 animate-pulse' :
                    'text-orange-600 animate-pulse'
                  }`} />
                  <span className={`text-xs font-medium px-2 text-center ${
                    isRejected ? 'text-red-700' :
                    isFailed ? 'text-red-700' :
                    isUnderAppeal ? 'text-blue-700' :
                    'text-orange-700'
                  }`}>
                    {comment.processingStatus === 'processing' ? 'Processing...' : 
                     comment.processingStatus === 'uploaded' ? 'Reviewing...' : 
                     comment.processingStatus === 'failed' ? 'Failed' :
                     comment.processingStatus === 'rejected_by_moderation' ? 'Rejected' : 
                     comment.processingStatus === 'under_appeal' ? 'Under Appeal' : 'Pending...'}
                  </span>
                  {comment.processingStatus === 'processing' && comment.audioModerationStatus === 'pending' && (
                    <span className="text-xs text-orange-600 px-2 text-center mt-1">
                      Audio Analysis
                    </span>
                  )}
                  {comment.processingStatus === 'uploaded' && (
                    <span className="text-xs text-orange-600 px-2 text-center mt-1">
                      Content Review
                    </span>
                  )}
                  {comment.processingStatus === 'rejected_by_moderation' && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Content Violation
                    </span>
                  )}
                  {comment.processingStatus === 'failed' && (
                    <span className="text-xs text-red-600 px-2 text-center mt-1">
                      Upload Error
                    </span>
                  )}
                  {comment.processingStatus === 'under_appeal' && (
                    <span className="text-xs text-blue-600 px-2 text-center mt-1">
                      Being Reviewed
                    </span>
                  )}
                </div>
                <div className="absolute top-2 left-2 right-2">
                  <div className={`text-xs font-medium truncate px-2 py-1 rounded ${
                    isRejected ? 'text-red-800 bg-red-200/80' :
                    isFailed ? 'text-red-800 bg-red-200/80' :
                    'text-orange-800 bg-orange-200/80'
                  }`}>
                    {comment.title || 'Video Comment'}
                  </div>
                </div>
                {isRejected && (
                  <div className="absolute bottom-2 right-2">
                    <div className="text-xs text-red-700 bg-red-300/90 px-2 py-1 rounded-full">
                      Tap to Appeal
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          
          {/* Active video comments */}
          {activeComments.map((comment: any, index: number) => {
            // Create a proper video object for the video comment itself
            const videoCommentData = {
              id: `comment-${comment.id}`, // Use a prefixed ID to avoid conflicts with real videos
              title: `Comment on "${comment.video?.title || 'Video'}"`,
              videoUrl: comment.commentVideoUrl, // Use the actual video comment URL
              thumbnailUrl: `https://vz-7c674c55-8ff.b-cdn.net/${comment.bunnyVideoId}/thumbnail.jpg`, // Generate thumbnail for the comment video
              duration: comment.duration || "0:00",
              processingStatus: comment.processingStatus,
              createdAt: comment.createdAt,
              bunnyVideoId: comment.bunnyVideoId, // This is the comment video's Bunny ID
              commentType: comment.commentType,
              originalVideo: comment.video, // Keep reference to original video
              isVideoComment: true, // Flag to identify this as a video comment
              commentId: comment.id, // Keep the original comment ID
              userId: user?.id,
              views: 0, // Video comments don't track views separately
              likes: 0, // Video comments don't track likes separately
              isActive: true,
              // Ensure consistent video URLs
              videoDbUrl: comment.commentVideoUrl // Make sure this matches videoUrl
            };
            
            return (
              <div 
                key={comment.id} 
                className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleVideoCommentClick(comment)}
              >
                {videoCommentData.thumbnailUrl ? (
                  <img 
                    src={videoCommentData.thumbnailUrl} 
                    alt={videoCommentData.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center bg-black/70 px-1 rounded">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Comment
                        </div>
                        <div className="flex items-center bg-black/70 px-1 rounded">
                          <Clock className="w-3 h-3 mr-1" />
                          {videoCommentData.duration}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 right-2">
                    <div className="text-white text-xs font-medium truncate bg-black/70 px-2 py-1 rounded">
                      {videoCommentData.title}
                    </div>
                  </div>
                  {/* Delete button */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(`/api/video-comments/${comment.id}`, {
                            method: 'DELETE',
                          });
                          if (response.ok) {
                            // Comprehensive cache invalidation
                            queryClient.invalidateQueries({
                              queryKey: ['/api/video-comments']
                            });
                            queryClient.invalidateQueries({
                              queryKey: ['/api/users', user?.id, 'video-comments']
                            });
                            queryClient.invalidateQueries({
                              queryKey: ['/api/user']
                            });
                            toast({
                              title: "Comment deleted",
                              description: "Video comment deleted successfully",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Delete failed",
                            description: "Could not delete video comment",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white p-1 h-auto"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === "saved") {
      if (savedLoading) {
        return (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        );
      }

      if (savedVideos.length === 0) {
        return (
          <div className="text-center py-8">
            <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No saved videos yet</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 gap-1">
          {savedVideos.map((video: any, index: number) => (
            <div 
              key={video.id} 
              className="relative aspect-square bg-black rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => handleVideoClick(video, index)}
            >
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-yellow-400">
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Play className="w-3 h-3 mr-1" />
                        {video.views || 0}
                      </div>
                      <div className="flex items-center bg-black/70 px-1 rounded">
                        <Heart className="w-3 h-3 mr-1" />
                        {video.likes || 0}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 left-2 right-2">
                  <div className="text-white text-xs font-medium truncate bg-black/70 px-2 py-1 rounded">
                    {video.title}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }


  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200" />
          <div className="p-6 space-y-4">
            <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-32 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between mobile-safe-area-top">
        <button 
          onClick={handleBackNavigation}
          className="flex items-center justify-center w-10 h-10 rounded-md random-hover"
          onMouseEnter={(e) => {
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
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            e.currentTarget.style.setProperty('--hover-color', randomColor);
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h1 className="text-lg font-semibold">Profile</h1>
        
        <div className="flex items-center space-x-2">
          <NotificationBell />
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6 text-center border-b border-gray-100">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mx-auto">
            {(() => {
              // Simplified hierarchy: Ready Player Me > profileImageUrl (from backend)
              // Backend now handles the hierarchy and sends only one profileImageUrl
              const finalImageUrl = displayProfile.readyPlayerMeAvatarUrl || displayProfile.profileImageUrl;
              
              return finalImageUrl ? (
                <img 
                  key={`profile-${displayProfile.id}-${imageRefreshKey}`} // Force re-render when image changes
                  src={finalImageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Enhanced Ready Player Me fallback system
                  const target = e.target as HTMLImageElement;
                  // Only show "Avatar Rendering..." if there's actually a Ready Player Me URL
                  if (displayProfile.readyPlayerMeAvatarUrl && target.src.includes('readyplayer.me')) {
                    // Show Ready Player Me processing state instead of Google fallback
                    const readyPlayerMeDiv = target.parentElement;
                    if (readyPlayerMeDiv) {
                      readyPlayerMeDiv.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex flex-col items-center justify-center text-white">
                          <div class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                          <div class="text-xs text-center px-2">Ready Player Me<br/>Avatar Rendering...</div>
                        </div>
                      `;
                    }
                  } else {
                    // For non-Ready Player Me errors, show a fallback image or placeholder
                    const fallbackDiv = target.parentElement;
                    if (fallbackDiv) {
                      fallbackDiv.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      `;
                    }
                  }
                }}
              />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
              );
            })()}
          </div>
          <button 
            onClick={() => setShowProfilePictureModal(true)}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
        
        <h2 className="text-xl font-bold mb-1">
          {displayProfile.firstName || displayProfile.given_name || ""} {displayProfile.lastName || displayProfile.family_name || ""}
        </h2>
        
        <p className="text-gray-600 mb-4">
          {displayProfile.bio || "No bio yet"}
        </p>
        
        {/* XP Display */}
        <div className="mb-6">
          <XPDisplay 
            variant="detailed" 
            showLevel={true} 
            showProgress={true} 
            className="max-w-sm mx-auto"
          />
        </div>
        
        <div className="flex justify-center space-x-8 mb-6">
          <button 
            onClick={() => navigate('/collectors')}
            className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-xl font-bold">{displayProfile.stats?.collectorsCount || 0}</div>
            <div className="text-sm text-gray-500">Collectors</div>
          </button>
          <button 
            onClick={() => navigate('/collecting')}
            className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="text-xl font-bold">{displayProfile.stats?.collectingCount || 0}</div>
            <div className="text-sm text-gray-500">Collecting</div>
          </button>
          <button className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors">
            <div className="text-xl font-bold">{displayProfile.stats?.likesCount || 0}</div>
            <div className="text-sm text-gray-500">Likes</div>
          </button>
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={openEditProfileModal}
            className="flex-1 bg-gray-100 text-gray-900 hover:bg-gray-200"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button 
            onClick={handleShareProfile}
            variant="outline" 
            className="flex-1"
          >
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: "videos", label: "Jems", icon: Play },
            { id: "comments", label: "Comments", icon: MessageCircle },
            { id: "liked", label: "Liked", icon: Heart },
            { id: "saved", label: "Saved", icon: Bookmark },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-red-500 text-red-500"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 pb-24">
        {renderTabContent()}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Edit Profile</h3>
                <button 
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter your last name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter your username"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <Button 
                  onClick={() => setShowEditProfileModal(false)}
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateProfile}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Modal */}
      {showProfilePictureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Update Profile Picture</h3>
                <button 
                  onClick={() => {
                    setShowProfilePictureModal(false);
                    cancelCamera();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {!isUsingCamera && !capturedImage && (
                <div className="space-y-4">
                  <Button 
                    onClick={startCamera}
                    className="w-full bg-red-500 hover:bg-red-600"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Use Camera
                  </Button>
                  
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline" 
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>

                  {displayProfile.readyPlayerMeAvatarUrl ? (
                    <Button 
                      onClick={handleDisconnectReadyPlayerMe}
                      variant="outline" 
                      className="w-full border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Disconnect Ready Player Me
                    </Button>
                  ) : null}
                  
                  {/* TEMPORARILY HIDDEN - Ready Player Me Connect Button 
                      - All functionality preserved for future testing
                      - To re-enable: replace 'false &&' with normal condition
                  {false && !displayProfile.readyPlayerMeAvatarUrl && (
                    <Button 
                      onClick={handleConnectReadyPlayerMe}
                      variant="outline" 
                      className="w-full border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Connect Ready Player Me
                    </Button>
                  )}
                  */}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
              
              {isUsingCamera && !capturedImage && (
                <div className="space-y-4">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    muted 
                    playsInline
                    className="w-full rounded-lg"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={cancelCamera}
                      variant="outline" 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={capturePhoto}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Capture
                    </Button>
                  </div>
                </div>
              )}
              
              {capturedImage && (
                <div className="space-y-4">
                  <img 
                    src={capturedImage} 
                    alt="Preview" 
                    className="w-full rounded-lg"
                  />
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => {
                        setCapturedImage(null);
                        if (isUsingCamera && cameraStream) {
                          // Return to camera view
                        } else {
                          // Return to options
                        }
                      }}
                      variant="outline" 
                      className="flex-1"
                    >
                      Retake
                    </Button>
                    <Button 
                      onClick={handleSaveProfilePicture}
                      disabled={updateProfilePictureMutation.isPending}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      {updateProfilePictureMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <VideoPlayerModal
          videos={videos.length > 0 ? videos : // Use videos state if populated (from comment navigation)
                  activeTab === "videos" ? userVideos : 
                  activeTab === "comments" ? videoComments :
                  activeTab === "liked" ? likedVideos : savedVideos}
          initialIndex={selectedVideoIndex}
          onClose={() => {
            setShowVideoPlayer(false);
            setVideos([]); // Clear videos state when closing
          }}
          onNavigateToMap={() => {
            setShowVideoPlayer(false);
            setVideos([]); // Clear videos state when navigating
            navigate('/');
          }}
          onNavigateToProfile={() => {
            // Already on profile page, just close the modal
            setShowVideoPlayer(false);
            setVideos([]);
          }}
        />
      )}

      {/* Processing Notification Modal */}
      <ProcessingNotificationModal
        isOpen={showProcessingNotification}
        onClose={() => setShowProcessingNotification(false)}
        title={processingVideoTitle}
      />

      {/* Pending Video Modal */}
      {selectedPendingVideo && (
        <PendingVideoModal
          isOpen={showPendingVideoModal}
          onClose={() => {
            setShowPendingVideoModal(false);
            setSelectedPendingVideo(null);
          }}
          pendingVideo={selectedPendingVideo}
        />
      )}

      {selectedRejectedVideo && (
        <VideoRejectionModal
          isOpen={showRejectionModal}
          onClose={() => {
            setShowRejectionModal(false);
            setSelectedRejectedVideo(null);
          }}
          video={selectedRejectedVideo}
        />
      )}

      {selectedErrorVideo && (
        <VideoErrorModal
          video={selectedErrorVideo}
          onClose={() => {
            setShowErrorModal(false);
            setSelectedErrorVideo(null);
          }}
          onRetry={() => handleRetryVideoProcessing(selectedErrorVideo)}
          onDelete={() => handleDeleteFailedVideo(selectedErrorVideo)}
        />
      )}

      {/* Ready Player Me Modal - Full Screen for Mobile */}
      {showReadyPlayerMeModal && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h3 className="text-lg font-semibold">Create Your Avatar</h3>
            <button 
              onClick={() => {
                // Cleanup Ready Player Me listeners
                if ((window as any).readyPlayerMeCleanup) {
                  (window as any).readyPlayerMeCleanup();
                }
                setShowReadyPlayerMeModal(false);
              }}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Description */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Create a personalized 3D avatar that will appear on the map when other users view your videos.
            </p>
          </div>
          
          {/* Ready Player Me iframe - takes full remaining space */}
          <div className="flex-1 relative">
            <iframe
              src="https://jemzy.readyplayer.me/avatar?frameApi&clearCache"
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen"
              ref={(iframe) => {
                if (iframe) {
                  // Setup message listener for Ready Player Me
                  const handleMessage = (event: MessageEvent) => {
                    // Accept messages from Ready Player Me domains
                    if (event.origin !== 'https://jemzy.readyplayer.me' && 
                        event.origin !== 'https://readyplayer.me') return;
                    
                    // Filter out Stripe messages to reduce console spam
                    if (event.data?.type === 'parent' && 
                        (event.data?.sourceFrameId?.includes('StripeController') ||
                         event.data?.sourceFrameId?.includes('privateStripeController'))) {
                      return;
                    }
                    
                    console.log('Ready Player Me message received:', event.data);
                    
                    // Handle avatar exported event (new avatar creation)
                    if (event.data?.eventName === 'v1.avatar.exported') {
                      console.log('Avatar exported:', event.data.url);
                      const avatarUrl = event.data.url;
                      if (avatarUrl) {
                        // Convert to 2D portrait format
                        const portraitUrl = avatarUrl.replace('.glb', '.png') + '?scene=portrait&transparent=true&width=256&height=256';
                        console.log('Updating avatar with exported URL:', portraitUrl);
                        updateReadyPlayerMeAvatarMutation.mutate(portraitUrl);
                        setShowReadyPlayerMeModal(false);
                      }
                    }
                    
                    // Handle avatar selection (when user clicks existing avatar)
                    if (event.data?.eventName === 'v1.avatar.selected') {
                      console.log('Avatar selected:', event.data.url);
                      const avatarUrl = event.data.url;
                      if (avatarUrl) {
                        // Convert to 2D portrait format  
                        const portraitUrl = avatarUrl.replace('.glb', '.png') + '?scene=portrait&transparent=true&width=256&height=256';
                        console.log('Updating avatar with selected URL:', portraitUrl);
                        updateReadyPlayerMeAvatarMutation.mutate(portraitUrl);
                        setShowReadyPlayerMeModal(false);
                      }
                    }
                    
                    // Handle direct avatar ID (what we're actually receiving)
                    if (typeof event.data === 'string' && event.data.length === 24) {
                      console.log('Avatar ID received:', event.data);
                      // Construct the Ready Player Me avatar URL from the ID
                      const avatarUrl = `https://models.readyplayer.me/${event.data}.glb`;
                      // Convert to 2D portrait format
                      const portraitUrl = `https://models.readyplayer.me/${event.data}.png?scene=portrait&transparent=true&width=256&height=256`;
                      console.log('Updating avatar with constructed URL:', portraitUrl);
                      console.log('Mutation function status:', updateReadyPlayerMeAvatarMutation.isPending ? 'pending' : 'ready');
                      
                      try {
                        updateReadyPlayerMeAvatarMutation.mutate(portraitUrl);
                        console.log('Avatar mutation triggered successfully');
                        
                        // Immediately close modal and cleanup listeners
                        setShowReadyPlayerMeModal(false);
                        if ((window as any).readyPlayerMeCleanup) {
                          (window as any).readyPlayerMeCleanup();
                          (window as any).readyPlayerMeCleanup = null;
                        }
                      } catch (error) {
                        console.error('Error triggering avatar mutation:', error);
                      }
                    }
                  };
                  
                  window.addEventListener('message', handleMessage);
                  
                  // Cleanup function
                  const cleanup = () => {
                    window.removeEventListener('message', handleMessage);
                  };
                  
                  // Store cleanup function for modal close
                  (window as any).readyPlayerMeCleanup = cleanup;
                }
              }}
            />
          </div>
          
          {/* Bottom safe area for mobile devices */}
          <div className="h-safe-area-inset-bottom bg-white"></div>
        </div>
      )}

      {/* Disconnect Ready Player Me Confirmation Modal */}
      <Dialog open={showDisconnectConfirmModal} onOpenChange={setShowDisconnectConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect Ready Player Me Avatar?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Ready Player Me avatar? 
              Your uploaded or Google profile picture will be used instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowDisconnectConfirmModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDisconnect}
              disabled={disconnectReadyPlayerMeMutation.isPending}
              className="flex-1"
            >
              {disconnectReadyPlayerMeMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ready Player Me Info Modal */}
      <ReadyPlayerMeInfoModal
        isOpen={showReadyPlayerMeInfo}
        onClose={() => setShowReadyPlayerMeInfo(false)}
      />
    </div>
  );
}