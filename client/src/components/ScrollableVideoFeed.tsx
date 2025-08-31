import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast.ts';
import { apiRequest } from '@/lib/queryClient.ts';
import HLSVideoPlayer, { type HLSVideoPlayerRef } from './HLSVideoPlayer.js';
import { Button } from '@/components/ui/button.tsx';
import { Slider } from '@/components/ui/slider.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { X, Heart, MessageCircle, Share, Bookmark, MoreVertical, Play, Pause, Volume2, VolumeX, Flag, Copy, Download, Edit, Send, Camera, Smile, Video } from 'lucide-react';
import { fmtDate, fmtDateTime } from '@/lib/format.ts';


interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  latitude?: string;
  longitude?: string;
  likes: number;
  views: number;
  userId: string;
  userProfileImageUrl?: string;
  thumbnailUrl?: string;
}

interface ScrollableVideoFeedProps {
  videos: Video[];
  onClose: () => void;
  initialVideoIndex?: number;
}

export default function ScrollableVideoFeed({ videos, onClose, initialVideoIndex = 0 }: ScrollableVideoFeedProps) {
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [collectedVideos, setCollectedVideos] = useState<Set<string>>(new Set());
  const [videoLikeCounts, setVideoLikeCounts] = useState<{[key: string]: number}>({});
  const [videoComments, setVideoComments] = useState<Record<string, any[]>>({});
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showCommentFullscreenModal, setShowCommentFullscreenModal] = useState(false);
  const [selectedFullscreenComment, setSelectedFullscreenComment] = useState<any>(null);
  const videoRefs = useRef<Map<number, HLSVideoPlayerRef>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user data
  const { data: currentUser } = useQuery<{ id: string; username?: string; profileImageUrl?: string }>({
    queryKey: ['/api/auth/user'],
    enabled: true
  });

  // Track which videos have been marked as watched to prevent duplicate mutations
  const watchedVideosRef = useRef<Set<string>>(new Set());

  // Mutation to mark a video as watched
  const markAsWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      console.log('🎬 WATCH TRACKING: Marking video as watched:', videoId);
      return apiRequest(`/api/videos/${videoId}/watch`, 'POST');
    },
    onSuccess: (data, videoId) => {
      console.log('🎬 WATCH TRACKING: Successfully marked video as watched:', videoId);
      watchedVideosRef.current.add(videoId);
      // Invalidate the videos cache to refresh the watched status
      queryClient.invalidateQueries({ queryKey: ['/api/videos/nearby'] });
    },
    onError: (error, videoId) => {
      console.error('🎬 WATCH TRACKING: Failed to mark video as watched:', videoId, error);
    }
  });

  // Mutation to increment view count
  const incrementViewsMutation = useMutation({
    mutationFn: async (videoId: string) => {
      console.log('📊 VIEW TRACKING: Incrementing view count for video:', videoId);
      return apiRequest(`/api/videos/${videoId}/view`, 'POST');
    },
    onSuccess: (data, videoId) => {
      console.log('📊 VIEW TRACKING: Successfully incremented view count for video:', videoId);
      // Invalidate the videos cache to refresh the view count
      queryClient.invalidateQueries({ queryKey: ['/api/videos/nearby'] });
    },
    onError: (error, videoId) => {
      console.error('📊 VIEW TRACKING: Failed to increment view count for video:', videoId, error);
    }
  });

  // Initialize video like counts when videos prop changes
  useEffect(() => {
    const initialCounts: {[key: string]: number} = {};
    videos.forEach(video => {
      initialCounts[video.id] = video.likes || 0;
    });
    setVideoLikeCounts(initialCounts);
  }, [videos]);

  // Load user's liked videos when user data is available
  useEffect(() => {
    const loadLikedVideos = async () => {
      if (!currentUser?.id) return;
      
      try {
        const response = await fetch(`/api/users/${currentUser.id}/liked`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const likedVideos = await response.json();
          const likedVideoIds = new Set<string>(likedVideos.map((video: any) => video.id));
          setLikedVideos(likedVideoIds);
          console.log('Loaded liked videos:', likedVideoIds);
        }
      } catch (error) {
        console.error('Error loading liked videos:', error);
      }
    };

    loadLikedVideos();
  }, [currentUser?.id]);

  // Load comments for all videos
  const loadCommentsForAllVideos = async () => {
    if (!videos || videos.length === 0) return;
    
    const commentsData: Record<string, any[]> = {};
    
    for (const video of videos) {
      try {
        const response = await fetch(`/api/videos/${video.id}/comments`);
        if (response.ok) {
          const comments = await response.json();
          commentsData[video.id] = comments;
        } else {
          commentsData[video.id] = [];
        }
      } catch (error) {
        console.error(`Failed to load comments for video ${video.id}:`, error);
        commentsData[video.id] = [];
      }
    }
    
    setVideoComments(commentsData);
  };

  // Load comments when videos change
  useEffect(() => {
    loadCommentsForAllVideos();
  }, [videos]);

  // Find the most visible video index
  const findMostVisibleVideo = () => {
    let maxRatio = 0;
    let mostVisibleIndex = -1;
    
    videos.forEach((_, index) => {
      const element = document.querySelector(`[data-video-index="${index}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        if (rect.top < viewportHeight && rect.bottom > 0) {
          const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
          const ratio = visibleHeight / rect.height;
          
          if (ratio > maxRatio) {
            maxRatio = ratio;
            mostVisibleIndex = index;
          }
        }
      }
    });
    
    return mostVisibleIndex;
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedVideoForComments || isCommenting) return;

    setIsCommenting(true);
    try {
      const response = await fetch(`/api/videos/${selectedVideoForComments.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          commentType: 'text'
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        
        // Update local comments state
        setVideoComments(prev => ({
          ...prev,
          [selectedVideoForComments.id]: [
            ...(prev[selectedVideoForComments.id] || []),
            newCommentData
          ]
        }));
        
        setNewComment('');
        console.log('Comment submitted successfully');
      } else {
        console.error('Failed to submit comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  // Load user's collected videos when user data is available
  useEffect(() => {
    const loadCollectedVideos = async () => {
      if (!currentUser?.id) return;
      
      try {
        const response = await fetch(`/api/users/${currentUser.id}/collections`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const collections = await response.json();
          console.log('Raw collections data:', collections);
          
          // The collections endpoint returns an array of video objects directly
          const collectedVideoIds = new Set(
            Array.isArray(collections) 
              ? collections.map((video: any) => video.id) 
              : []
          );
          
          setCollectedVideos(collectedVideoIds);
          console.log('Loaded collected videos:', collectedVideoIds);
        }
      } catch (error) {
        console.error('Error loading collected videos:', error);
      }
    };

    loadCollectedVideos();
  }, [currentUser?.id]);

  // Handle like/unlike functionality
  const handleLike = async (videoId: string) => {
    if (!currentUser?.id) {
      console.log('User not authenticated');
      return;
    }

    console.log('Making request to:', `/api/videos/${videoId}/like`);
    
    try {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        
        // Update local state for immediate UI feedback
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          if (newSet.has(videoId)) {
            newSet.delete(videoId);
          } else {
            newSet.add(videoId);
          }
          return newSet;
        });

        // Update like count
        setVideoLikeCounts(prev => ({
          ...prev,
          [videoId]: (prev[videoId] || 0) + (likedVideos.has(videoId) ? -1 : 1)
        }));
      } else {
        console.error('Failed to like video:', response.status);
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  // Handle collect/uncollect functionality
  const handleCollect = async (videoId: string) => {
    if (!currentUser?.id) {
      console.log('User not authenticated');
      return;
    }

    console.log('Making collection request to:', `/api/videos/${videoId}/collect`);
    
    try {
      const response = await fetch(`/api/videos/${videoId}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Collection response status:', response.status, 'ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Collection response data:', data);
        
        // Update local state for immediate UI feedback
        setCollectedVideos(prev => {
          const newSet = new Set(prev);
          if (newSet.has(videoId)) {
            newSet.delete(videoId);
          } else {
            newSet.add(videoId);
          }
          return newSet;
        });
      } else {
        console.error('Failed to collect video:', response.status);
      }
    } catch (error) {
      console.error('Error collecting video:', error);
    }
  };

  const handleShareVideo = (video: Video) => {
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleCopyLink = (video: Video) => {
    const shareUrl = `${window.location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(shareUrl);
  };

  const handleReportVideo = (videoId: string) => {
    console.log('Report video:', videoId);
    // Implementation would navigate to report form
  };

  const handleDownloadVideo = (video: Video) => {
    const link = document.createElement('a');
    link.href = video.videoUrl;
    link.download = `${video.title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditVideo = (videoId: string) => {
    // Navigate to edit form - this would typically open an edit modal or navigate to edit page
    console.log('Edit video:', videoId);
    // Implementation would depend on your edit system
  };

  // Initialize intersection observer for video playback control
  useEffect(() => {
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Find the video with the highest intersection ratio
      let mostVisibleVideo = { index: -1, ratio: 0 };
      
      entries.forEach(entry => {
        const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0');
        
        if (entry.isIntersecting && entry.intersectionRatio > mostVisibleVideo.ratio) {
          mostVisibleVideo = { index: videoIndex, ratio: entry.intersectionRatio };
        }
        
        console.log(`Video ${videoIndex}: intersecting=${entry.isIntersecting}, ratio=${entry.intersectionRatio.toFixed(2)}`);
      });

      // Switch to the most visible video if it's different from current and meets threshold
      if (mostVisibleVideo.index !== -1 && mostVisibleVideo.ratio >= 0.8) {
        const videoIndex = mostVisibleVideo.index;
        
        // Only switch if it's actually a different video and after a delay to prevent rapid switching
        setCurrentlyPlayingIndex(prevIndex => {
          if (prevIndex === videoIndex) return prevIndex;
          
          console.log(`Switching to most visible video ${videoIndex} (ratio: ${mostVisibleVideo.ratio.toFixed(2)}) from ${prevIndex}`);
          
          // Immediately pause ALL videos and stop their audio
          videoRefs.current.forEach((ref, index) => {
            if (ref) {
              console.log(`Stopping video ${index}`);
              ref.pause();
              ref.setCurrentTime(0);
              ref.setMuted(true); // Temporarily mute to stop audio immediately
            }
          });

          // Reset states for new video
          setCurrentTime(0);
          setIsPlaying(false);
          
          // Start new video immediately 
          const currentVideoRef = videoRefs.current.get(videoIndex);
          if (currentVideoRef) {
            setDuration(currentVideoRef.duration || 0);
            currentVideoRef.setMuted(isMuted); // Set proper mute state
            currentVideoRef.setCurrentTime(0);
            currentVideoRef.play().then(() => {
              setIsPlaying(true);
              console.log(`Started playing video ${videoIndex}`);
              
              // Mark video as watched and increment view count when it starts playing
              const currentVideo = videos[videoIndex];
              if (currentVideo?.id && !watchedVideosRef.current.has(currentVideo.id)) {
                markAsWatchedMutation.mutate(currentVideo.id);
                incrementViewsMutation.mutate(currentVideo.id);
                console.log('🎬 SCROLL FEED: Marking video as watched and incrementing views:', currentVideo.id);
              }
            }).catch(error => {
              console.error(`Video autoplay failed for index: ${videoIndex}`, error);
            });
          }
          
          return videoIndex;
        });
      }
    };

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: [0.8, 0.9],
        rootMargin: '-10px',
        root: containerRef.current
      });
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [isMuted]); // Only depend on isMuted, not currentlyPlayingIndex

  // Setup observer for video items and initial autoplay
  useEffect(() => {
    const videoItems = containerRef.current?.querySelectorAll('.video-feed-item');
    if (videoItems && observerRef.current) {
      videoItems.forEach(item => {
        observerRef.current?.observe(item);
      });
    }

    // Scroll to initial video position and start playing initial video
    setTimeout(() => {
      if (containerRef.current && initialVideoIndex > 0) {
        const targetElement = containerRef.current.children[initialVideoIndex] as HTMLElement;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      } else if (initialVideoIndex === 0) {
        // If starting with first video, manually trigger play
        const initialVideoRef = videoRefs.current.get(0);
        if (initialVideoRef) {
          setCurrentlyPlayingIndex(0);
          setCurrentTime(0);
          setDuration(initialVideoRef.duration || 0);
          initialVideoRef.setMuted(isMuted);
          initialVideoRef.play().then(() => {
            setIsPlaying(true);
            console.log('Started playing initial video 0');
            
            // Mark initial video as watched and increment view count when it starts playing
            const currentVideo = videos[0];
            if (currentVideo?.id && !watchedVideosRef.current.has(currentVideo.id)) {
              markAsWatchedMutation.mutate(currentVideo.id);
              incrementViewsMutation.mutate(currentVideo.id);
              console.log('🎬 SCROLL FEED: Marking initial video as watched and incrementing views:', currentVideo.id);
            }
          }).catch(error => {
            console.error('Initial video autoplay failed:', error);
          });
        }
      }
    }, 300); // Increased delay to ensure video refs are ready

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [videos, initialVideoIndex, isMuted]);

  // Register video ref
  const setVideoRef = (index: number, ref: HLSVideoPlayerRef | null) => {
    if (ref) {
      videoRefs.current.set(index, ref);
    } else {
      videoRefs.current.delete(index);
    }
  };

  const handleVideoError = async (error: any, videoId: string, videoUrl: string) => {
    console.error(`Video ${videoId} failed to load:`, error);
    
    // Log error to backend
    try {
      await fetch('/api/log-video-playback-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          videoUrl,
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

  // Video control handlers
  const togglePlayPause = () => {
    if (currentlyPlayingIndex !== null) {
      const videoRef = videoRefs.current.get(currentlyPlayingIndex);
      if (videoRef) {
        if (isPlaying) {
          videoRef.pause();
          setIsPlaying(false);
        } else {
          videoRef.play().catch(console.error);
          setIsPlaying(true);
        }
      }
    }
  };

  const toggleMute = () => {
    if (currentlyPlayingIndex !== null) {
      const videoRef = videoRefs.current.get(currentlyPlayingIndex);
      if (videoRef) {
        const newMutedState = !isMuted;
        videoRef.setMuted(newMutedState);
        setIsMuted(newMutedState);
      }
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (currentlyPlayingIndex !== null) {
      const videoRef = videoRefs.current.get(currentlyPlayingIndex);
      if (videoRef) {
        videoRef.setCurrentTime(time);
      }
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

  // Video event handlers
  const handleVideoLoadedMetadata = (index: number) => {
    if (index === currentlyPlayingIndex) {
      const videoRef = videoRefs.current.get(index);
      if (videoRef) {
        const videoDuration = videoRef.duration;
        setDuration(videoDuration);
        console.log(`Video ${index} loaded, duration: ${videoDuration}s`);
      }
    }
  };

  const handleVideoTimeUpdate = (index: number) => {
    if (index === currentlyPlayingIndex && !isSeeking) {
      const videoRef = videoRefs.current.get(index);
      if (videoRef) {
        const time = videoRef.currentTime;
        setCurrentTime(time);
      }
    }
  };

  const handleVideoPlaying = (index: number) => {
    if (index === currentlyPlayingIndex) {
      setIsPlaying(true);
    }
  };

  const handleVideoPause = (index: number) => {
    if (index === currentlyPlayingIndex) {
      setIsPlaying(false);
    }
  };

  const handleVideoEnded = (index: number) => {
    if (index === currentlyPlayingIndex) {
      console.log(`Video ${index} ended, restarting from beginning`);
      const videoRef = videoRefs.current.get(index);
      if (videoRef) {
        videoRef.setCurrentTime(0);
        videoRef.play().then(() => {
          setIsPlaying(true);
          setCurrentTime(0);
        }).catch(error => {
          console.error(`Video loop restart failed for index: ${index}`, error);
        });
      }
    }
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">No videos to display</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Close button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20 p-2"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Scrollable video feed container */}
      <div 
        ref={containerRef}
        className="video-feed-container h-full w-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          scrollBehavior: 'smooth'
        }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            data-video-index={index}
            className="video-feed-item relative w-full h-full flex-shrink-0"
            style={{
              scrollSnapAlign: 'start',
              height: '100vh'
            }}
          >
            {/* Video player */}
            <HLSVideoPlayer
              ref={(ref) => setVideoRef(index, ref)}
              src={video.videoUrl}
              className="w-full h-full object-contain bg-black"
              autoPlay={false}
              muted={isMuted}
              poster={video.thumbnailUrl}
              onLoadedMetadata={() => handleVideoLoadedMetadata(index)}
              onTimeUpdate={() => handleVideoTimeUpdate(index)}
              onPlaying={() => handleVideoPlaying(index)}
              onPause={() => handleVideoPause(index)}
              onEnded={() => handleVideoEnded(index)}
              onError={(error) => handleVideoError(error, video.id, video.videoUrl)}
            />

            {/* Play/Pause overlay */}
            <div 
              className="absolute inset-0 z-5 cursor-pointer flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Only allow control of the currently visible video
                if (currentlyPlayingIndex === index) {
                  togglePlayPause();
                }
              }}
            >
              {!isPlaying && currentlyPlayingIndex === index && (
                <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              )}
            </div>

            {/* Video overlay controls */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Right side action bar */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-6 pointer-events-auto z-50">
                {/* User Profile Picture */}
                <div className="flex flex-col items-center">
                  <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                      <img
                        src={video.userProfileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.userId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
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
                      handleLike(video.id);
                    }}
                    className={`w-12 h-12 rounded-full p-0 ${
                      likedVideos.has(video.id) 
                        ? 'bg-red-500/80 text-white hover:bg-red-500' 
                        : 'bg-black/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${likedVideos.has(video.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <span className="text-white text-xs mt-1 font-semibold">
                    {videoLikeCounts[video.id] || video.likes || 0}
                  </span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVideoForComments(video);
                      setShowCommentsModal(true);
                    }}
                    className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                  <span className="text-white text-xs mt-1 font-semibold">
                    {videoComments[video.id]?.length || 0}
                  </span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                            toast({
                              title: "Share Video",
                              description: `Copy this link to share: ${videoUrl}`,
                              variant: "destructive"
                            });
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
                          toast({
                            title: "Share Video",
                            description: `Copy this link to share: ${videoUrl}`,
                            variant: "destructive"
                          });
                        });
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0"
                  >
                    <Share className="w-6 h-6" />
                  </Button>
                </div>

                {/* Bookmark Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCollect(video.id);
                    }}
                    className={`w-12 h-12 rounded-full p-0 ${
                      collectedVideos.has(video.id) 
                        ? 'bg-yellow-500/80 text-white hover:bg-yellow-500' 
                        : 'bg-black/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Bookmark className={`w-6 h-6 ${collectedVideos.has(video.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                {/* More Options */}
                <div className="flex flex-col items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-white/30 p-0"
                      >
                        <MoreVertical className="w-6 h-6" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 border-gray-700 text-white">
                      {/* Show Edit option only for videos owned by current user */}
                      {currentUser?.id === video.userId && (
                        <DropdownMenuItem 
                          onClick={() => handleEditVideo(video.id)}
                          className="hover:bg-white/10 focus:bg-white/10"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleShareVideo(video)}
                        className="hover:bg-white/10 focus:bg-white/10"
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCopyLink(video)}
                        className="hover:bg-white/10 focus:bg-white/10"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDownloadVideo(video)}
                        className="hover:bg-white/10 focus:bg-white/10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleReportVideo(video.id)}
                        className="hover:bg-white/10 focus:bg-white/10 text-red-400"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Video info for all videos */}
              <div className="absolute bottom-20 left-4 right-20 pointer-events-auto">
                <div className="text-white">
                  <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-300 mb-2">{video.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs">
                      {video.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {video.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom playback controls - fixed at bottom of screen */}
      {currentlyPlayingIndex !== null && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-50 pointer-events-auto">
          {/* Playback progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              onPointerDown={handleSeekStart}
              onPointerUp={handleSeekEnd}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>


        </div>
      )}

      {/* Comments Modal - Match VideoPlayerModal exactly */}
      {showCommentsModal && selectedVideoForComments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCommentsModal(false);
                  setSelectedVideoForComments(null);
                  setNewComment('');
                  setShowCommentFullscreenModal(false);
                  setSelectedFullscreenComment(null);
                }}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video Title Section */}
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium text-gray-900">{selectedVideoForComments.title}</h4>
              <p className="text-sm text-gray-600">{selectedVideoForComments.description}</p>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto">
              {videoComments[selectedVideoForComments.id]?.length > 0 ? (
                <div className="p-4 space-y-4">
                  {videoComments[selectedVideoForComments.id].map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3">
                      {/* User Avatar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('ScrollableVideoFeed comment: Navigating to user profile:', comment.user?.id);
                          
                          // Store current page context for back navigation
                          sessionStorage.setItem('profileReferrer', JSON.stringify({
                            path: window.location.pathname + window.location.search,
                            source: 'video_feed_comment'
                          }));
                          
                          if (comment.user?.id === currentUser?.id) {
                            window.location.href = '/profile';
                          } else {
                            window.location.href = `/profile/${comment.user?.id}`;
                          }
                        }}
                        className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold hover:opacity-80 transition-opacity flex-shrink-0"
                      >
                        {comment.user?.profileImageUrl ? (
                          <img 
                            src={comment.user.profileImageUrl} 
                            alt={`${comment.user?.username || ''} ${comment.user?.lastName || ''}`.trim() || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">
                            {comment.user?.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('ScrollableVideoFeed comment: Navigating to user profile:', comment.user?.id);
                              
                              // Store current page context for back navigation
                              sessionStorage.setItem('profileReferrer', JSON.stringify({
                                path: window.location.pathname + window.location.search,
                                source: 'video_feed_username'
                              }));
                              
                              if (comment.user?.id === currentUser?.id) {
                                window.location.href = '/profile';
                              } else {
                                window.location.href = `/profile/${comment.user?.id}`;
                              }
                            }}
                            className="font-medium text-gray-900 text-sm hover:text-purple-600 transition-colors"
                          >
                            {`${comment.user?.username || ''} ${comment.user?.lastName || ''}`.trim() || 'Anonymous'}
                          </button>
                          <span className="text-xs text-gray-500">
                            {fmtDate(comment.createdAt)}
                          </span>
                        </div>

                        {/* Text comment */}
                        {comment.commentType === 'text' && comment.comment && (
                          <div className="bg-gray-100 rounded-2xl px-4 py-2 inline-block max-w-full">
                            <p className="text-gray-800 text-sm break-words">{comment.comment}</p>
                          </div>
                        )}

                        {/* Video comment */}
                        {comment.commentType === 'video' && (
                          <div className="inline-block max-w-full">
                            {comment.processingStatus === 'approved' && comment.commentVideoUrl && (
                              <div
                                className="w-48 h-32 bg-gray-200 rounded-lg overflow-hidden cursor-pointer group relative"
                                onClick={() => {
                                  console.log('Video comment clicked:', comment);
                                  
                                  // Pause all playing videos in the feed
                                  for (let i = 0; i < videos.length; i++) {
                                    const videoRef = videoRefs.current.get(i);
                                    if (videoRef) {
                                      videoRef.pause();
                                      videoRef.setMuted(true);
                                    }
                                  }
                                  
                                  setSelectedFullscreenComment(comment);
                                  setShowCommentFullscreenModal(true);
                                }}
                              >
                                {comment.thumbnailUrl ? (
                                  <img 
                                    src={comment.thumbnailUrl}
                                    alt="Video comment"
                                    className="w-full h-full object-cover"
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-16">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No comments yet</p>
                    <p className="text-sm text-gray-400">Be the first to comment!</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className="border-t bg-white p-4">
              <div className="flex space-x-3 items-end">
                <button
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
                      onClick={() => {
                        // Handle video comment recording
                        console.log('Video comment recording clicked');
                      }}
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
                          {/* Popular emojis */}
                          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💖', '💗', '💘', '💝', '💞', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'].map(emoji => (
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
                      disabled={!newComment.trim() || isCommenting}
                      size="sm"
                      className="rounded-full"
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

      {/* Video Comment Fullscreen Modal */}
      {showCommentFullscreenModal && selectedFullscreenComment && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => {
              setShowCommentFullscreenModal(false);
              setSelectedFullscreenComment(null);
              
              // Resume the most visible video
              const mostVisibleIndex = findMostVisibleVideo();
              if (mostVisibleIndex !== -1) {
                const videoRef = videoRefs.current.get(mostVisibleIndex);
                if (videoRef) {
                  videoRef.setMuted(false);
                  videoRef.play();
                }
              }
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
              <video 
                src={selectedFullscreenComment.commentVideoUrl}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                playsInline
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
                  {selectedFullscreenComment.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('ScrollableVideoFeed fullscreen comment: Navigating to user profile:', selectedFullscreenComment.user?.id);
                    
                    // Store current page context for back navigation
                    sessionStorage.setItem('profileReferrer', JSON.stringify({
                      path: window.location.pathname + window.location.search,
                      source: 'fullscreen_comment'
                    }));
                    
                    if (selectedFullscreenComment.user?.id === currentUser?.id) {
                      window.location.href = '/profile';
                    } else {
                      window.location.href = `/profile/${selectedFullscreenComment.user?.id}`;
                    }
                  }}
                  className="text-white font-medium text-sm truncate hover:text-blue-200 transition-colors cursor-pointer"
                >
                  {`${selectedFullscreenComment.user?.username || ''} ${selectedFullscreenComment.user?.lastName || ''}`.trim() || 'Anonymous'}
                </button>
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
        </div>
      )}
    </div>
  );
}