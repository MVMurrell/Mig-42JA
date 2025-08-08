import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button.tsx';
import { Slider } from '@/components/ui/slider.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu.tsx';
import { X, Heart, MessageCircle, Share, Bookmark, Flag, Settings, Edit3, MoreVertical, Send, Loader2, Camera, Smile, Play, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { apiRequest } from '@/lib/queryClient.ts';

import OtherUserProfileModal from './OtherUserProfileModal.js';
import VideoEditForm from './VideoEditForm.js';
import FlagButton from './FlagButton.js';
// Removed HLSVideoPlayer import - using native video element like VideoCommentPlayer
import VideoCommentRecorder from './VideoCommentRecorder.js';
import VideoRejectionModal from './VideoRejectionModal.js';
import { VideoCommentPlayer } from './VideoPlayerModal.js';
import { useLocation } from 'wouter';

interface Video {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  latitude?: string;
  longitude?: string;
  likes: number;
  views: number;
  watchedByUser?: boolean;
  requiresCoin?: boolean;
  distance?: number;
  createdAt?: string;
  groupName?: string;
  userId: string;
  userProfileImageUrl?: string;
  eventStartDate?: string;
  eventStartTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
}

interface VideoFeedModalProps {
  videos: Video[];
  onClose: () => void;
  initialVideoIndex?: number;
}

export default function VideoFeedModal({ videos, onClose, initialVideoIndex = 0 }: VideoFeedModalProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialVideoIndex);
  
  // Reduced logging to prevent console spam
  const [showCommentFullscreenModal, setShowCommentFullscreenModal] = useState(false);
  const [selectedFullscreenComment, setSelectedFullscreenComment] = useState<any>(null);
  const [commentVideoCurrentTime, setCommentVideoCurrentTime] = useState(0);
  const [commentVideoDuration, setCommentVideoDuration] = useState(0);
  const [isCommentVideoPlaying, setIsCommentVideoPlaying] = useState(false);
  const [commentVideoQuality, setCommentVideoQuality] = useState('720p');
  const [commentAvailableQualities, setCommentAvailableQualities] = useState<string[]>(['720p', '480p', '360p']);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Removed excessive debug logging to prevent console spam
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);


  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  // Profile modal removed - now navigates to profile page directly
  const [showOtherProfileModal, setShowOtherProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [videoQuality, setVideoQuality] = useState('720p');
  const [availableQualities] = useState(['240p', '360p', '720p', '1080p']);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hasTriggeredAutoplay, setHasTriggeredAutoplay] = useState(false);
  const [userHasPausedVideo, setUserHasPausedVideo] = useState(false);
  const [userControlledPlayback, setUserControlledPlayback] = useState(false);
  const [showVideoCommentRecorder, setShowVideoCommentRecorder] = useState(false);
  const [showCommentRejectionModal, setShowCommentRejectionModal] = useState(false);
  const [selectedRejectedComment, setSelectedRejectedComment] = useState<any>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  const currentVideo = videos?.[currentVideoIndex];
  
  // Current video state tracking (logging reduced to prevent console spam)

  // Mark video as watched mutation
  const markAsWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      console.log('🎬 WATCH TRACKING: Calling API to mark video as watched:', videoId);
      const response = await apiRequest(`/api/videos/${videoId}/watch`, 'POST');
      console.log('🎬 WATCH TRACKING: API response:', response);
      return response;
    },
    onSuccess: (data, videoId) => {
      console.log('🎬 WATCH TRACKING: Successfully marked video as watched:', videoId);
      // Invalidate relevant queries to update watch status
      queryClient.invalidateQueries({ queryKey: ['/api/videos/nearby'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      console.log('🎬 WATCH TRACKING: Cache invalidated for nearby videos');
    },
    onError: (error, videoId) => {
      console.error('🎬 WATCH TRACKING ERROR: Failed to mark video as watched:', videoId, error);
    }
  });

  // Increment video views mutation
  const incrementViewsMutation = useMutation({
    mutationFn: async (videoId: string) => {
      console.log('📊 VIEW TRACKING: Calling API to increment video views:', videoId);
      const response = await apiRequest(`/api/videos/${videoId}/view`, 'POST');
      console.log('📊 VIEW TRACKING: API response:', response);
      return response;
    },
    onSuccess: (data, videoId) => {
      console.log('📊 VIEW TRACKING: Successfully incremented view count for video:', videoId);
      // Invalidate relevant queries to update view counts
      queryClient.invalidateQueries({ queryKey: ['/api/videos/nearby'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      console.log('📊 VIEW TRACKING: Cache invalidated for videos to refresh view counts');
    },
    onError: (error, videoId) => {
      console.error('📊 VIEW TRACKING ERROR: Failed to increment video views:', videoId, error);
    }
  });

  // Fetch current user data
  const { data: currentUser } = useQuery<{ id: string; username?: string; profileImageUrl?: string }>({
    queryKey: ['/api/auth/user'],
    enabled: true
  });

  // Fetch user location
  const { data: userLocation } = useQuery<{ lat: number; lng: number }>({
    queryKey: ['/api/users/location'],
    enabled: !!currentUser
  });

  // Check for stored video comment context on component mount
  useEffect(() => {
    const storedContext = sessionStorage.getItem('videoCommentContext');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        if (context.videoId === currentVideo?.id && context.showCommentModal) {
          // Find the comment and restore the modal state
          const targetComment = comments.find(comment => comment.id === context.commentId);
          if (targetComment) {
            setSelectedFullscreenComment(targetComment);
            setShowCommentFullscreenModal(true);
            setIsPlaying(false);
            // Clear the stored context
            sessionStorage.removeItem('videoCommentContext');
          }
        }
      } catch (error) {
        console.error('Failed to parse stored video comment context:', error);
        sessionStorage.removeItem('videoCommentContext');
      }
    }

    // Check for restoration context from profile navigation - only run when videos are loaded
    const restoreContext = sessionStorage.getItem('restoreVideoCommentModal');
    if (restoreContext && videos.length > 0 && currentVideo) {
      try {
        const context = JSON.parse(restoreContext);
        console.log('🎬 VideoFeedModal: Attempting restoration:', {
          contextVideoId: context.videoId,
          currentVideoId: currentVideo?.id,
          videosLength: videos.length,
          targetVideoExists: videos.some(v => v.id === context.videoId)
        });
        
        // Find the target video and comment
        const targetVideoIndex = videos.findIndex(v => v.id === context.videoId);
        if (targetVideoIndex !== -1) {
          console.log('🎬 VideoFeedModal: Found target video at index:', targetVideoIndex);
          
          // Only set video index if it's different from current
          if (targetVideoIndex !== currentVideoIndex) {
            setCurrentVideoIndex(targetVideoIndex);
          }
          
          // Load comments for this specific video and restore immediately
          setTimeout(() => {
            fetch(`/api/videos/${context.videoId}/comments`)
              .then(response => response.json())
              .then(commentsData => {
                console.log('🎬 VideoFeedModal: Comments loaded for restoration:', commentsData.length);
                const targetComment = commentsData.find((comment: any) => comment.id === context.commentId);
                if (targetComment) {
                  console.log('🎬 VideoFeedModal: Restoring comment modal now');
                  setSelectedFullscreenComment(targetComment);
                  setShowCommentFullscreenModal(true);
                  setIsPlaying(false);
                } else {
                  console.log('🎬 VideoFeedModal: Target comment not found in loaded comments');
                }
              })
              .catch(error => {
                console.error('Failed to load comments for restoration:', error);
              });
          }, 500);
        } else {
          console.log('🎬 VideoFeedModal: Target video not found in videos array');
        }
        
        // Clear the restoration context
        sessionStorage.removeItem('restoreVideoCommentModal');
      } catch (error) {
        console.error('Failed to parse restore video comment modal context:', error);
        sessionStorage.removeItem('restoreVideoCommentModal');
      }
    }
  }, [videos, currentVideo, currentVideoIndex]);

  // Initialize like status and video data when video changes
  useEffect(() => {
    if (!currentVideo) return;
    
    // Reset states for new video
    setIsLiked(false);
    setLikeCount(currentVideo.likes || 0);
    setIsBookmarked(false);
    setComments([]);
    
    // Check like status for current user
    const checkLikeStatus = async () => {
      try {
        const response = await fetch(`/api/videos/${currentVideo.id}/like-status`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error('Failed to check like status:', error);
      }
    };
    
    checkLikeStatus();
    loadComments();
  }, [currentVideo?.id]);

  // Initialize video player with HLS support
  useEffect(() => {
    if (!videoRef.current || !currentVideo) {
      console.log('🎬 VideoFeedModal: Missing video ref or current video', {
        hasVideoRef: !!videoRef.current,
        hasCurrentVideo: !!currentVideo,
        currentVideoIndex,
        videosLength: videos.length
      });
      return;
    }

    const video = videoRef.current;
    const videoUrl = currentVideo.videoUrl;

    // Initializing video (logging reduced to prevent spam)

    // Clean up any existing HLS instance
    if (hlsRef.current) {
      // Cleaning up previous HLS instance
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Reset player state
    setHasTriggeredAutoplay(false);
    setCurrentTime(0);
    setDuration(0);

    // Check if the URL is an HLS stream
    if (Hls.isSupported() && (videoUrl.includes('.m3u8') || videoUrl.includes('bunny-proxy'))) {
      // Using HLS.js for stream
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 90
      });

      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // HLS manifest loaded successfully
        // Force play to ensure video starts
        if (!hasTriggeredAutoplay) {
          video.play().then(() => {
            // Video started playing
            setIsPlaying(true);
            setHasTriggeredAutoplay(true);
          }).catch(error => {
            console.error('🎬 VideoFeedModal: Autoplay failed:', error);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('🎬 VideoFeedModal: HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('🎬 VideoFeedModal: Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🎬 VideoFeedModal: Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('🎬 VideoFeedModal: Fatal error, destroying HLS instance');
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });
    } else {
      console.log('🎬 VideoFeedModal: Using native video element');
      video.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentVideo?.id]);

  // Initialize video data
  useEffect(() => {
    if (currentVideo) {
      setLikeCount(currentVideo.likes || 0);
      setIsLiked(false);
      setIsBookmarked(false);
      loadComments();
    }
  }, [currentVideo]);

  // Video event handlers
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoCanPlay = () => {
    console.log('VideoFeedModal: Video can play event - hasTriggeredAutoplay:', hasTriggeredAutoplay, 'userHasPausedVideo:', userHasPausedVideo);
    
    // Only auto-play on the very first canPlay event and if user hasn't manually paused
    if (videoRef.current && !hasTriggeredAutoplay && !userHasPausedVideo) {
      setHasTriggeredAutoplay(true);
      videoRef.current.muted = false; // Enable audio after autoplay starts
      
      videoRef.current.play().then(() => {
        console.log('VideoFeedModal: Started autoplay on canPlay event');
        
        // Mark video as watched and increment view count when it starts playing
        if (currentVideo?.id) {
          markAsWatchedMutation.mutate(currentVideo.id);
          incrementViewsMutation.mutate(currentVideo.id);
          console.log('VideoFeedModal: Marking video as watched and incrementing views:', currentVideo.id);
        }
      }).catch(error => {
        console.error('VideoFeedModal: Autoplay failed on canPlay:', error);
      });
    } else {
      console.log('VideoFeedModal: Skipping autoplay - already triggered or user has paused');
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = () => {
    // Loop the current video only if it was playing
    if (videoRef.current && isPlaying) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        console.log('VideoFeedModal: Video looped successfully');
      }).catch(error => {
        console.error('VideoFeedModal: Video loop failed:', error);
      });
    } else {
      // If manually paused, don't auto-restart
      console.log('VideoFeedModal: Video ended but was paused, not restarting');
      setIsPlaying(false);
    }
  };

  const handleVideoError = async (error: any) => {
    console.error(`Video ${currentVideo.id} failed to load:`, error);
    console.error(`Video URL: ${currentVideo.videoUrl}`);
    console.error(`Video error details:`, error);
    
    // Log error to backend
    try {
      await fetch('/api/log-video-playback-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: currentVideo.id,
          videoUrl: currentVideo.videoUrl,
          errorCode: error?.code?.toString() || 'unknown',
          errorMessage: error?.message || 'Unknown playback error',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        })
      });
    } catch (logError) {
      console.error('Failed to log playback error:', logError);
    }
  };

  // Use exactly the same pattern as VideoCommentPlayer
  useEffect(() => {
    const video = videoRef.current;
    console.log('🎬 VideoFeedModal: Setting up event listeners, video element:', !!video);
    if (!video) {
      console.log('🎬 VideoFeedModal: No video element found, skipping event listener setup');
      return;
    }

    const handlePlay = () => {
      console.log('🎬 VideoFeedModal: ⚠️ NATIVE PLAY EVENT in useEffect');
      // Only set isPlaying to true if user hasn't manually paused
      if (!userHasPausedVideo) {
        console.log('🎬 VideoFeedModal: Setting isPlaying to true (user has not manually paused)');
        setIsPlaying(true);
        
        // Mark video as watched and increment view count when it starts playing (for all play events, not just autoplay)
        if (currentVideo?.id) {
          markAsWatchedMutation.mutate(currentVideo.id);
          incrementViewsMutation.mutate(currentVideo.id);
          console.log('🎬 VideoFeedModal: Marking video as watched and incrementing views on play event:', currentVideo.id);
        }
      } else {
        console.log('🎬 VideoFeedModal: Ignoring native play event because user has manually paused');
      }
    };
    
    const handlePause = () => {
      console.log('🎬 VideoFeedModal: Native pause event in useEffect - setting isPlaying to false');
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleLoadedData = () => {
      console.log('🎬 VideoFeedModal: Video loaded successfully');
      setDuration(video.duration);
    };

    const handleError = () => {
      console.error('🎬 VideoFeedModal: Video failed to load');
    };

    console.log('🎬 VideoFeedModal: Adding event listeners to video element');
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    console.log('🎬 VideoFeedModal: All event listeners added successfully');

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // REMOVED: Duplicate play handler - the useEffect already handles this

  // REMOVED: Duplicate pause handler - the useEffect already handles this

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    console.log('🎬 VideoFeedModal: togglePlayPause called, current isPlaying:', isPlaying);
    
    if (isPlaying) {
      console.log('🎬 VideoFeedModal: User pausing video');
      setUserHasPausedVideo(true); // Track that user manually paused
      videoRef.current.pause();
    } else {
      console.log('🎬 VideoFeedModal: User playing video');
      setUserHasPausedVideo(false); // Reset when user manually plays
      videoRef.current.play().catch(error => {
        console.error('Video play failed:', error);
      });
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // Action handlers
  const handleLike = async () => {
    try {
      await fetch(`/api/videos/${currentVideo.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      toast({
        title: isLiked ? "Unliked" : "Liked",
        description: isLiked ? "Removed from liked videos" : "Added to liked videos"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    }
  };

  const handleBookmark = async () => {
    try {
      await fetch(`/api/videos/${currentVideo.id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setIsBookmarked(!isBookmarked);
      toast({
        title: isBookmarked ? "Unbookmarked" : "Bookmarked",
        description: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bookmark status",
        variant: "destructive"
      });
    }
  };

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, newText }: { commentId: number; newText: string }) => {
      await apiRequest(`/api/video-comments/${commentId}`, "PATCH", {
        comment: newText
      });
      return { commentId, newText };
    },
    onSuccess: (data) => {
      const { commentId, newText } = data;
      
      // Update the comment in local state immediately
      setComments(prevComments => 
        prevComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, comment: newText }
            : comment
        )
      );
      
      toast({
        title: "Comment Updated",
        description: "Your comment has been updated successfully.",
      });
      setEditingCommentId(null);
      setEditCommentText('');
      
      // Also reload comments from server to ensure consistency
      loadComments();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest(`/api/video-comments/${commentId}`, "DELETE");
      return commentId;
    },
    onSuccess: (deletedCommentId) => {
      // Remove the comment from local state immediately
      setComments(prevComments => 
        prevComments.filter(comment => comment.id !== deletedCommentId)
      );
      
      toast({
        title: "Comment Deleted",
        description: "Your comment has been deleted successfully.",
      });
      
      // Also reload comments from server to ensure consistency
      loadComments();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const loadComments = async () => {
    if (!currentVideo?.id) return;
    try {
      const response = await fetch(`/api/videos/${currentVideo.id}/comments`);
      const data = await response.json();
      setComments(data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsCommenting(true);
    try {
      const response = await fetch(`/api/videos/${currentVideo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post comment');
      }
      
      setNewComment('');
      loadComments();
      toast({
        title: "Comment added",
        description: "Your comment has been posted"
      });
    } catch (error) {
      console.error('Comment submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = () => {
    const videoUrl = `${window.location.origin}/video/${currentVideo.id}`;
    const shareText = `Check out this ${currentVideo.category} video "${currentVideo.title}" on Jemzy! 🎬`;
    
    if (navigator.share) {
      navigator.share({
        title: currentVideo.title,
        text: shareText,
        url: videoUrl,
      }).catch((error) => {
        console.log('Error sharing:', error);
        fallbackShare(videoUrl, shareText);
      });
    } else {
      fallbackShare(videoUrl, shareText);
    }
  };

  const fallbackShare = (url: string, text: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Video link has been copied to your clipboard"
      });
    }).catch(() => {
      // If clipboard fails, show modal with URL
      setErrorTitle("Share Video");
      setErrorMessage(`Copy this link to share: ${url}`);
      setShowErrorModal(true);
    });
  };

  const handleFlagVideo = () => {
    // Flag functionality handled by FlagButton component
  };

  const handleQualityChange = (quality: string) => {
    setVideoQuality(quality);
    // Quality change would trigger video reload with new quality
  };

  const handleEditVideo = () => {
    setShowEditModal(true);
  };

  const handlePlayVideo = (videoId: string) => {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
      setCurrentVideoIndex(videoIndex);
    }
  };

  const handleNavigateToMap = () => {
    onClose();
    // Navigation would be handled by parent component
  };

  // Safety guard: show loading if video is undefined
  if (!currentVideo) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">Loading video...</div>
      </div>
    );
  }

  // Check if video is playable
  const isVideoPlayable = currentVideo.videoUrl && currentVideo.videoUrl.trim() !== '';
  const videoStatus = (currentVideo as any).processingStatus || 'processing';
  
  if (!isVideoPlayable) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Video Unavailable</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {videoStatus === 'rejected_by_moderation' ? 
              'This video was rejected during content review.' :
            videoStatus === 'failed' ?
              'Video processing failed. Please try uploading again.' :
            videoStatus === 'processing' ?
              'Video is still being processed. Please check back later.' :
              'This video is not available for playback.'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Video Container */}
      <div className="relative w-full h-full">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          muted={true}
          loop={true}
          preload="metadata"
          poster={currentVideo.thumbnailUrl || undefined}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onTimeUpdate={handleVideoTimeUpdate}
          onCanPlay={handleVideoCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
        






        {/* Play/Pause overlay - Single overlay with proper layering */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center"
          onClick={(e) => {
            console.log('🎬 VideoFeedModal: Play button clicked');
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
          }}
        >
          {!isPlaying && (
            <div className="w-16 h-16 bg-white/80 hover:bg-white/95 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 transition-all duration-200 hover:scale-110">
              <Play className="w-8 h-8 text-black ml-0.5" fill="black" />
            </div>
          )}
        </div>

        {/* Overlay Controls */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side Action Bar */}
          <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-6 pointer-events-auto z-20">
            {/* User Profile Picture */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  if (currentUser?.id === currentVideo.userId) {
                    // Store video modal context for back navigation
                    const videoModalContext = {
                      page: 'home',
                      modalType: 'videoFeedModal',
                      videoId: currentVideo.id,
                      videoTitle: currentVideo.title,
                      returnPath: '/'
                    };
                    sessionStorage.setItem('videoModalContext', JSON.stringify(videoModalContext));
                    
                    // Navigate to profile with openVideo parameter for restoration
                    window.location.href = `/profile?openVideo=${currentVideo.id}`;
                  } else {
                    setSelectedUserId(currentVideo.userId);
                    setShowOtherProfileModal(true);
                  }
                }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 hover:scale-105 transition-transform relative z-30"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  <img
                    src={currentVideo.userProfileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentVideo.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentVideo.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
                    }}
                  />
                </div>
              </button>
            </div>

            {/* Like Button */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`w-12 h-12 rounded-full p-0 relative z-30 ${
                  isLiked 
                    ? 'bg-red-500/80 text-white hover:bg-red-500' 
                    : 'bg-black/20 text-white hover:bg-white/30'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              </Button>
              <span className="text-white text-xs mt-1 font-semibold">
                {likeCount}
              </span>
            </div>

            {/* Comment Button */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(true)}
                className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0 relative z-30"
                style={{ pointerEvents: 'auto' }}
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              <span className="text-white text-xs mt-1 font-semibold">
                {comments.length}
              </span>
            </div>

            {/* Save Button */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={`w-12 h-12 rounded-full text-white hover:bg-white/30 p-0 relative z-30 ${
                  isBookmarked ? 'bg-yellow-500/80' : 'bg-black/20'
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Share Button */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0 relative z-30"
                style={{ pointerEvents: 'auto' }}
              >
                <Share className="w-6 h-6" />
              </Button>
            </div>

            {/* Flag Button */}
            {currentVideo?.id && currentUser?.id !== currentVideo?.userId && (
              <div className="flex flex-col items-center">
                <FlagButton
                  contentType="video"
                  contentId={currentVideo.id}
                  contentTitle={currentVideo.title}
                  className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 hover:text-red-500"
                />
              </div>
            )}

            {/* Three-dot overflow menu */}
            <div className="flex flex-col items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 flex items-center justify-center cursor-pointer relative z-10"
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      minWidth: '48px',
                      minHeight: '48px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      pointerEvents: 'auto',
                      userSelect: 'none',
                      position: 'relative',
                      zIndex: 10
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical 
                      className="w-6 h-6" 
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Flag option for all users */}
                  <DropdownMenuItem onClick={handleFlagVideo} className="text-red-600">
                    <Flag className="mr-2 h-4 w-4" />
                    Flag video
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Video quality options */}
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-900 cursor-default">
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Quality
                    </div>
                    <span className="text-xs text-gray-500">{videoQuality}</span>
                  </div>
                  
                  {availableQualities.map((quality) => (
                    <DropdownMenuItem 
                      key={quality}
                      onClick={() => handleQualityChange(quality)} 
                      className="pl-8"
                    >
                      {videoQuality === quality && '✓ '}{quality}{quality === '720p' ? ' (Default)' : ''}
                    </DropdownMenuItem>
                  ))}
                  
                  {/* Edit option - only show for video owner */}
                  {(() => {
                    // Check if current user owns this video
                    return currentUser && currentVideo.userId === currentUser.id;
                  })() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleEditVideo}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit video
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Bottom Content Overlay - Unified gradient */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto">
            {/* Video Info Section */}
            <div className="px-4 pt-8 pb-4">
              <div className="max-w-sm">
                {/* Video Title */}
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                  {currentVideo.title}
                </h3>

                {/* Video Description */}
                {(currentVideo as any).description && (
                  <p className="text-gray-200 text-sm mb-3 line-clamp-2">
                    {(currentVideo as any).description}
                  </p>
                )}

                {/* Event Date/Time Information - Only for events category */}
                {currentVideo.category === 'events' && (currentVideo.eventStartDate || currentVideo.eventStartTime) && (
                  <div className="inline-block bg-blue-500/20 backdrop-blur-sm rounded-lg p-3 mb-3 border border-blue-400/30 max-w-fit">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-blue-200 text-xs font-medium uppercase tracking-wide">Event Schedule</span>
                    </div>
                    
                    {currentVideo.eventStartDate && currentVideo.eventStartTime && (
                      <div className="text-white text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300">Starts:</span>
                          <span className="font-medium">
                            {new Date(`${currentVideo.eventStartDate}T${currentVideo.eventStartTime}`).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })} at {new Date(`${currentVideo.eventStartDate}T${currentVideo.eventStartTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                        
                        {currentVideo.eventEndDate && currentVideo.eventEndTime && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-300">Ends:</span>
                            <span className="font-medium">
                              {new Date(`${currentVideo.eventEndDate}T${currentVideo.eventEndTime}`).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })} at {new Date(`${currentVideo.eventEndDate}T${currentVideo.eventEndTime}`).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}



                {/* Video Stats */}
                <div className="flex items-center space-x-4 text-gray-300 text-sm">
                  <span>{currentVideo.views || 0} views</span>
                  {currentVideo.category && (
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                      {currentVideo.category}
                    </span>
                  )}
                  {currentVideo.distance && (
                    <span className="text-yellow-400">
                      {formatDistance(currentVideo.distance)} away
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video Scrubber */}
            <div className="px-4 pb-3">
              <div className="flex items-center space-x-3 text-white text-sm">
                <span className="text-xs font-mono min-w-[40px]">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    onValueCommit={() => handleSeekEnd()}
                    className="cursor-pointer"
                    onPointerDown={() => handleSeekStart()}
                  />
                </div>
                <span className="text-xs font-mono min-w-[40px]">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal - Removed, now navigates to profile page directly */}
      
      {/* Other User Profile Modal */}
      {showOtherProfileModal && selectedUserId && (
        <div className="z-[80]">
          <OtherUserProfileModal
            isOpen={showOtherProfileModal}
            userId={selectedUserId}
            userLocation={userLocation || undefined}
            onPlayVideo={handlePlayVideo}
            onNavigateToMap={handleNavigateToMap}
            onClose={() => {
              setShowOtherProfileModal(false);
              setSelectedUserId(null);
            }}
          />
        </div>
      )}

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-[70]">
          <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-base">No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3">
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setShowComments(false);
                          if (comment.user?.id !== currentUser?.id) {
                            setSelectedUserId(comment.user?.id);
                            setShowOtherProfileModal(true);
                          } else {
                            window.location.href = '/profile';
                          }
                        }}
                        className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity"
                      >
                        {comment.user?.profileImageUrl ? (
                          <img 
                            src={comment.user.profileImageUrl} 
                            alt={`${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim() || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">
                            {comment.user?.firstName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setShowComments(false);
                              if (comment.user?.id !== currentUser?.id) {
                                setSelectedUserId(comment.user?.id);
                                setShowOtherProfileModal(true);
                              } else {
                                window.location.href = '/profile';
                              }
                            }}
                            className="font-medium text-gray-900 text-sm hover:text-purple-600 transition-colors"
                          >
                            {`${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim() || 'Anonymous'}
                          </button>
                          <span className="text-xs text-gray-500">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        {/* Text comment */}
                        {comment.commentType === 'text' && comment.comment && (
                          <div className="flex items-start justify-between gap-2 group">
                            {editingCommentId === comment.id ? (
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                                  <input
                                    type="text"
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    className="flex-1 bg-transparent text-gray-900 text-sm focus:outline-none"
                                    placeholder="Edit your comment..."
                                    autoFocus
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (editCommentText.trim()) {
                                          editCommentMutation.mutate({
                                            commentId: comment.id,
                                            newText: editCommentText.trim()
                                          });
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingCommentId(null);
                                        setEditCommentText('');
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (editCommentText.trim()) {
                                        editCommentMutation.mutate({
                                          commentId: comment.id,
                                          newText: editCommentText.trim()
                                        });
                                      }
                                    }}
                                    disabled={editCommentMutation.isPending || !editCommentText.trim()}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentText('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="inline-block max-w-full flex-1">
                                  <p className="text-gray-800 text-sm break-words">{comment.comment}</p>
                                </div>
                                {comment.userId === currentUser?.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditCommentText(comment.comment);
                                        }}
                                      >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Video comment */}
                        {comment.commentType === 'video' && (
                          <div className="inline-block max-w-full">
                            {/* Processing Status Cards - Match thread message style */}
                            {['processing', 'uploaded', 'pending', 'failed', 'rejected_by_moderation', 'rejected_by_ai', 'rejected', 'flagged', 'under_appeal'].includes(comment.processingStatus) && comment.userId === currentUser?.id && (
                              <div className="w-48">
                                <button
                                  onClick={() => {
                                    // Open modal for rejected content, flagged content, or technical failures
                                    if (comment.processingStatus === 'rejected_by_moderation' || 
                                        comment.processingStatus === 'rejected_by_ai' || 
                                        comment.processingStatus === 'rejected' || 
                                        comment.processingStatus === 'flagged' ||
                                        comment.processingStatus === 'failed') {
                                      setSelectedRejectedComment(comment);
                                      setShowCommentRejectionModal(true);
                                    }
                                  }}
                                  className={`w-full rounded-lg ${
                                    comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged'
                                      ? 'bg-red-100 border border-red-200 hover:bg-red-50'
                                      : comment.processingStatus === 'failed'
                                      ? 'bg-red-100 border border-red-200 hover:bg-red-50'
                                      : comment.processingStatus === 'under_appeal'
                                      ? 'bg-blue-100 border border-blue-200 hover:bg-blue-50'
                                      : 'bg-orange-100 border border-orange-200 hover:bg-orange-50'
                                  } p-3 text-left transition-colors`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Video Comment</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged'
                                        ? 'bg-red-200 text-red-800'
                                        : comment.processingStatus === 'failed'
                                        ? 'bg-red-200 text-red-800'
                                        : comment.processingStatus === 'under_appeal'
                                        ? 'bg-blue-200 text-blue-800'
                                        : 'bg-orange-200 text-orange-800'
                                    }`}>
                                      {comment.processingStatus === 'processing' ? 'Processing...' :
                                       comment.processingStatus === 'uploaded' ? 'Uploaded' :
                                       comment.processingStatus === 'pending' ? 'Pending Review' :
                                       comment.processingStatus === 'failed' ? 'Failed' :
                                       comment.processingStatus === 'rejected_by_moderation' ? 'Rejected' :
                                       comment.processingStatus === 'rejected_by_ai' ? 'AI Rejected' :
                                       comment.processingStatus === 'rejected' ? 'Rejected' :
                                       comment.processingStatus === 'flagged' ? 'Flagged' :
                                       comment.processingStatus === 'under_appeal' ? 'Under Appeal' :
                                       comment.processingStatus}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {comment.processingStatus === 'processing' ? 'Your video comment is being processed...' :
                                     comment.processingStatus === 'uploaded' ? 'Video comment uploaded successfully' :
                                     comment.processingStatus === 'pending' ? 'Video comment is pending review' :
                                     comment.processingStatus === 'failed' ? 'Video comment processing failed. Tap to retry.' :
                                     comment.processingStatus === 'rejected_by_moderation' ? 'Video comment was rejected. Tap to appeal.' :
                                     comment.processingStatus === 'rejected_by_ai' ? 'Video comment was rejected by AI. Tap to appeal.' :
                                     comment.processingStatus === 'rejected' ? 'Video comment was rejected. Tap to appeal.' :
                                     comment.processingStatus === 'flagged' ? 'Video comment was flagged. Tap to appeal.' :
                                     comment.processingStatus === 'under_appeal' ? 'Your appeal is being reviewed' :
                                     'Video comment status unknown'}
                                  </div>
                                </button>
                              </div>
                            )}
                            
                            {/* Approved video comment - show thumbnail and play button */}
                            {comment.commentVideoUrl && !['processing', 'uploaded', 'pending', 'failed', 'rejected_by_moderation', 'rejected_by_ai', 'rejected', 'flagged', 'under_appeal'].includes(comment.processingStatus) && (
                              <div className="w-48 relative">
                                <button 
                                  onClick={() => {
                                    console.log('🎬 VIDEO FEED COMMENT CLICK: Opening comment in fullscreen:', comment.id);
                                    
                                    // Directly pause and mute the main video element
                                    if (videoRef.current) {
                                      console.log('🎬 VIDEO FEED COMMENT CLICK: Video ref found, current state:', {
                                        paused: videoRef.current.paused,
                                        muted: videoRef.current.muted,
                                        currentTime: videoRef.current.currentTime
                                      });
                                      
                                      videoRef.current.pause();
                                      videoRef.current.muted = true;
                                      
                                      // Double-check the pause worked
                                      setTimeout(() => {
                                        if (videoRef.current) {
                                          console.log('🎬 VIDEO FEED COMMENT CLICK: After pause attempt:', {
                                            paused: videoRef.current.paused,
                                            muted: videoRef.current.muted
                                          });
                                        }
                                      }, 100);
                                      
                                      console.log('🎬 VIDEO FEED COMMENT CLICK: Main video paused and muted directly');
                                    } else {
                                      console.log('🎬 VIDEO FEED COMMENT CLICK: No video ref found!');
                                    }
                                    setSelectedFullscreenComment(comment);
                                    setShowCommentFullscreenModal(true);
                                    setIsPlaying(false);
                                  }}
                                  className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative group"
                                >
                                  {comment.bunnyVideoId && (
                                    <img 
                                      src={`https://vz-7c674c55-8ff.b-cdn.net/${comment.bunnyVideoId}/thumbnail.jpg`}
                                      alt="Video comment thumbnail"
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <div className="bg-white/90 rounded-full p-2">
                                      <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                                    {comment.duration || '0:00'}
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className="border-t border-gray-100 bg-white p-4">
              <div className="flex space-x-3 items-end">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setShowComments(false);
                    window.location.href = '/profile';
                  }}
                  className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity"
                >
                  {currentUser?.profileImageUrl ? (
                    <img 
                      src={currentUser.profileImageUrl} 
                      alt={currentUser.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </button>
                <div className="flex-1 relative">
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 text-sm focus:outline-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitComment();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVideoCommentRecorder(true)}
                      className="text-gray-400 hover:text-gray-600 p-1 h-auto"
                    >
                      <Camera className="w-5 h-5" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-gray-600 p-1 h-auto"
                        >
                          <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" side="top">
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {/* Smileys & Emotions */}
                          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                              onClick={() => setNewComment(prev => prev + emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                          {/* Hearts & Symbols */}
                          {['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="p-1 hover:bg-gray-100 rounded text-lg"
                              onClick={() => setNewComment(prev => prev + emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isCommenting}
                  className="rounded-full bg-red-400 hover:bg-red-500 text-white p-3 h-auto"
                  size="sm"
                >
                  {isCommenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{errorTitle}</DialogTitle>
              <DialogDescription>
                {errorMessage}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Modal */}
      {showEditModal && currentVideo && (
        <VideoEditForm
          videoId={currentVideo.id}
          currentTitle={currentVideo.title || ""}
          currentDescription={""}
          currentCategory={currentVideo.category || ""}
          onSuccess={() => {
            setShowEditModal(false);
            // Refresh the video data
            queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      {/* Profile Modal - Removed, now navigates to profile page directly */}

      {/* Other User Profile Modal */}
      {showOtherProfileModal && selectedUserId && (
        <OtherUserProfileModal
          isOpen={showOtherProfileModal}
          userId={selectedUserId}
          onClose={() => {
            setShowOtherProfileModal(false);
            setSelectedUserId(null);
          }}
        />
      )}

      {/* Video Comment Recorder */}
      <VideoCommentRecorder
        isOpen={showVideoCommentRecorder}
        onClose={() => setShowVideoCommentRecorder(false)}
        videoId={currentVideo?.id || ''}
        onCommentSubmitted={() => {
          // Refresh comments when a new video comment is submitted
          console.log('Video comment submitted, refreshing comments...');
          loadComments();
        }}
        onMainVideoControl={(action) => {
          // Handle main video control actions
          if (action === 'pause') {
            setIsPlaying(false);
          } else if (action === 'resume') {
            // Only resume if user hasn't manually paused
            if (!userHasPausedVideo) {
              setIsPlaying(true);
            }
          }
        }}
      />

      {/* Video Comment Rejection Modal */}
      <VideoRejectionModal
        isOpen={showCommentRejectionModal}
        onClose={() => {
          setShowCommentRejectionModal(false);
          setSelectedRejectedComment(null);
        }}
        comment={selectedRejectedComment}
        isComment={true}
        videoId={currentVideo?.id}
      />

      {/* Video Comment Fullscreen Modal */}
      {showCommentFullscreenModal && selectedFullscreenComment && (
        <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowCommentFullscreenModal(false);
              setSelectedFullscreenComment(null);
              
              // Restore main video playback when closing comment modal
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play().catch(console.error);
                console.log('🎬 VIDEO FEED COMMENT MODAL CLOSE: Main video unmuted and resumed');
              }
              
              setIsPlaying(true);
            }}
            className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
            aria-label="Close fullscreen"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Fullscreen Video Player */}
          <div 
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const videoElement = document.querySelector('.fullscreen-comment-video video') as HTMLVideoElement;
                if (videoElement) {
                  if (videoElement.paused) {
                    videoElement.play();
                  } else {
                    videoElement.pause();
                  }
                }
              }
            }}
          >
            <div className="fullscreen-comment-video">
              <VideoCommentPlayer 
                key={`${selectedFullscreenComment.id}-${commentVideoQuality}`}
                videoUrl={`${selectedFullscreenComment.commentVideoUrl}/${commentVideoQuality}/video.m3u8`}
                duration={selectedFullscreenComment.duration}
                thumbnailUrl={selectedFullscreenComment.thumbnailUrl}
                commentData={selectedFullscreenComment}
                isFullscreen={true}
                showCustomControls={true}
                onTimeUpdate={(currentTime, duration, isPlaying) => {
                  // When comment video starts playing, pause the main video
                  if (isPlaying && videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    videoRef.current.muted = true;
                    console.log('🎬 VIDEO FEED COMMENT VIDEO PLAYING: Main video paused due to comment video playback');
                  }
                  // Update video state
                  setCommentVideoCurrentTime(currentTime);
                  setCommentVideoDuration(duration);
                  setIsCommentVideoPlaying(isPlaying);
                }}
                onFullscreen={() => {
                  // Already in fullscreen, ignore
                }}
              />
            </div>

            {/* Profile Info Overlay - Top Left */}
            <div 
              className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-xs cursor-pointer hover:bg-black/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFullscreenComment.user?.id) {
                  // Store the current video comment context before navigating
                  const currentContext = {
                    videoId: currentVideo?.id,
                    commentId: selectedFullscreenComment.id,
                    showCommentModal: true,
                    videoIndex: currentVideoIndex
                  };
                  sessionStorage.setItem('videoCommentContext', JSON.stringify(currentContext));
                  
                  // Navigate to profile
                  if (selectedFullscreenComment.user.id === currentUser?.id) {
                    setLocation('/profile');
                  } else {
                    setLocation(`/profile/${selectedFullscreenComment.user.id}`);
                  }
                }
              }}
            >
              <div className="flex items-center space-x-3">
                {selectedFullscreenComment.user?.profileImageUrl ? (
                  <img 
                    src={selectedFullscreenComment.user.profileImageUrl} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                    {selectedFullscreenComment.user?.firstName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate hover:underline">
                    {`${selectedFullscreenComment.user?.firstName || ''} ${selectedFullscreenComment.user?.lastName || ''}`.trim() || 'Anonymous'}
                  </p>
                  <p className="text-gray-300 text-xs">
                    {new Date(selectedFullscreenComment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedFullscreenComment.comment && (
                <p className="text-gray-200 text-xs mt-2 line-clamp-2">
                  {selectedFullscreenComment.comment}
                </p>
              )}
            </div>

            {/* Video Controls/Scrubber - Bottom */}
            <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center space-x-3 text-white">
                {/* Current Time */}
                <span className="text-xs font-mono min-w-[35px]">
                  {Math.floor(commentVideoCurrentTime / 60)}:{String(Math.floor(commentVideoCurrentTime % 60)).padStart(2, '0')}
                </span>
                
                {/* Progress Bar */}
                <div className="flex-1 h-1 bg-gray-600 rounded-full cursor-pointer relative">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-150"
                    style={{ width: `${commentVideoDuration > 0 ? (commentVideoCurrentTime / commentVideoDuration) * 100 : 0}%` }}
                  />
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-150"
                    style={{ left: `${commentVideoDuration > 0 ? (commentVideoCurrentTime / commentVideoDuration) * 100 : 0}%`, marginLeft: '-6px' }}
                  />
                </div>
                
                {/* Total Duration */}
                <span className="text-xs font-mono min-w-[35px]">
                  {Math.floor(commentVideoDuration / 60)}:{String(Math.floor(commentVideoDuration % 60)).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Three-dot overflow menu positioned on the screen - Bottom Right */}
            <div className="fixed bottom-20 right-6 z-[9999]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer shadow-lg border border-white/20 relative"
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      minWidth: '48px',
                      minHeight: '48px',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      pointerEvents: 'auto',
                      userSelect: 'none',
                      position: 'relative',
                      zIndex: 9999
                    }}
                    onClick={(e) => {
                      console.log('Comment video three-dot button clicked!', e);
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical 
                      className="w-6 h-6" 
                      style={{ pointerEvents: 'none' }}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[10000]">
                  {/* Flag option - only show for videos not owned by current user */}
                  {currentUser && selectedFullscreenComment.user?.id !== currentUser.id && (
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <FlagButton
                          contentType="video_comment"
                          contentId={selectedFullscreenComment?.id?.toString() || ''}
                          contentTitle={selectedFullscreenComment?.comment || 'Video Comment'}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-auto"
                        />
                      </div>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Only show separator if flag option is visible */}
                  {currentUser && selectedFullscreenComment.user?.id !== currentUser.id && (
                    <DropdownMenuSeparator />
                  )}
                  
                  {/* Video quality options */}
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm font-medium text-gray-900 cursor-default">
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Quality
                    </div>
                    <span className="text-xs text-gray-500">{commentVideoQuality}</span>
                  </div>
                  
                  {commentAvailableQualities.map((quality) => (
                    <DropdownMenuItem 
                      key={quality}
                      onClick={() => {
                        if (commentAvailableQualities.includes(quality)) {
                          setCommentVideoQuality(quality);
                        }
                      }} 
                      className="pl-8"
                    >
                      {commentVideoQuality === quality && '✓ '}{quality}{quality === '720p' ? ' (Default)' : ''}
                    </DropdownMenuItem>
                  ))}
                  
                  {/* Delete option - only show for comment owner */}
                  {currentUser && selectedFullscreenComment.user?.id === currentUser.id && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          console.log('Delete comment video:', selectedFullscreenComment.id);
                          // Close fullscreen comment first
                          setSelectedFullscreenComment(null);
                          // Then delete the comment directly
                          deleteCommentMutation.mutate(selectedFullscreenComment.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete comment
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}