import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Camera, X, Square, Send, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast.ts";

interface VideoMessageRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  onMessageSubmitted: () => void;
}

export default function VideoMessageRecorder({ 
  isOpen, 
  onClose, 
  threadId, 
  onMessageSubmitted 
}: VideoMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Maximum recording time: 30 seconds
  const MAX_RECORDING_TIME = 30;

  const submitVideoMessageMutation = useMutation({
    mutationFn: async (videoBlob: Blob) => {
      // Use direct upload (same successful architecture as video comments)
      console.log(`🎬 THREAD VIDEO MESSAGE: Starting direct upload (${videoBlob.size} bytes)`);
      
      const formData = new FormData();
      // Create a proper File object with correct MIME type
      const videoFile = new File([videoBlob], 'thread-message.webm', { 
        type: 'video/webm' 
      });
      formData.append('video', videoFile);
      formData.append('threadId', threadId);
      formData.append('duration', recordingDuration.toString());
      
      console.log(`🎬 THREAD VIDEO MESSAGE: Uploading to consolidated endpoint...`);
      
      const response = await fetch('/api/thread-video-messages/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔥 THREAD VIDEO MESSAGE ERROR: ${response.status}: ${errorText}`);
        throw new Error(`Failed to upload thread video message: ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`🎬 THREAD VIDEO MESSAGE: Upload completed successfully with result:`, result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Video message uploaded successfully",
        description: "Your message is being processed and will appear shortly.",
      });
      
      // Start polling for status updates
      if (data.messageId) {
        startStatusPolling(data.messageId);
      }
      
      resetRecording();
      onMessageSubmitted();
      onClose(); // Close the recorder immediately after successful upload
    },
    onError: (error) => {
      console.error("Video message submission error:", error);
      toast({
        title: "Upload failed",
        description: "Unable to send video message. Please try again.",
        variant: "destructive",
      });
      setProcessingVideo(false);
    }
  });

  // Status polling function
  const startStatusPolling = (messageId: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/thread-messages/${messageId}/status`);
        if (response.ok) {
          const statusData = await response.json();
          
          if (statusData.status === 'approved' || statusData.status === 'flagged') {
            clearInterval(pollInterval);
            // Refresh messages to show the updated status
            onMessageSubmitted();
          }
        } else if (response.status === 404) {
          // Message was deleted or doesn't exist - stop polling
          console.log(`Message ${messageId} no longer exists, stopping status polling`);
          clearInterval(pollInterval);
          onMessageSubmitted(); // Refresh to sync the UI
        }
      } catch (error) {
        console.error('Error polling status:', error);
        // On network errors, continue polling but don't spam the console
      }
    }, 2000); // Poll every 2 seconds

    // Clear interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 300000);
  };

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
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone access to record video messages.",
        variant: "destructive",
      });
    }
  };

  const cleanup = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    
    resetRecording();
    setCameraReady(false);
  };

  const resetRecording = () => {
    setIsRecording(false);
    setRecordedVideo(null);
    setShowPreview(false);
    setRecordingDuration(0);
    setDuration(0);
    setProcessingVideo(false);
    recordedChunksRef.current = [];
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
  };

  const startRecording = async () => {
    if (!videoRef.current?.srcObject) return;
    
    recordedChunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    
    // Try different MIME types for better compatibility
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus', 
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];
    
    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    if (!selectedMimeType) {
      toast({
        title: "Recording not supported",
        description: "Your browser doesn't support video recording.",
        variant: "destructive",
      });
      return;
    }
    
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: selectedMimeType,
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    });
    
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: selectedMimeType });
      const url = URL.createObjectURL(blob);
      
      console.log('🎬 VideoMessageRecorder: Recording stopped, creating blob URL:', url);
      console.log('🎬 VideoMessageRecorder: Blob size:', blob.size, 'bytes');
      
      // Stop camera stream to switch to preview mode (like VideoCommentRecorder)
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        console.log('🎬 VideoMessageRecorder: Camera stream stopped');
      }
      
      setRecordedVideo(blob);
      setRecordedVideoUrl(url);
      setIsRecording(false);
      setShowPreview(true);
      setDuration(recordingDuration);
      
      console.log('🎬 VideoMessageRecorder: State updated - showPreview: true, isRecording: false');
      
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
    };
    
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingDuration(0);
    
    // Duration tracking
    durationTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 0.1);
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
    
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  };

  const submitVideoMessage = () => {
    if (!recordedVideo) return;
    
    setProcessingVideo(true);
    setShowPreview(false);
    submitVideoMessageMutation.mutate(recordedVideo);
  };

  const retakeVideo = () => {
    console.log('🎬 VideoMessageRecorder: Retake button clicked - resetting state');
    
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
    console.log('🎬 VideoMessageRecorder: Reinitializing camera after retake');
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
               isRecording ? 'Recording' : 'Video Message'}
            </div>
            {isRecording && (
              <div className="text-xs opacity-75">
                {Math.floor(MAX_RECORDING_TIME - recordingDuration)}s remaining
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
              style={{ width: `${(recordingDuration / MAX_RECORDING_TIME) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Video Content */}
      <div className="flex-1 relative">
        {(() => {
          console.log('🎬 VideoMessageRecorder: Render decision - processingVideo:', processingVideo, 'showPreview:', showPreview, 'recordedVideo:', !!recordedVideo, 'recordedVideoUrl:', !!recordedVideoUrl);
          return null;
        })()}
        {processingVideo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg font-medium">Processing Video Message...</div>
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
                console.log('🎬 VideoMessageRecorder: Preview video started playing');
                setIsPlaying(true);
              }}
              onPause={() => {
                console.log('🎬 VideoMessageRecorder: Preview video paused');
                setIsPlaying(false);
              }}
              onError={(e) => {
                console.error('🎬 VideoMessageRecorder: Preview video error:', e);
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
          <div className="w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay
              muted
              playsInline
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
              onClick={submitVideoMessage}
              disabled={processingVideo}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
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
            Maximum 30 seconds • Video messages are moderated
          </p>
        </div>
      </div>
    </div>
  );
}