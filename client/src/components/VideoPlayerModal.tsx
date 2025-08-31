import { useState, useRef, useEffect, useMemo } from "react";
import { X, Heart, MessageCircle, Share, Bookmark, Smile, Send, MoreVertical, Flag, Settings, Edit3, Trash2, Camera, AlertTriangle, Loader2, Play, Maximize, Video, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Slider } from "@/components/ui/slider.tsx";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast.ts";

import OtherUserProfileModal from "./OtherUserProfileModal.tsx";
import VideoEditForm from "./VideoEditForm.tsx";
import VideoCommentRecorder from "./VideoCommentRecorder.tsx";
import VideoRejectionModal from "./VideoRejectionModal.tsx";
import FlagButton from "./FlagButton.tsx";
import HLSVideoPlayer from "./HLSVideoPlayer.tsx";
import Hls from 'hls.js';
import { formatDistance } from "@/lib/distanceUtils.ts";
import type { DBUserRow } from '@shared/schema.ts';
import  { useAuth } from "@/hooks/useAuth";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format.ts";



// Video Scrubber Component for fullscreen video comments
function VideoScrubber({ comment, onTimeUpdate }: { comment: any; onTimeUpdate: (currentTime: number, duration: number) => void }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get video element and track time
  useEffect(() => {
    const videoElement = document.querySelector('.fullscreen-video video') as HTMLVideoElement;
    if (!videoElement) return;

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(videoElement.currentTime);
        setDuration(videoElement.duration || 0);
        onTimeUpdate(videoElement.currentTime, videoElement.duration || 0);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration || 0);
      
      // Also try to get duration from comment props if video duration is not available
      if ((!videoElement.duration || videoElement.duration === 0) && comment?.duration) {
        const commentDuration = parseFloat(comment.duration);
        if (!isNaN(commentDuration) && commentDuration > 0) {
          setDuration(commentDuration);
        }
      }
    };

    videoElement.addEventListener('timeupdate', updateTime);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Initial duration setup
    if (videoElement.duration) {
      setDuration(videoElement.duration);
    } else if (comment?.duration) {
      const commentDuration = parseFloat(comment.duration);
      if (!isNaN(commentDuration) && commentDuration > 0) {
        setDuration(commentDuration);
      }
    }

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [comment, isDragging, onTimeUpdate]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const videoElement = document.querySelector('.fullscreen-video video') as HTMLVideoElement;
    if (!videoElement || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    
    videoElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-3 text-white">
      {/* Current Time */}
      <span className="text-xs font-mono min-w-[35px]">
        {formatTime(currentTime)}
      </span>
      
      {/* Progress Bar */}
      <div 
        className="flex-1 h-1 bg-gray-600 rounded-full cursor-pointer relative"
        onClick={handleSeek}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div 
          className="h-full bg-white rounded-full transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-150"
          style={{ left: `${progress}%`, marginLeft: '-6px' }}
        />
      </div>
      
      {/* Total Duration */}
      <span className="text-xs font-mono min-w-[35px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}

// VideoCommentPlayer component for handling HLS video comments
function VideoCommentPlayer({ videoUrl, duration, thumbnailUrl, onFullscreen, isFullscreen = false, commentData, onDelete, onTimeUpdate }: { 
  videoUrl: string; 
  duration: number; 
  thumbnailUrl?: string;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  commentData?: any;
  showCustomControls?: boolean;
  onDelete?: (commentId: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number, isPlaying: boolean) => void;
}) {
  // Removed excessive debug logging
  
  const { toast } = useToast();
  const videoPlayerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoQuality, setVideoQuality] = useState('720p');
  const [availableQualities, setAvailableQualities] = useState(['240p', '360p', '480p', '720p']);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check available qualities when component mounts
  useEffect(() => {
    if (videoUrl && isFullscreen) {
      checkAvailableQualities();
    }
  }, [videoUrl, isFullscreen]);

  // Auto-retry mechanism for newly uploaded videos
  useEffect(() => {
    if (hasError && retryCount < 5 && !isRetrying) {
      const isRecentVideo = commentData?.createdAt && 
        (new Date().getTime() - new Date(commentData.createdAt).getTime() < 300000); // 5 minutes
      
      if (isRecentVideo) {
        setIsRetrying(true);
        const retryDelay = Math.min(5000 + (retryCount * 2000), 15000); // 5s, 7s, 9s, 11s, 13s
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`Retrying video load (attempt ${retryCount + 1}/5):`, videoUrl);
          setHasError(false);
          setIsLoading(true);
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
          
          // Force reload the video
          if (videoPlayerRef.current) {
            videoPlayerRef.current.loadSource(videoUrl);
          }
        }, retryDelay);
      }
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [hasError, retryCount, isRetrying, videoUrl, commentData?.createdAt]);

  const checkAvailableQualities = async () => {
    try {
      // Get the base URL without quality path
      const baseUrl = videoUrl.replace(/\/(240p|360p|480p|720p|1080p)\/video\.m3u8$/, '');
      
      // Fetch the master playlist to see what qualities are available
      const response = await fetch(baseUrl);
      if (!response.ok) return;
      
      const playlist = await response.text();
      const available = [];
      
      // Parse the master playlist for available quality streams
      const lines = playlist.split('\n');
      for (const line of lines) {
        if (line.includes('/video.m3u8')) {
          const match = line.match(/(\d+p)\/video\.m3u8/);
          if (match) {
            available.push(match[1]);
          }
        }
      }
      
      if (available.length > 0) {
        // Sort qualities by resolution (lowest to highest)
        const sortOrder = ['240p', '360p', '480p', '720p', '1080p'];
        const sortedQualities = available.sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));
        
        setAvailableQualities(sortedQualities);
        // Set to highest available quality if current quality not available
        if (!sortedQualities.includes(videoQuality)) {
          setVideoQuality(sortedQualities[sortedQualities.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error detecting qualities:', error);
      // Fallback to default quality
      setAvailableQualities(['720p']);
      setVideoQuality('720p');
    }
  };

  const handleQualityChange = async (quality: string) => {
    setVideoQuality(quality);
    if (videoPlayerRef.current && isFullscreen) {
      const newUrl = videoUrl.replace(/\/\d+p\//, `/${quality}/`);
      try {
        const currentTime = videoPlayerRef.current.getVideoElement()?.currentTime || 0;
        await videoPlayerRef.current.loadSource(newUrl);
        if (currentTime > 0) {
          videoPlayerRef.current.getVideoElement().currentTime = currentTime;
        }
      } catch (error) {
        console.error('Error changing quality:', error);
      }
    }
  };

  const handleDeleteComment = async () => {
    if (!commentData?.id || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(commentData.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCanPlay = () => {
    console.log('Video comment loaded successfully:', videoUrl);
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    console.error('Video comment failed to load:', {
      url: videoUrl,
      error: error
    });
    setHasError(true);
    setIsLoading(false);
  };

  const handlePlay = async () => {
    console.log('🎬 VideoCommentPlayer handlePlay called:', { 
      hasOnFullscreen: !!onFullscreen, 
      isFullscreen, 
      videoUrl,
      onFullscreenType: typeof onFullscreen
    });
    
    if (onFullscreen && !isFullscreen) {
      console.log('🎬 VideoCommentPlayer: Triggering onFullscreen callback NOW!');
      console.log('🎬 VideoCommentPlayer: About to call onFullscreen function');
      onFullscreen();
      console.log('🎬 VideoCommentPlayer: onFullscreen function called successfully');
      return;
    } 
    
    if (videoPlayerRef.current && isFullscreen) {
      console.log('🎬 VideoCommentPlayer: In fullscreen mode, controlling playback');
      try {
        if (isVideoPlaying) {
          console.log('🎬 VideoCommentPlayer: Pausing video in fullscreen');
          videoPlayerRef.current.pause();
          setIsVideoPlaying(false);
        } else {
          console.log('🎬 VideoCommentPlayer: Playing video in fullscreen');
          await videoPlayerRef.current.play();
          setIsVideoPlaying(true);
        }
      } catch (error) {
        console.error('🎬 VideoCommentPlayer: Error controlling video playback:', error);
      }
    } else {
      console.log('🎬 VideoCommentPlayer: No action taken - missing requirements', {
        hasVideoRef: !!videoPlayerRef.current,
        isFullscreen,
        hasOnFullscreen: !!onFullscreen
      });
    }
  };

  const handlePlaying = () => {
    setShowPlayButton(false);
    setIsVideoPlaying(true);
    // Notify parent of playback state change
    if (onTimeUpdate && videoPlayerRef.current) {
      const videoElement = videoPlayerRef.current.getVideoElement();
      if (videoElement) {
        onTimeUpdate(videoElement.currentTime, videoElement.duration, true);
      }
    }
  };

  const handlePause = () => {
    setShowPlayButton(true);
    setIsVideoPlaying(false);
    // Notify parent of playback state change
    if (onTimeUpdate && videoPlayerRef.current) {
      const videoElement = videoPlayerRef.current.getVideoElement();
      if (videoElement) {
        onTimeUpdate(videoElement.currentTime, videoElement.duration, false);
      }
    }
  };

  const handleEnded = () => {
    if (isFullscreen && videoPlayerRef.current) {
      // Loop the video by restarting it
      const videoElement = videoPlayerRef.current.getVideoElement();
      if (videoElement) {
        videoElement.currentTime = 0;
        videoElement.play();
      }
    }
  };

  if (hasError && !isRetrying) {
    const isRecentVideo = commentData?.createdAt && 
      (new Date().getTime() - new Date(commentData.createdAt).getTime() < 300000);
    
    return (
      <div className={`relative bg-gray-200 overflow-hidden flex items-center justify-center ${
        isFullscreen 
          ? 'w-full h-full' 
          : 'w-48 h-32 rounded-lg'
      }`}>
        <div className="text-center text-gray-500 text-sm">
          <AlertTriangle className="w-6 h-6 mx-auto mb-1" />
          {isRecentVideo && retryCount < 5 ? (
            <div>
              <p>Video encoding...</p>
              <p className="text-xs mt-1">Retrying in a moment</p>
            </div>
          ) : (
            <p>Video unavailable</p>
          )}
        </div>
      </div>
    );
  }

  if (isRetrying) {
    return (
      <div className={`relative bg-gray-100 overflow-hidden flex items-center justify-center ${
        isFullscreen 
          ? 'w-full h-full' 
          : 'w-48 h-32 rounded-lg'
      }`}>
        <div className="text-center text-gray-600 text-sm">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p>Checking video availability...</p>
          <p className="text-xs mt-1">Attempt {retryCount + 1} of 5</p>
        </div>
      </div>
    );
  }

  // Removed excessive debug logging

  return (
    <div 
      className={`relative bg-black overflow-hidden cursor-pointer group ${
        isFullscreen 
          ? 'w-full h-full' 
          : 'w-48 h-32 rounded-lg'
      }`}
      onClick={(e) => {
        console.log('🎬 VideoCommentPlayer: Container clicked!', { target: e.target, currentTarget: e.currentTarget });
        handlePlay();
      }}
    >
      <HLSVideoPlayer
        ref={videoPlayerRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="w-full h-full object-contain bg-black"
        muted={!isFullscreen}
        autoPlay={isFullscreen}
        controls={false}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={() => {
          // Continuously update parent with time progress
          if (onTimeUpdate && videoPlayerRef.current) {
            const videoElement = videoPlayerRef.current.getVideoElement();
            if (videoElement) {
              onTimeUpdate(videoElement.currentTime, videoElement.duration, !videoElement.paused);
            }
          }
        }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}
      
      {/* Play button overlay */}
      {showPlayButton && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-colors">
            <Play className="w-6 h-6 text-black fill-current" />
          </div>
        </div>
      )}



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

interface VideoPlayerModalProps {
  videos: any[];
  initialIndex: number;
  onClose: () => void;
  onNavigateToMap?: (video: any) => void;
  onNavigateToProfile?: () => void;
}

export default function VideoPlayerModal({ videos, initialIndex, onClose, onNavigateToMap, onNavigateToProfile }: VideoPlayerModalProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch enhanced user profile with database data for proper profile image hierarchy
  const { data: enhancedProfile } = useQuery({
    queryKey: ["/api/users/me/profile"],
    queryFn: async () => {
      const response = await fetch(`/api/users/me/profile?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch enhanced profile');
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
    retry: 2,
    staleTime: 0,
  });
  const [isPlaying, setIsPlaying] = useState(true);
  // Profile modal removed - now navigates to profile page directly
  const [showOtherProfileModal, setShowOtherProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Use only the selected video for single video display
  const video = videos[initialIndex];

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  
  // Edit comment state
  const [editingComment, setEditingComment] = useState<any>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  
  // Video edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Check for stored video comment context on component mount
  useEffect(() => {
    const storedContext = sessionStorage.getItem('videoCommentContext');
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext);
        if (context.videoId === video?.id && context.showCommentModal) {
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
  }, [comments, video?.id]);
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVideoCommentRecorder, setShowVideoCommentRecorder] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoQuality, setVideoQuality] = useState('720p'); // Default to 720p
  const [hasMarkedAsWatched, setHasMarkedAsWatched] = useState(false); // Prevent multiple watch events
  const [videoEventTriggered, setVideoEventTriggered] = useState(false); // Prevent race conditions
  const [lastUserAction, setLastUserAction] = useState<number>(0); // Track user-initiated actions
  const [availableQualities, setAvailableQualities] = useState(['240p', '360p', '720p', '1080p']); // Default available qualities
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [showFlagSuccessModal, setShowFlagSuccessModal] = useState(false);
  const [showCommentRejectionModal, setShowCommentRejectionModal] = useState(false);
  const [selectedRejectedComment, setSelectedRejectedComment] = useState<any>(null);
  const [showCommentFullscreenModal, setShowCommentFullscreenModal] = useState(false);
  const [selectedFullscreenComment, setSelectedFullscreenComment] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const currentBlobUrl = useRef<string | null>(null);

  // Handle video playback from profile
  const handlePlayVideo = (videoToPlay: any) => {
    // Find the video in the current videos array or create a new array with just this video
    const videoIndex = videos.findIndex(v => v.id === videoToPlay.id);
    if (videoIndex !== -1) {
      // If video exists in current array, switch to it
      // For now, just log - in a full implementation this would update the current video
      console.log("Switching to video:", videoToPlay);
    } else {
      // Video not in current array, close this player and open new one
      onClose();
      // In a full implementation, this would trigger opening a new video player with this video
      console.log("Opening new video player for:", videoToPlay);
    }
  };

  // Handle navigation to map
  const handleNavigateToMap = (video: any) => {
    console.log('Navigate to map for video:', video);
    if (onNavigateToMap) {
      onNavigateToMap(video);
    }
  };

  // Check available video qualities
  const checkAvailableQualities = async () => {
    const bunnyVideoId = video?.videoUrl?.split('/bunny-proxy/')[1]?.split('/')[0];
    if (!bunnyVideoId) return;

    const qualitiesToCheck = ['360p', '480p', '720p', '1080p'];
    const available = [];

    for (const quality of qualitiesToCheck) {
      try {
        const response = await fetch(`/api/videos/bunny-proxy/${bunnyVideoId}/${quality}/video.m3u8`);
        if (response.ok) {
          available.push(quality);
        }
      } catch (error) {
        console.log(`Quality ${quality} not available for this video`);
      }
    }

    if (available.length > 0) {
      setAvailableQualities(available);
    }
  };

  // Cleanup function for HLS and blob URLs
  const cleanupVideo = () => {
    // Destroy HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Revoke blob URL
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
    
    // Clear video element completely
    if (videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.src = '';
      
      // Remove all event listeners
      videoElement.onloadstart = null;
      videoElement.oncanplay = null;
      videoElement.onerror = null;
      
      // Force garbage collection of any internal blob URLs
      videoElement.load();
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupVideo();
    };
  }, []);

  // Initialize like state, load comments, and mark video as watched when modal opens
  useEffect(() => {
    if (video?.id && !hasMarkedAsWatched) {
      // Skip API calls for video comments since they don't have the same endpoints
      if (!(video as any).isVideoComment) {
        markVideoAsWatched(video.id);
        checkLikeStatus(video.id);
      }
      setHasMarkedAsWatched(true);
      setLikeCount(video.likes || 0);
      
      // Check available video qualities
      checkAvailableQualities();
    }
  }, [video?.id, hasMarkedAsWatched]);

  // Load comments using React Query with smart polling for real-time updates
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['/api/videos', video?.id, 'comments'],
    queryFn: async () => {
      if (!video?.id) return [];
      const response = await fetch(`/api/videos/${video.id}/comments?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      // Comments loaded (logging removed to prevent spam)
      return data;
    },
    enabled: !!video?.id && !(video as any).isVideoComment, // Disable for video comments
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes to allow proper invalidation
    refetchInterval: (data) => {
      // Smart polling: only poll if there are processing comments
      if (!data || !Array.isArray(data)) {
        return 2000; // Poll initially until data is available
      }
      
      const hasProcessingComments = data.some((comment: any) => 
        comment.processingStatus === 'processing' || 
        comment.processingStatus === 'uploaded' ||
        comment.processingStatus === 'pending'
      );
      
      console.log('🔄 POLLING CHECK: Comments with processing status:', 
        data.filter(c => ['processing', 'uploaded', 'pending'].includes(c.processingStatus)).map(c => ({ id: c.id, status: c.processingStatus }))
      );
      console.log('🔄 POLLING DECISION: Will continue polling?', hasProcessingComments);
      
      return hasProcessingComments ? 2000 : false; // Poll every 2 seconds if processing, otherwise stop
    },
    refetchIntervalInBackground: true // Continue polling when tab is not active
  });

  // Update comments state when data changes (but not during edit operations)
  useEffect(() => {
    if (commentsData && !showEditCommentModal) {
      console.log('🔄 SYNC: Updating local comments from React Query data');
      setComments(commentsData);
    }
  }, [commentsData, showEditCommentModal]);

  // Auto-scroll to highlighted comment and automatically play video comment if specified
  useEffect(() => {
    console.log('Auto-scroll effect triggered:', {
      highlightCommentId: (video as any)?.highlightCommentId,
      commentsDataLength: commentsData?.length,
      videoId: video?.id,
      showComments
    });

    if ((video as any)?.highlightCommentId && commentsData?.length) {
      console.log('Starting auto-scroll to comment:', (video as any).highlightCommentId);
      
      // First, open the comments section if it's not already open
      if (!showComments) {
        console.log('Opening comments section for auto-scroll');
        setShowComments(true);
      }
      
      // Wait for comments section to open and render
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${(video as any).highlightCommentId}`);
        console.log('Found comment element:', !!commentElement);
        
        if (commentElement) {
          // First scroll to the comment
          commentElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Add a temporary highlight effect
          commentElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
          setTimeout(() => {
            commentElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
          }, 3000);

          // Find the specific video comment and automatically open it in fullscreen
          const targetComment = commentsData.find((comment: any) => comment.id === (video as any).highlightCommentId);
          console.log('Found target comment:', !!targetComment, targetComment?.commentVideoUrl);
          
          if (targetComment && targetComment.commentVideoUrl) {
            console.log('Auto-playing highlighted video comment:', targetComment);
            // Wait a bit for the scroll animation to complete, then open the video comment
            setTimeout(() => {
              // Directly pause and mute the main video element
              if (videoRef.current) {
                console.log('🎬 AUTO-HIGHLIGHT: Video ref found, current state:', {
                  paused: videoRef.current.paused,
                  muted: videoRef.current.muted,
                  currentTime: videoRef.current.currentTime
                });
                
                videoRef.current.pause();
                videoRef.current.muted = true;
                
                // Double-check the pause worked
                setTimeout(() => {
                  if (videoRef.current) {
                    console.log('🎬 AUTO-HIGHLIGHT: After pause attempt:', {
                      paused: videoRef.current.paused,
                      muted: videoRef.current.muted
                    });
                  }
                }, 100);
                
                console.log('🎬 AUTO-HIGHLIGHT: Main video paused and muted directly');
              } else {
                console.log('🎬 AUTO-HIGHLIGHT: No video ref found!');
              }
              
              setSelectedFullscreenComment(targetComment);
              setShowCommentFullscreenModal(true);
              setIsPlaying(false); // Pause the main video
            }, 1500); // Wait for scroll to complete
          }
        }
      }, showComments ? 500 : 1500); // Shorter delay if comments already open, longer if opening
    }
  }, [(video as any)?.highlightCommentId, commentsData, showComments]);

  // Check if user has liked the video
  const checkLikeStatus = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/like-status`);
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied or unavailable");
        }
      );
    }
  }, []);

  // Initialize video player with HLS support
  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo || !video) return;

    // Determine video URL - use Bunny.net proxy for Bunny videos, otherwise use stream endpoint
    const isBunnyVideo = video.bunnyVideoId || video.videoUrl?.includes('bunny-proxy');
    const videoUrl = isBunnyVideo ? video.videoUrl : `/api/videos/${video.id}/stream`;
    
    // Check if it's an HLS stream
    const isHLS = videoUrl?.includes('.m3u8') || videoUrl?.includes('bunny-proxy') || video.bunnyVideoId;
    
    console.log('Video format detection:', {
      videoUrl,
      videoDbUrl: video.videoUrl,
      bunnyVideoId: video.bunnyVideoId,
      isHLS,
      hlsSupported: Hls.isSupported(),
      videoTitle: video.title,
      videoId: video.id
    });
    
    if (isHLS && Hls.isSupported()) {
      console.log('Initializing HLS player for non-Bunny stream');
      
      // Clean up existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      
      // Clear any existing src to prevent conflicts
      currentVideo.removeAttribute('src');
      currentVideo.load(); // Reset the video element
      
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        debug: false,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        startLevel: -1 // Auto quality selection - starts with best available quality
      });
      
      hlsRef.current = hls;
      
      hls.loadSource(videoUrl);
      hls.attachMedia(currentVideo);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest loaded successfully');
        
        // Set quality to match UI selection (720p by default)
        const levels = hls.levels;
        console.log('Available HLS levels:', levels.map(l => `${l.height}p`));
        
        // Find the level that matches our desired quality (720p)
        const targetHeight = parseInt(videoQuality.replace('p', ''));
        const targetLevelIndex = levels.findIndex(level => level.height === targetHeight);
        
        if (targetLevelIndex !== -1) {
          console.log(`Setting HLS quality to ${videoQuality} (level ${targetLevelIndex})`);
          hls.currentLevel = targetLevelIndex;
        } else {
          console.log(`Quality ${videoQuality} not available, using auto selection`);
        }
        
        if (isPlaying) {
          currentVideo.play().catch(err => console.error('Error playing HLS video:', err));
        }
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });
      
    } else if (currentVideo.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('Using native HLS support');
      currentVideo.src = videoUrl;
    } else {
      // Regular video with enhanced error handling
      console.log('Using regular video player for:', videoUrl);
      
      // Add comprehensive error handling for codec issues
      const handleError = (error: Event) => {
        const videoElement = error.target as HTMLVideoElement;
        const mediaError = videoElement.error;
        
        console.error(`Video ${videoUrl} failed to load`, error);
        console.error('MediaError details:', {
          code: mediaError?.code,
          message: mediaError?.message,
          MEDIA_ERR_ABORTED: MediaError.MEDIA_ERR_ABORTED,
          MEDIA_ERR_NETWORK: MediaError.MEDIA_ERR_NETWORK,
          MEDIA_ERR_DECODE: MediaError.MEDIA_ERR_DECODE,
          MEDIA_ERR_SRC_NOT_SUPPORTED: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        });
      };
      
      const handleCanPlay = () => {
        console.log(`Video ${videoUrl} can play - format is supported`);
      };
      
      currentVideo.addEventListener('error', handleError, { once: true });
      currentVideo.addEventListener('canplay', handleCanPlay, { once: true });
      
      // Configure video element for better compatibility
      currentVideo.preload = 'metadata';
      currentVideo.crossOrigin = 'anonymous';
      currentVideo.src = videoUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video?.id]);

  // ⚠️ DISABLED: Video control effect was causing feedback loops - using direct DOM manipulation instead

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events when user is typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Check if video is bookmarked when component loads
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!currentUser || !video?.id) return;
      
      try {
        const response = await fetch(`/api/users/${currentUser.id}/collections`);
        if (response.ok) {
          const collections = await response.json();
          const isCurrentlyBookmarked = collections.some((v: any) => v.id === video.id);
          setIsBookmarked(isCurrentlyBookmarked);
        }
      } catch (error) {
        console.error('Error checking bookmark status:', error);
      }
    };

    checkBookmarkStatus();
  }, [currentUser, video?.id]);

  // Track video as watched
  const markVideoAsWatched = async (videoId: string) => {
    try {
      await fetch(`/api/videos/${videoId}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(`Marked video ${videoId} as watched`);
      
      // Invalidate videos cache to refresh map markers and user profiles
      queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error) {
      console.error('Error marking video as watched:', error);
    }
  };

  // Video event handlers
  const handleVideoLoad = (video: HTMLVideoElement) => {
    video.addEventListener('canplay', () => {
      console.log(`Video ${video.src} can play - format is supported`);
    });
    
    video.addEventListener('error', (e) => {
      console.log(`Video ${video.src} failed to load`, e);
    });

    // Sync isPlaying state with actual video playback
    video.addEventListener('play', () => {
      console.log('Video play event fired - setting isPlaying to true');
      setVideoEventTriggered(true);
      setIsPlaying(true);
      setTimeout(() => setVideoEventTriggered(false), 500);
    });

    video.addEventListener('pause', () => {
      console.log('Video pause event fired - setting isPlaying to false');
      setVideoEventTriggered(true);
      setIsPlaying(false);
      setTimeout(() => setVideoEventTriggered(false), 500);
    });

    // Track video progress for scrubber
    video.addEventListener('timeupdate', () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    });

    // Set duration when video metadata loads
    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
    });

    video.addEventListener('durationchange', () => {
      setDuration(video.duration);
    });
  };

  const handleVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      handleVideoLoad(el);
    }
  };

  const togglePlayPause = async () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) {
      console.error('No video ref available for play/pause');
      return;
    }

    setLastUserAction(Date.now());
    
    console.log('Toggle play/pause - current state:', { isPlaying, paused: currentVideo.paused });
    
    if (isPlaying) {
      // Pause the video
      console.log('Pausing video');
      currentVideo.pause();
      setIsPlaying(false);
    } else {
      // Play the video
      try {
        console.log('Playing video - unmuting and starting playback');
        currentVideo.muted = false;
        await currentVideo.play();
        setIsPlaying(true);
        console.log('Video play successful');
      } catch (error) {
        console.error('Error playing video:', error);
        // Try playing muted as fallback
        try {
          console.log('Retrying play with muted=true');
          currentVideo.muted = true;
          await currentVideo.play();
          setIsPlaying(true);
          console.log('Video play successful (muted)');
        } catch (mutedError) {
          console.error('Error playing video even when muted:', mutedError);
        }
      }
    }
  };

  // Handle video control for comment recorder
  const handleMainVideoControl = (action: 'pause' | 'resume') => {
    if (action === 'pause') {
      setIsPlaying(false);
    } else if (action === 'resume') {
      setIsPlaying(true);
    }
  };

  // Handle video seeking
  const handleSeek = (value: number[]) => {
    const seekTime = value[0];
    setCurrentTime(seekTime);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  // Format time for display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle bookmark functionality
  const handleBookmark = async () => {
    if (!currentUser || !video) return;
    
    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/videos/${video.id}/collect`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        // Invalidate collections cache to refresh profile bookmarks
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "collections"] });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Handle like/unlike functionality
  const handleLike = async () => {
    console.log('handleLike called', { videoId: video?.id, isLiked, currentUser });
    if (!video?.id) {
      console.log('No video ID, returning');
      return;
    }
    
    if (!currentUser) {
      console.log('No current user, returning');
      return;
    }
    
    try {
      const endpoint = isLiked ? `/api/videos/${video.id}/unlike` : `/api/videos/${video.id}/like`;
      console.log('Making request to:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status, 'ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        
        // Invalidate videos cache to update like counts everywhere
        queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
      } else {
        const errorText = await response.text();
        console.error('Failed to toggle like:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle video comment deletion
  const handleDeleteVideoComment = async (commentId: number) => {
    if (!commentId) return;
    
    try {
      const response = await fetch(`/api/video-comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update the React Query cache directly
        queryClient.setQueryData(['/api/videos', video?.id, 'comments'], (oldData: any) => {
          if (oldData) {
            return oldData.filter((comment: any) => comment.id !== commentId);
          }
          return oldData;
        });
        
        // Update local state to match
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
        
        // Show success notification
        toast({
          title: "Comment Deleted",
          description: "Your video comment has been successfully deleted.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Delete Failed",
          description: errorData.message || "Failed to delete comment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting video comment:', error);
      toast({
        title: "Delete Error",
        description: "An error occurred while deleting the comment.",
        variant: "destructive",
      });
    }
  };

  // Handle video comment editing
  const handleEditVideoComment = async () => {
    if (!editingComment || !editCommentText.trim()) return;
    
    try {
      const response = await fetch(`/api/video-comments/${editingComment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: editCommentText.trim() }),
      });

      if (response.ok) {
        console.log('💾 EDIT SUCCESS: Updating comment', editingComment.id, 'with text:', editCommentText.trim());
        
        // Create the updated comment object
        const updatedComment = { ...editingComment, comment: editCommentText.trim() };
        
        // First: Update local state immediately for instant UI response
        setComments(prevComments => {
          console.log('🔄 LOCAL STATE: Updating from', prevComments.length, 'comments');
          const updated = prevComments.map(comment => 
            comment.id === editingComment.id ? updatedComment : comment
          );
          console.log('🔄 LOCAL STATE: Updated comment', editingComment.id, 'to:', updatedComment.comment);
          return updated;
        });
        
        // Second: Update React Query cache directly to persist the change
        const queryKey = ['/api/videos', video?.id, 'comments'];
        queryClient.setQueryData(queryKey, (oldData: any) => {
          console.log('🔄 CACHE UPDATE: Updating cache data');
          if (oldData && Array.isArray(oldData)) {
            const updated = oldData.map((comment: any) => 
              comment.id === editingComment.id ? updatedComment : comment
            );
            console.log('🔄 CACHE UPDATE: Successfully updated cache');
            return updated;
          }
          return oldData;
        });
        
        // Close edit modal and reset state
        setShowEditCommentModal(false);
        setEditingComment(null);
        setEditCommentText("");
        
        // Show success notification
        toast({
          title: "Comment Updated",
          description: "Your comment has been successfully updated.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Edit Failed",
          description: errorData.message || "Failed to edit comment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error editing video comment:', error);
      toast({
        title: "Edit Error",
        description: "An error occurred while editing the comment.",
        variant: "destructive",
      });
    }
  };

  // Handle video flagging
  const handleFlagVideo = async () => {
    if (!video?.id) return;
    
    try {
      const response = await fetch(`/api/videos/${video.id}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Show success modal instead of browser alert
        setShowFlagSuccessModal(true);
        // Invalidate videos cache to remove flagged video from feed
        queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
      }
    } catch (error) {
      console.error('Error flagging video:', error);
      setErrorTitle('Flag Error');
      setErrorMessage('Failed to flag video. Please try again.');
      setShowErrorModal(true);
    }
  };

  // Handle video quality change
  const handleQualityChange = async (quality: string) => {
    // Extract bunnyVideoId from the current video URL
    const bunnyVideoId = video.videoUrl?.split('/bunny-proxy/')[1]?.split('/')[0];
    if (!bunnyVideoId) {
      console.error('Cannot change quality: bunnyVideoId not found');
      return;
    }
    
    // Test if quality is available before switching
    const qualityUrl = `/api/videos/bunny-proxy/${bunnyVideoId}/${quality}/video.m3u8`;
    
    try {
      const response = await fetch(qualityUrl);
      if (!response.ok) {
        console.warn(`Quality ${quality} not available for this video`);
        alert(`Quality ${quality} is not available for this video`);
        return;
      }
    } catch (error) {
      console.warn(`Quality ${quality} not available:`, error);
      alert(`Quality ${quality} is not available for this video`);
      return;
    }
    
    // Store playback state before switching
    const wasPlaying = isPlaying;
    const currentTime = videoRef.current?.currentTime || 0;
    
    setVideoQuality(quality);
    
    // Update HLS source if available
    if (hlsRef.current && videoRef.current) {
      hlsRef.current.loadSource(qualityUrl);
      
      // Restore playback position and state after quality change
      const restorePosition = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
          // Maintain the playback state that existed before quality change
          if (wasPlaying) {
            setIsPlaying(true);
            videoRef.current.play();
          } else {
            setIsPlaying(false);
            videoRef.current.pause();
          }
        }
      };
      
      videoRef.current.addEventListener('loadeddata', restorePosition, { once: true });
    }
  };

  // Handle video editing
  const handleEditVideo = () => {
    setShowEditModal(true);
  };

  // Handle video deletion
  const handleDeleteVideo = async () => {
    if (!video?.id) return;
    
    const confirmed = confirm('Are you sure you want to delete this video? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Video deleted successfully.');
        onClose();
        // Invalidate videos cache to remove deleted video
        queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "videos"] });
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. Please try again.');
    }
  };

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!video?.id || !newComment.trim()) return;
    
    try {
      const response = await fetch(`/api/videos/${video.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: newComment }),
      });
      
      if (response.ok) {
        setNewComment("");
        refetchComments(); // Reload comments
      } else {
        // Handle moderation rejection and other errors
        const errorData = await response.json();
        if (errorData.moderationFailed) {
          setErrorTitle("Comment Not Allowed");
          setErrorMessage(errorData.reason || 'Your comment violates our community guidelines. Please keep comments respectful and appropriate.');
          setShowErrorModal(true);
        } else {
          setErrorTitle("Failed to Post Comment");
          setErrorMessage(errorData.message || 'Please try again in a moment.');
          setShowErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setErrorTitle("Connection Error");
      setErrorMessage('Failed to post comment. Please check your connection and try again.');
      setShowErrorModal(true);
    }
  };

  // Safety guard: show loading if video is undefined
  if (!video) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">Loading video...</div>
      </div>
    );
  }

  // Memoize playability check to prevent console flooding
  const { isVideoPlayable, videoStatus } = useMemo(() => {
    const playable = video.videoUrl && video.videoUrl.trim() !== '';
    const status = video.processingStatus || 'processing';
    
    return { isVideoPlayable: playable, videoStatus: status };
  }, [video.videoUrl, video.processingStatus, video.title, video.id]);
  
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
          ref={handleVideoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          preload="metadata"
          muted={!isPlaying}
          loop
        />

        {/* Video Click Overlay for Play/Pause - excludes action buttons area */}
        <div 
          className="absolute z-10 cursor-pointer"
          style={{
            top: '60px', // Below top controls
            left: '0px',
            right: '100px', // Well clear of right action bar
            bottom: '140px' // Well clear of bottom scrubber
          }}
          onClick={(e) => {
            console.log('🎬 VIDEO CLICK OVERLAY: Click detected!', { isPlaying, target: e.target });
            e.preventDefault();
            e.stopPropagation();
            togglePlayPause();
          }}
        />

        {/* Play button overlay when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-20 h-20 bg-black/70 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
              <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Overlay Controls */}
        <div className="absolute inset-0 pointer-events-none">
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

          {/* Right Side Action Bar - Hide for video comments */}
          {!(video as any).isVideoComment && (
            <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-6 pointer-events-auto z-50">
            {/* User Profile Picture */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  console.log('🔘 PROFILE PICTURE CLICKED: Navigating to profile page');
                  setIsPlaying(false);
                  // Navigate to the real profile page
                  if (onNavigateToProfile) {
                    console.log('🔘 PROFILE PICTURE: onNavigateToProfile function found, calling it');
                    onNavigateToProfile();
                  } else {
                    console.log('🔘 PROFILE PICTURE: No onNavigateToProfile function provided!');
                  }
                }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 hover:scale-105 transition-transform"
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  <img
                    src={
                      (enhancedProfile?.readyPlayerMeAvatarUrl || enhancedProfile?.profileImageUrl || currentUser?.profileImageUrl) ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
                    }
                    alt="User avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.id}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLike();
                }}
                className={`w-12 h-12 rounded-full p-0 ${
                  isLiked 
                    ? 'bg-red-500/80 text-white hover:bg-red-500' 
                    : 'bg-black/20 text-white hover:bg-white/30'
                }`}
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
                className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0"
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
                className={`w-12 h-12 rounded-full text-white hover:bg-white/30 p-0 ${
                  isBookmarked ? 'bg-yellow-500/80' : 'bg-black/20'
                }`}
              >
                <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>

            {/* Share Button */}
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const videoUrl = `${window.location.origin}/video/${video.id}`;
                  const shareText = `Check out this ${video.category} video "${video.title}" on Jemzy! 🎬`;
                  
                  if (navigator.share) {
                    navigator.share({
                      title: video.title,
                      text: shareText,
                      url: videoUrl,
                    }).catch((error) => {
                      console.log('Error sharing:', error);
                      // Fallback to clipboard
                      navigator.clipboard.writeText(videoUrl).then(() => {
                        toast({
                          title: "Link copied!",
                          description: "Video link has been copied to your clipboard"
                        });
                      }).catch(() => {
                        setErrorTitle("Share Video");
                        setErrorMessage(`Copy this link to share: ${videoUrl}`);
                        setShowErrorModal(true);
                      });
                    });
                  } else {
                    // Fallback to clipboard
                    navigator.clipboard.writeText(videoUrl).then(() => {
                      toast({
                        title: "Link copied!",
                        description: "Video link has been copied to your clipboard"
                      });
                    }).catch(() => {
                      setErrorTitle("Share Video");
                      setErrorMessage(`Copy this link to share: ${videoUrl}`);
                      setShowErrorModal(true);
                    });
                  }
                }}
                className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0"
              >
                <Share className="w-6 h-6" />
              </Button>
            </div>

            {/* Flag Button */}
            {video?.id && currentUser?.id !== video?.userId && (
              <div className="flex flex-col items-center">
                <FlagButton
                  contentType="video"
                  contentId={video.id}
                  contentTitle={video.title}
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
                      console.log('Three-dot button clicked!', e);
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
                  {currentUser && video.userId === currentUser.id && (
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
          )}

          {/* Bottom Content Overlay - Unified gradient */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
            {/* Video Info Section */}
            <div className="px-4 pt-8 pb-4">
              <div className="max-w-sm">
                {/* Video Title */}
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
                  {video.title}
                </h3>

                {/* Video Description */}
                {video.description && (
                  <p className="text-gray-200 text-sm mb-3 line-clamp-2">
                    {video.description}
                  </p>
                )}

                {/* Video Stats */}
                <div className="flex items-center space-x-4 text-gray-300 text-sm">
                  <span>{video.views || 0} views</span>
                  {video.category && (
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                      {video.category}
                    </span>
                  )}
                  {video.distance && (
                    <span className="text-yellow-400">
                      {formatDistance(video.distance)} away
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video Scrubber */}
            <div className="px-4 pb-3 pointer-events-auto">
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

          {/* Play/Pause Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-8 border-l-white border-t-6 border-t-transparent border-b-6 border-b-transparent ml-1"></div>
              </div>
            </div>
          )}
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
        <div className="fixed inset-0 bg-black/50 flex items-end z-[60]">
          <div className="bg-white w-full h-2/3 rounded-t-3xl flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 pb-0">
              {comments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.filter((comment) => {
                    // Show all approved comments to everyone
                    if (comment.processingStatus === 'approved') return true;
                    
                    // Show processing and rejected comments only to the poster
                    if (comment.userId === currentUser?.id) return true;
                    
                    // Hide processing/rejected comments from other users
                    return false;
                  }).map((comment, index) => (
                    <div key={index} id={`comment-${comment.id}`} className="flex space-x-3">
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setShowComments(false);
                          if (comment.user?.id !== currentUser?.id) {
                            setSelectedUserId(comment.user?.id);
                            setShowOtherProfileModal(true);
                          } else {
                            onNavigateToProfile?.();
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
                                onNavigateToProfile?.();
                              }
                            }}
                            className="font-medium text-gray-900 text-sm hover:text-purple-600 transition-colors"
                          >
                            {`${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim() || 'Anonymous'}
                          </button>
                          <span className="text-xs text-gray-500">
                            {fmtDate(comment.createdAt)}
                          </span>
                        </div>
                        {/* Text comment */}
                        {comment.commentType === 'text' && comment.comment && (
                          <div className="inline-block max-w-full group/text-comment relative">
                            <p className="text-gray-800 text-sm break-words">{comment.comment}</p>
                            
                            {/* Edit/Delete buttons for own comments */}
                            {comment.userId === currentUser?.id && (
                              <div className="absolute top-1 right-1 opacity-0 group-hover/text-comment:opacity-100 transition-opacity flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingComment(comment);
                                    setEditCommentText(comment.comment);
                                    setShowEditCommentModal(true);
                                  }}
                                  className="bg-gray-600 hover:bg-gray-700 text-white rounded-full p-1 text-xs"
                                  title="Edit comment"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVideoComment(comment.id);
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
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
                                  className={`w-48 h-32 rounded-lg overflow-hidden relative group border-2 cursor-pointer ${
                                    comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' ? 'bg-red-100 border-red-200 hover:bg-red-200' : 
                                    comment.processingStatus === 'failed' ? 'bg-red-100 border-red-200' : 
                                    comment.processingStatus === 'under_appeal' ? 'bg-blue-100 border-blue-200' :
                                    'bg-orange-100 border-orange-200'
                                  }`}
                                >
                                  <div className={`w-full h-full flex flex-col items-center justify-center ${
                                    comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                                    comment.processingStatus === 'failed' ? 'bg-gradient-to-br from-red-200 to-red-300' :
                                    comment.processingStatus === 'under_appeal' ? 'bg-gradient-to-br from-blue-200 to-blue-300' :
                                    // Check if processing has been stuck for too long (>10 minutes)
                                    (comment.processingStatus === 'processing' || comment.processingStatus === 'uploaded' || comment.processingStatus === 'pending') && 
                                    new Date().getTime() - new Date(comment.createdAt).getTime() > 600000 ? 'bg-gradient-to-br from-orange-200 to-orange-300' :
                                    'bg-gradient-to-br from-blue-200 to-blue-300'
                                  }`}>
                                    <Video className={`w-8 h-8 mb-3 ${
                                      comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' ? 'text-red-600' :
                                      comment.processingStatus === 'failed' ? 'text-red-600' :
                                      comment.processingStatus === 'under_appeal' ? 'text-blue-600 animate-pulse' :
                                      // Check if processing has been stuck for too long (>10 minutes)
                                      (comment.processingStatus === 'processing' || comment.processingStatus === 'uploaded' || comment.processingStatus === 'pending') && 
                                      new Date().getTime() - new Date(comment.createdAt).getTime() > 600000 ? 'text-orange-600 animate-bounce' :
                                      'text-blue-600 animate-spin'
                                    }`} />
                                    
                                    <div className="text-center">
                                      <div className={`text-sm font-medium mb-1 ${
                                        comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' ? 'text-red-700' :
                                        comment.processingStatus === 'failed' ? 'text-red-700' :
                                        comment.processingStatus === 'under_appeal' ? 'text-blue-700' :
                                        // Check if processing has been stuck for too long (>10 minutes)
                                        (comment.processingStatus === 'processing' || comment.processingStatus === 'uploaded' || comment.processingStatus === 'pending') && 
                                        new Date().getTime() - new Date(comment.createdAt).getTime() > 600000 ? 'text-orange-700' :
                                        'text-blue-700'
                                      }`}>
                                        {(() => {
                                          switch (comment.processingStatus) {
                                            case 'processing': return 'Processing...';
                                            case 'uploaded': return 'Reviewing...';
                                            case 'pending': return 'Pending...';
                                            case 'failed': return 'Failed';
                                            case 'rejected_by_moderation':
                                            case 'rejected_by_ai':
                                            case 'rejected': return 'Rejected';
                                            case 'flagged': return 'Flagged';
                                            case 'under_appeal': return 'Under Appeal';
                                            default: return 'Processing...';
                                          }
                                        })()}
                                      </div>
                                      
                                      {comment.flaggedReason && (
                                        <p className={`text-xs px-2 ${
                                          comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' ? 'text-red-600' :
                                          comment.processingStatus === 'failed' ? 'text-red-600' :
                                          comment.processingStatus === 'under_appeal' ? 'text-blue-600' :
                                          'text-orange-600'
                                        }`}>
                                          {comment.flaggedReason}
                                        </p>
                                      )}
                                      
                                      {(comment.processingStatus === 'rejected_by_moderation' || comment.processingStatus === 'rejected_by_ai' || comment.processingStatus === 'rejected' || comment.processingStatus === 'flagged' || comment.processingStatus === 'failed') && (
                                        <p className="text-xs text-blue-600 text-center px-2 mt-1">
                                          Tap for details
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </div>
                            )}
                            
                            {comment.processingStatus === 'approved' && comment.commentVideoUrl && (
                              <div
                                className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden cursor-pointer group relative"
                                onClick={() => {
                                  console.log('🎬 VIDEO COMMENT CLICK: Opening video comment in fullscreen:', comment.id);
                                  console.log('🎬 VIDEO COMMENT CLICK: Setting selectedFullscreenComment:', comment);
                                  console.log('🎬 VIDEO COMMENT CLICK: Setting showCommentFullscreenModal to true');
                                  
                                  // Directly pause and mute the main video element
                                  if (videoRef.current) {
                                    console.log('🎬 VIDEO COMMENT CLICK: Video ref found, current state:', {
                                      paused: videoRef.current.paused,
                                      muted: videoRef.current.muted,
                                      currentTime: videoRef.current.currentTime
                                    });
                                    
                                    videoRef.current.pause();
                                    videoRef.current.muted = true;
                                    
                                    // Double-check the pause worked
                                    setTimeout(() => {
                                      if (videoRef.current) {
                                        console.log('🎬 VIDEO COMMENT CLICK: After pause attempt:', {
                                          paused: videoRef.current.paused,
                                          muted: videoRef.current.muted
                                        });
                                      }
                                    }, 100);
                                    
                                    console.log('🎬 VIDEO COMMENT CLICK: Main video paused and muted directly');
                                  } else {
                                    console.log('🎬 VIDEO COMMENT CLICK: No video ref found!');
                                  }
                                  
                                  setSelectedFullscreenComment(comment);
                                  setShowCommentFullscreenModal(true);
                                  setIsPlaying(false);
                                  console.log('🎬 VIDEO COMMENT CLICK: State setters called');
                                }}
                              >
                                {comment.thumbnailUrl ? (
                                  <img 
                                    src={comment.thumbnailUrl}
                                    alt="Video comment"
                                    className="w-full h-full object-cover"
                                    onLoad={() => console.log('✅ THUMBNAIL: Stored thumbnail loaded for comment', comment.id)}
                                    onError={() => console.log('❌ THUMBNAIL: Stored thumbnail failed for comment', comment.id, comment.thumbnailUrl)}
                                  />
                                ) : comment.bunnyVideoId ? (
                                  <img 
                                    src={`https://vz-7c674c55-8ff.b-cdn.net/${comment.bunnyVideoId}/thumbnail.jpg`}
                                    alt="Video comment"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      if (target.parentElement) {
                                        target.parentElement.innerHTML = `
                                          <div class="w-full h-full bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center">
                                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                            </svg>
                                          </div>
                                        `;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center">
                                    <Video className="w-8 h-8 text-white" />
                                  </div>
                                )}
                                
                                {/* Play button overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-gray-800 ml-1" />
                                  </div>
                                </div>
                                
                                {/* Duration badge */}
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                  {Math.floor(comment.duration || 0)}s
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Action buttons for comments */}
                        <div className="mt-1 flex justify-end space-x-1">
                          {/* Flag button for comments not owned by current user */}
                          {comment.user?.id !== currentUser?.id && (
                            <FlagButton
                              contentType="comment"
                              contentId={comment.id?.toString() || ''}
                              className="text-gray-400 hover:text-red-500"
                              variant="ghost"
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>



            {/* Comment Input - Fixed at bottom */}
            <div className="border-t bg-white p-4">
              <div className="flex space-x-3 items-end">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setShowComments(false);
                    onNavigateToProfile?.();
                  }}
                  className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity"
                >
                  {currentUser?.profileImageUrl ? (
                    <img 
                      src={currentUser.profileImageUrl} 
                      alt={currentUser.firstName || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {currentUser?.firstName?.[0]?.toUpperCase() || 'U'}
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
                      className="flex-1 bg-transparent focus:outline-none text-sm"
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
                      className="p-1 h-auto text-gray-500 hover:text-gray-700"
                    >
                      <Camera className="w-5 h-5" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto text-gray-500 hover:text-gray-700"
                        >
                          <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" side="top">
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {/* Smileys & Emotion */}
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
                          {/* Objects & Activities */}
                          {['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🪘', '🥁', '🎹', '🎷', '🎺', '🎸', '🪕', '🎻'].map(emoji => (
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
                    <Button 
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md" aria-describedby="edit-modal-description">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <div id="edit-modal-description" className="sr-only">
              Edit your video details including title, description, and category
            </div>
          </DialogHeader>
          <VideoEditForm 
            videoId={video?.id || ''}
            currentTitle={video?.title || ''}
            currentDescription={video?.description || ''}
            currentCategory={video?.category || ''}
            onSuccess={() => {
              setShowEditModal(false);
              queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
              queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "videos"] });
            }}
            onCancel={() => setShowEditModal(false)}
            onDelete={() => {
              setShowEditModal(false);
              onClose();
              queryClient.invalidateQueries({ queryKey: ["/api/videos/nearby"] });
              queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser?.id, "videos"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md" aria-describedby="error-description">
          <DialogHeader>
            <DialogTitle className="text-red-600">{errorTitle}</DialogTitle>
            <DialogDescription id="error-description" className="text-gray-600 mt-2">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setShowErrorModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Comment Modal */}
      <Dialog open={showEditCommentModal} onOpenChange={setShowEditCommentModal}>
        <DialogContent className="sm:max-w-md" aria-describedby="edit-comment-modal-description">
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
            <div id="edit-comment-modal-description" className="sr-only">
              Edit your comment text
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <textarea
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Edit your comment..."
                maxLength={500}
              />
              <div className="text-sm text-gray-500 mt-1">
                {editCommentText.length}/500 characters
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditCommentModal(false);
                  setEditingComment(null);
                  setEditCommentText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEditVideoComment}
                disabled={!editCommentText.trim()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Comment Fullscreen Modal */}
      {(() => {
        // Modal render check (logging removed to prevent spam)
        
        return showCommentFullscreenModal && selectedFullscreenComment ? (
          <div 
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
            onClick={(e) => {
              console.log('🎬 MODAL BACKGROUND CLICKED');
              if (e.target === e.currentTarget) {
                setShowCommentFullscreenModal(false);
                setSelectedFullscreenComment(null);
              }
            }}
          >

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('🎬 MODAL: Close button clicked');
                setShowCommentFullscreenModal(false);
                setSelectedFullscreenComment(null);
              }}
              className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
              aria-label="Close fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Fullscreen Video Player */}
            <div 
              className="relative w-full h-full flex items-center justify-center cursor-pointer fullscreen-comment-video"
              onClick={(e) => {
                // Only handle clicks on the video container itself, not on overlays
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
              <VideoCommentPlayer 
                key={`${selectedFullscreenComment.id}-${videoQuality || '720p'}`}
                videoUrl={selectedFullscreenComment.commentVideoUrl}
                duration={selectedFullscreenComment.duration}
                thumbnailUrl={selectedFullscreenComment.thumbnailUrl}
                commentData={selectedFullscreenComment}
                isFullscreen={true}
                onDelete={handleDeleteVideoComment}
                onFullscreen={() => {
                  // Already in fullscreen, ignore
                }}
              />
            </div>
          </div>
        ) : null;
      })()}

      {/* Flag Success Modal */}
      <Dialog open={showFlagSuccessModal} onOpenChange={setShowFlagSuccessModal}>
        <DialogContent className="sm:max-w-md" aria-describedby="flag-success-description">
          <DialogHeader>
            <DialogTitle className="text-green-600">Video Flagged</DialogTitle>
            <DialogDescription id="flag-success-description" className="text-gray-600 mt-2">
              Video has been flagged for review. It will be reviewed by our moderation team and hidden until approved by staff.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => {
                setShowFlagSuccessModal(false);
                onClose();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Comment Recorder */}
      <VideoCommentRecorder
        isOpen={showVideoCommentRecorder}
        onClose={() => setShowVideoCommentRecorder(false)}
        videoId={video?.id || ''}
        onCommentSubmitted={() => {
          // Refresh comments when a new video comment is submitted
          console.log('Video comment submitted, refreshing comments...');
          refetchComments();
        }}
        onMainVideoControl={handleMainVideoControl}
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
        videoId={video?.id}
        onRefetchComments={refetchComments}
      />

      {/* Fullscreen Video Comment Modal */}
      {showCommentFullscreenModal && selectedFullscreenComment && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowCommentFullscreenModal(false);
              setSelectedFullscreenComment(null);
              
              // Restore main video playback when closing comment modal
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play().catch(console.error);
                console.log('🎬 COMMENT MODAL CLOSE: Main video unmuted and resumed');
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
              // Only handle clicks on the video container itself, not on overlays
              if (e.target === e.currentTarget) {
                const videoElement = document.querySelector('.fullscreen-video video') as HTMLVideoElement;
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
            <div className="fullscreen-video">
              <VideoCommentPlayer 
                videoUrl={selectedFullscreenComment.commentVideoUrl}
                duration={selectedFullscreenComment.duration}
                thumbnailUrl={selectedFullscreenComment.thumbnailUrl}
                onFullscreen={() => {
                  // Already in fullscreen, ignore
                }}
                isFullscreen={true}
                commentData={selectedFullscreenComment}
                onDelete={handleDeleteVideoComment}
                onTimeUpdate={(currentTime, duration, isPlaying) => {
                  // When comment video starts playing, pause the main video
                  if (isPlaying && videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    videoRef.current.muted = true;
                    console.log('🎬 COMMENT VIDEO PLAYING: Main video paused due to comment video playback');
                  }
                }}
              />
            </div>
          </div>

          {/* Comment Info Overlay - Positioned at top left to avoid blocking video controls */}
          <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-4 max-w-xs">
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
                <p className="text-white font-medium text-sm truncate">
                  {`${selectedFullscreenComment.user?.firstName || ''} ${selectedFullscreenComment.user?.lastName || ''}`.trim() || 'Anonymous'}
                </p>
                <p className="text-gray-300 text-xs">
                  {fmtDate(selectedFullscreenComment.createdAt)}
                </p>
              </div>
            </div>
            {selectedFullscreenComment.comment && (
              <p className="text-gray-200 text-xs mt-2 line-clamp-2">
                {selectedFullscreenComment.comment}
              </p>
            )}
          </div>

          {/* Video Controls/Scrubber */}
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <VideoScrubber 
              comment={selectedFullscreenComment}
              onTimeUpdate={(currentTime, duration) => {
                // Update time display - handled internally by VideoScrubber
              }}
            />
          </div>

          {/* Three-dot overflow menu positioned on the screen */}
          {selectedFullscreenComment && currentUser?.id === selectedFullscreenComment.userId && (
            <div className="fixed bottom-20 right-6 z-[200]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    className="w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer shadow-lg border border-white/20"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="w-6 h-6" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[210]">
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
                      onClick={() => setVideoQuality(quality)} 
                      className="pl-8"
                    >
                      {videoQuality === quality && '✓ '}{quality}{quality === '720p' ? ' (Default)' : ''}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Delete Comment */}
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const response = await fetch(`/api/video-comments/${selectedFullscreenComment.id}`, {
                          method: 'DELETE',
                        });
                        if (response.ok) {
                          console.log('🗑️ FULLSCREEN COMMENT DELETED: Starting cache invalidation for comment', selectedFullscreenComment.id);
                          
                          // Update local state immediately by removing the deleted comment
                          setComments(prevComments => {
                            const updated = prevComments.filter(comment => comment.id !== selectedFullscreenComment.id);
                            console.log('🔄 FULLSCREEN LOCAL STATE: Removed comment', selectedFullscreenComment.id, 'new count:', updated.length);
                            return updated;
                          });
                          
                          // Invalidate queries to refresh the comments list
                          await queryClient.invalidateQueries({ queryKey: ['/api/videos', video?.id, 'comments'] });
                          
                          // Also invalidate user's video comments in profile
                          if (currentUser?.id) {
                            await queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "video-comments"] });
                          }
                          
                          setShowCommentFullscreenModal(false);
                          setSelectedFullscreenComment(null);
                          // Allow main video to resume if user wants
                          // User can resume main video
                          
                          // Force immediate refetch of comments
                          await refetchComments();
                          
                          toast({
                            title: "Success",
                            description: "Video comment deleted successfully",
                          });
                        } else {
                          throw new Error('Failed to delete comment');
                        }
                      } catch (error) {
                        console.error('Error deleting comment:', error);
                        toast({
                          title: "Error",
                          description: "Failed to delete video comment",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Comment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { VideoCommentPlayer };