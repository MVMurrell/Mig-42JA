import { useState, useRef, useEffect } from "react";
import { Camera, X, Square, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { apiRequest } from "@/lib/queryClient.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface VideoCommentRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  onCommentSubmitted: () => void;
  onMainVideoControl?: (action: 'pause' | 'resume') => void;
}

export default function VideoCommentRecorder({ 
  isOpen, 
  onClose, 
  videoId, 
  onCommentSubmitted,
  onMainVideoControl
}: VideoCommentRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Maximum recording time: 30 seconds
  const MAX_RECORDING_TIME = 30;

  // Pause main video when recorder opens, resume when closed
  useEffect(() => {
    if (isOpen && onMainVideoControl) {
      console.log('🎬 VideoCommentRecorder: Opening - pausing main video');
      onMainVideoControl('pause');
    }
    
    // Cleanup function to handle component unmount or isOpen change
    return () => {
      if (isOpen && onMainVideoControl) {
        console.log('🎬 VideoCommentRecorder: Cleanup called');
      }
    };
  }, [isOpen, onMainVideoControl]);

  const submitVideoCommentMutation = useMutation({
    mutationFn: async (videoBlob: Blob) => {
      const formData = new FormData();
      formData.append('video', videoBlob, 'comment-video.webm');
      formData.append('videoId', videoId);
      
      // Use the actual video duration from the preview video element, or fall back to recording duration
      const actualDuration = duration > 0 ? duration : recordingDuration;
      formData.append('duration', actualDuration.toString());
      
      console.log('Submitting video comment with duration:', actualDuration);
      
      // Use fetch directly for FormData uploads
      const response = await fetch('/api/video-comments/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video comment submitted successfully",
        description: "Your comment is under review and will appear shortly. Check the comments section.",
      });
      
      console.log('🔄 Video comment submitted successfully, invalidating cache...');
      
      // Invalidate comments query to force refresh
      queryClient.invalidateQueries({
        queryKey: ['/api/videos', videoId, 'comments']
      });
      
      // Reset processing state before closing
      setProcessingVideo(false);
      
      console.log('🎬 VideoCommentRecorder: Successful submission - closing modal automatically');
      
      resetRecording();
      onCommentSubmitted();
      
      // Close the modal immediately after successful submission
      onClose();
    },
    onError: (error) => {
      console.error("Video comment submission error:", error);
      toast({
        title: "Upload failed",
        description: "Unable to submit video comment. Please try again.",
        variant: "destructive",
      });
      setProcessingVideo(false);
    }
  });

  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }
    
    return () => cleanup();
  }, [isOpen]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone access to record video comments.",
        variant: "destructive",
      });
      onClose();
    }
  };

  const cleanup = () => {
    console.log('🎬 VideoCommentRecorder: Cleanup called');
    
    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Stop any playing video and clean up URL
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
    }
    
    // Stop preview video
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.currentTime = 0;
      previewVideoRef.current.src = '';
    }
    
    // Clear all timers
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    
    setCameraReady(false);
    resetRecording();
  };

  const resetRecording = () => {
    setIsRecording(false);
    setRecordedVideo(null);
    
    // Clean up the recorded video URL to prevent background audio
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    
    setRecordingProgress(0);
    setProcessingVideo(false);
    setShowPreview(false);
    setRecordingDuration(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    recordedChunksRef.current = [];
    mediaRecorderRef.current = null;
    
    // Clear any running timers
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    
    recordedChunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    
    // Try WebM first, fallback to MP4
    const mimeTypes = [
      'video/webm; codecs="vp8,opus"',
      'video/webm; codecs="vp9,opus"',
      'video/webm',
      'video/mp4'
    ];
    
    let selectedMimeType = 'video/webm';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000 // 2.5 Mbps for 30s videos
    });
    
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('🎬 VideoCommentRecorder: Recording stopped, creating preview');
      
      const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
      setRecordedVideo(blob);
      const videoUrl = URL.createObjectURL(blob);
      setRecordedVideoUrl(videoUrl);
      
      // Stop camera stream to switch to preview mode
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      setIsRecording(false);
      setRecordingProgress(0);
      setShowPreview(true);
      
      // Calculate actual recording duration
      const actualDuration = Math.min(recordingProgress / 100 * MAX_RECORDING_TIME, MAX_RECORDING_TIME);
      setRecordingDuration(actualDuration);
      
      // Reset playback state for preview
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(true); // Video will auto-play with loop
      
      // Stop progress timer
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      
      console.log('🎬 VideoCommentRecorder: Preview setup complete, URL:', videoUrl, 'Duration:', actualDuration);
      console.log('🎬 VideoCommentRecorder: showPreview state:', true, 'recordedVideo exists:', !!blob);
      
      // Add delay to ensure state updates are processed
      setTimeout(() => {
        console.log('🎬 VideoCommentRecorder: Post-setup state check:');
        console.log('- showPreview:', showPreview);
        console.log('- recordedVideo:', !!recordedVideo);
        console.log('- recordedVideoUrl:', !!recordedVideoUrl);
        console.log('- isRecording:', isRecording);
        console.log('- processingVideo:', processingVideo);
      }, 100);
    };
    
    mediaRecorder.start(100); // Capture every 100ms
    setIsRecording(true);
    
    // Progress tracking
    progressTimer.current = setInterval(() => {
      setRecordingProgress(prev => {
        const newProgress = prev + (100 / (MAX_RECORDING_TIME * 1000)) * 100;
        return Math.min(newProgress, 100);
      });
    }, 100);
    
    // Auto-stop after 30 seconds
    recordingTimer.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_TIME * 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const submitVideoComment = () => {
    if (!recordedVideo) return;
    
    setProcessingVideo(true);
    setShowPreview(false);
    submitVideoCommentMutation.mutate(recordedVideo);
  };

  const retakeVideo = () => {
    console.log('🎬 VideoCommentRecorder: Retake button clicked - resetting state');
    
    // Stop any currently playing preview video
    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.currentTime = 0;
      previewVideoRef.current.src = '';
    }
    
    // Clean up recorded video URL
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    
    // Reset all recording state
    resetRecording();
    
    // Always reinitialize camera after retake to ensure proper camera feed
    console.log('🎬 VideoCommentRecorder: Reinitializing camera after retake');
    initializeCamera();
  };

  // Video playback controls
  const togglePlayback = () => {
    if (!previewVideoRef.current) return;
    
    if (isPlaying) {
      previewVideoRef.current.pause();
    } else {
      previewVideoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!previewVideoRef.current) return;
    setCurrentTime(previewVideoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!previewVideoRef.current) return;
    const videoDuration = previewVideoRef.current.duration;
    if (isFinite(videoDuration) && !isNaN(videoDuration)) {
      setDuration(videoDuration);
    } else {
      // Fallback to recorded duration if video metadata is invalid
      setDuration(recordingDuration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!previewVideoRef.current) return;
    const newTime = parseFloat(e.target.value);
    previewVideoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) {
      return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-white text-center">
            <div className="text-sm font-medium">
              {processingVideo ? 'Processing...' :
               recordedVideo ? 'Review Video' :
               isRecording ? 'Recording' : 'Video Comment'}
            </div>
            {isRecording && (
              <div className="text-xs opacity-75">
                {Math.floor(MAX_RECORDING_TIME - (recordingProgress * MAX_RECORDING_TIME / 100))}s remaining
              </div>
            )}
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="mt-4 bg-black/30 rounded-full h-1">
            <div 
              className="bg-red-500 h-full rounded-full transition-all duration-100"
              style={{ width: `${recordingProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Video Content */}
      <div className="flex-1 relative">
        {processingVideo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg font-medium">Processing Video Comment...</div>
              <div className="text-sm opacity-75">Checking content safety</div>
            </div>
          </div>
        ) : showPreview && recordedVideo && recordedVideoUrl ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={togglePlayback}>
            <video
              ref={previewVideoRef}
              src={recordedVideoUrl}
              className="max-w-full max-h-full object-contain cursor-pointer"
              playsInline
              autoPlay
              loop
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedMetadata}
              onDurationChange={handleLoadedMetadata}
              onPlay={() => {
                console.log('🎬 VideoCommentRecorder: Preview video started playing');
                setIsPlaying(true);
              }}
              onPause={() => {
                console.log('🎬 VideoCommentRecorder: Preview video paused');
                setIsPlaying(false);
              }}
              onError={(e) => {
                console.error('🎬 VideoCommentRecorder: Preview video error:', e);
              }}
            />

            
            {/* Custom Video Controls */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlayback}
                  className="flex-shrink-0 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  ) : (
                    <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
                  )}
                </button>
                
                <div className="flex-1 flex items-center space-x-2">
                  <span className="text-white text-xs font-mono">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                  />
                  <span className="text-white text-xs font-mono">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={() => {
                console.log('🎬 VideoCommentRecorder: Camera feed loaded');
              }}
            />
          </div>
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-20 left-4 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Controls - Fixed at bottom with proper spacing */}
      <div className="flex-shrink-0 p-6 pb-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        {recordedVideo ? (
          <div className="flex justify-center space-x-4 mb-4">
            <Button
              onClick={retakeVideo}
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              Retake
            </Button>
            <Button
              onClick={submitVideoComment}
              disabled={processingVideo}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Comment
            </Button>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            {cameraReady && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-colors ${
                  isRecording ? 'bg-red-600' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 text-white" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </button>
            )}
          </div>
        )}
        
        <div className="text-center">
          <p className="text-white text-sm opacity-75">
            Maximum 30 seconds • Video comments are moderated
          </p>
        </div>
      </div>
    </div>
  );
}