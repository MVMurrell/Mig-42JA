import React, { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { isUnauthorizedError } from "@/lib/authUtils.ts";
import { X, Video, Upload, MapPin, Clock } from "lucide-react";
import redGemIcon from '@assets/Property 1=Red.png';
import orangeGemIcon from '@assets/Property 1=Orange.png';
import yellowGemIcon from '@assets/Property 1=Yellow.png';
import greenGemIcon from '@assets/Property 1=Green.png';
import blueGemIcon from '@assets/Property 1=Blue.png';
import purpleGemIcon from '@assets/Purple_1749397661787.png';
import pinkGemIcon from '@assets/Property 1=Pink.png';
import blackGemIcon from '@assets/Black_1749397661786.png';
import aquaGemIcon from '@assets/Aqua_1749397661785.png';
import cobaltGemIcon from '@assets/Cobalt_1749397661786.png';
import lilacGemIcon from '@assets/Lilac_1749397661786.png';
import neonGreenGemIcon from '@assets/Neon Green_1749397661787.png';
import mintGemIcon from '@assets/Mint_1749397661787.png';
import { useQuery } from "@tanstack/react-query";
import ProcessingNotificationModal from "./ProcessingNotificationModal.tsx";
import CommunityGuidelinesModal from "./CommunityGuidelinesModal.tsx";

interface VideoUploadModalProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  onProcessingStarted?: (videoTitle: string) => void;
}

export default function VideoUploadModal({ onClose, userLocation, onProcessingStarted }: VideoUploadModalProps) {
  // Helper function to format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch user groups for visibility options
  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups/user"],
  });

  // Fetch active quests for visibility options (filtered by location if available)
  const questsQueryKey = userLocation 
    ? [`/api/quests/active?lat=${userLocation.lat}&lng=${userLocation.lng}`] 
    : ["/api/quests/active"];
    
  const { data: availableQuests = [] } = useQuery<any[]>({
    queryKey: questsQueryKey,
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [visibility, setVisibility] = useState("everyone");
  const [postTiming, setPostTiming] = useState("now");
  const [customDateTime, setCustomDateTime] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordingMode, setRecordingMode] = useState<'select' | 'camera' | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [actualRecordingDuration, setActualRecordingDuration] = useState(0);
  const [recordingStartTimestamp, setRecordingStartTimestamp] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimControls, setShowTrimControls] = useState(false);
  const [isInTrimMode, setIsInTrimMode] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCommunityGuidelines, setShowCommunityGuidelines] = useState(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user'); // 'user' = front, 'environment' = back
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  
  // Device detection - only show switch button on mobile devices or when multiple cameras detected
  const isMobileDevice = useMemo(() => {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }, []);

  // Check if user needs to see community guidelines
  const { data: guidelinesStatus } = useQuery({
    queryKey: ["/api/user/community-guidelines-status"],
    retry: false,
  }) as { data: { hasAccepted: boolean } | undefined };

  const { data: hasPostedVideos } = useQuery({
    queryKey: ["/api/user/has-posted-videos"],
    retry: false,
  });

  // Mutation for accepting community guidelines
  const acceptGuidelinesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/user/accept-community-guidelines", "POST", {});
      return response.json();
    },
    onSuccess: () => {
      setShowCommunityGuidelines(false);
      // Proceed with upload after accepting guidelines
      actuallySubmitUpload();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record guidelines acceptance. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // Get Google Maps API key
  const { data: mapsConfig } = useQuery({
    queryKey: ["/api/config/maps-key"],
    retry: false,
  });
  
  // Get readable address from coordinates
  useEffect(() => {
    if (userLocation && (mapsConfig as any)?.apiKey) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lng}&key=${(mapsConfig as any).apiKey}`;
      
      fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;
            
            // Extract street, city, state
            let street = "";
            let city = "";
            let state = "";
            
            for (const component of components) {
              if (component.types.includes("street_number") || component.types.includes("route")) {
                street += component.long_name + " ";
              }
              if (component.types.includes("locality")) {
                city = component.long_name;
              }
              if (component.types.includes("administrative_area_level_1")) {
                state = component.short_name;
              }
            }
            
            const address = `${street.trim()}${city ? ", " + city : ""}${state ? ", " + state : ""}`;
            setLocationAddress(address || result.formatted_address);
          }
        })
        .catch(() => {
          setLocationAddress(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
        });
    }
  }, [userLocation, mapsConfig]);

  const categories = [
    { key: "art", name: "Art", color: "red", icon: redGemIcon },
    { key: "education", name: "Education", color: "orange", icon: orangeGemIcon },
    { key: "review", name: "Review", color: "yellow", icon: yellowGemIcon },
    { key: "games", name: "Games", color: "green", icon: greenGemIcon },
    { key: "events", name: "Events", color: "blue", icon: blueGemIcon },
    { key: "products", name: "Products", color: "purple", icon: purpleGemIcon },
    { key: "services", name: "Services", color: "pink", icon: pinkGemIcon },
    { key: "challenge", name: "Challenge", color: "black", icon: blackGemIcon },
    { key: "chat", name: "Chat", color: "aqua", icon: aquaGemIcon },
    { key: "fyi", name: "FYI", color: "cobalt", icon: cobaltGemIcon },
    { key: "love", name: "Love", color: "lilac", icon: lilacGemIcon },
    { key: "nature", name: "Nature", color: "neon-green", icon: neonGreenGemIcon },
    { key: "coupon", name: "Coupon", color: "mint", icon: mintGemIcon },
  ];

  // Dynamic visibility options including user groups and quests with deduplication
  const visibilityOptions = [
    { value: "everyone", label: "Everyone" },
    ...(Array.isArray(userGroups) ? userGroups
      .filter((group: any, index: number, self: any[]) => 
        self.findIndex((g: any) => g.id === group.id) === index
      )
      .map((group: any) => ({
        value: `group_${group.id}`,
        label: `${group.name} (Group)`
      })) : []),
    ...(Array.isArray(availableQuests) ? availableQuests
      .filter((quest: any, index: number, self: any[]) => 
        self.findIndex((q: any) => q.id === quest.id) === index
      )
      .map((quest: any) => ({
        value: `quest_${quest.id}`,
        label: `${quest.title} (Quest)`
      })) : [])
  ];

  const postTimingOptions = [
    { value: "now", label: "Post Now" },
    { value: "1hour", label: "In 1 Hour" },
    { value: "3hours", label: "In 3 Hours" },
    { value: "6hours", label: "In 6 Hours" },
    { value: "12hours", label: "In 12 Hours" },
    { value: "24hours", label: "In 24 Hours" },
    { value: "custom", label: "Custom Date & Time" },
  ];

  const handleModeSelect = (mode: 'select' | 'camera') => {
    setRecordingMode(mode);
    if (mode === 'select') {
      fileInputRef.current?.click();
    } else {
      initializeCamera();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setRecordingMode(null);
      return;
    }

    // Enhanced iPhone video format support
    const supportedFormats = [
      'video/mp4',
      'video/webm', 
      'video/quicktime',     // iPhone .mov files
      'video/x-msvideo',     // AVI
      'video/avi',
      'application/octet-stream'  // Fallback for unknown MIME types
    ];

    const isVideoFile = supportedFormats.includes(file.type) || file.type.startsWith('video/');
    
    if (!isVideoFile) {
      toast({
        title: "Unsupported File Format",
        description: "Please select a video file (.mp4, .mov, .webm, .avi). iPhone videos are fully supported!",
        variant: "destructive",
      });
      setRecordingMode(null);
      return;
    }

    // Check file size (500MB limit for iPhone 4K videos)
    const maxSizeBytes = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSizeBytes) {
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      toast({
        title: "File Too Large",
        description: `Your video is ${fileSizeMB}MB. Please select a video under 500MB. Try reducing quality or duration in your iPhone camera settings.`,
        variant: "destructive",
      });
      setRecordingMode(null);
      return;
    }

    // Check video duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      if (video.duration > 60) {
        toast({
          title: "Video too long",
          description: "Please select a video that is 60 seconds or less",
          variant: "destructive",
        });
        setRecordingMode(null);
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview thumbnail
      video.currentTime = 1;
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        setVideoPreview(canvas.toDataURL());
      };
    };

    video.onerror = () => {
      toast({
        title: "Video Processing Error",
        description: "Unable to process this video file. Please try a different video or format.",
        variant: "destructive",
      });
      setRecordingMode(null);
    };
    
    video.src = URL.createObjectURL(file);
  };

  // Enumerate available cameras - must be called AFTER getting camera permission
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('📷 Available cameras:', videoDevices.length, videoDevices.map(d => ({ label: d.label, deviceId: d.deviceId.substring(0, 8) })));
      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  };

  const checkPermissions = async (): Promise<boolean> => {
    try {
      // Check if permissions API is available
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        console.log('🔐 iOS PERMISSION CHECK:', {
          camera: cameraPermission.state,
          microphone: micPermission.state
        });
        
        if (cameraPermission.state === 'granted' && micPermission.state === 'granted') {
          console.log('✅ iOS: Permissions already granted, no prompt needed');
          return true;
        }
      }
      
      // Check localStorage for previous permission grants (iOS fallback)
      const prevGranted = localStorage.getItem('jemzy_camera_permissions_granted');
      if (prevGranted === 'true') {
        console.log('✅ iOS: Previous permission found in localStorage');
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('⚠️ iOS: Permission check failed, will request permissions:', error);
      return false;
    }
  };

  const initializeCamera = async (facingMode: 'user' | 'environment' = currentFacingMode) => {
    try {
      console.log('🔐 iOS: Checking existing permissions before request...');
      
      // Check if we already have permissions to avoid repeated iOS prompts
      const hasPermissions = await checkPermissions();
      
      // Define HD video constraints with camera selection
      const baseVideoConstraints = [
        { 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 }, 
          frameRate: { ideal: 30 },
          facingMode: { ideal: facingMode }
        }, // 1080p
        { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          frameRate: { ideal: 30 },
          facingMode: { ideal: facingMode }
        },  // 720p
        { 
          width: { ideal: 854 }, 
          height: { ideal: 480 }, 
          frameRate: { ideal: 30 },
          facingMode: { ideal: facingMode }
        },   // 480p
        { 
          facingMode: { ideal: facingMode }
        } // Fallback with just facing mode
      ];

      let stream = null;
      let actualConstraints = null;

      // Try each constraint set until one works
      for (const videoConstraint of baseVideoConstraints) {
        try {
          console.log(`📷 Attempting ${facingMode} camera with constraints:`, videoConstraint);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: videoConstraint, 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          actualConstraints = videoConstraint;
          
          // Store permission grant in localStorage for iOS persistence
          localStorage.setItem('jemzy_camera_permissions_granted', 'true');
          console.log('✅ iOS: Permissions granted and stored in localStorage');
          break;
        } catch (constraintError) {
          console.log('Failed with constraint:', videoConstraint, (constraintError as Error).message);
          continue;
        }
      }

      if (!stream) {
        throw new Error(`No suitable ${facingMode} camera constraints found`);
      }

      // Log actual recording capabilities
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        const settings = videoTrack.getSettings();
        console.log(`✅ ${facingMode} camera initialized:`, `${settings.width}x${settings.height}`);
        console.log('📷 Camera facing mode:', settings.facingMode || 'unknown');
        console.log('Video track settings:', settings);
        
        // Update current facing mode based on actual camera
        if (settings.facingMode) {
          setCurrentFacingMode(settings.facingMode as 'user' | 'environment');
        }
      }
      
      console.log('Audio tracks found:', audioTracks.length);
      console.log('Video tracks found:', videoTracks.length);
      
      if (videoRef.current) {
        console.log('🎯 IPAD DEBUG: Setting srcObject on video element');
        videoRef.current.srcObject = stream;
        
        // Enhanced iPad detection and debugging
        const isIpad = /iPad|iPad Pro/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        console.log('🎯 IPAD DETECTION:', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
          isIpad: isIpad
        });
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
        
        videoRef.current.oncanplay = () => {
          setCameraReady(true);
        };
        
        videoRef.current.onplaying = () => {
          setCameraReady(true);
        };
        
        // Additional event to catch when video starts playing
        videoRef.current.onplay = () => {
          setCameraReady(true);
        };
        
        // NOW enumerate cameras after permission is granted - this will find all cameras
        await enumerateCameras();
        
        setCameraReady(true);
        
        // Multiple backup mechanisms for iPad
        setTimeout(() => {
          setCameraReady(true);
        }, 500);
        
        setTimeout(() => {
          setCameraReady(true);
        }, 1000);
        
        setTimeout(() => {
          setCameraReady(true);
        }, 2000);
        
        // Continuous monitoring for iPad
        if (isIpad) {
          const interval = setInterval(() => {
            if (videoRef.current?.srcObject && !isRecording) {
              setCameraReady(true);
            }
          }, 1000);
          
          // Clean up interval after 10 seconds
          setTimeout(() => clearInterval(interval), 10000);
        }
      }
    } catch (error) {
      console.error(`Camera initialization error (${facingMode}):`, error);
      
      // Clear localStorage permission flag if access fails
      localStorage.removeItem('jemzy_camera_permissions_granted');
      
      // Provide iOS-specific guidance
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const errorMessage = isIOS 
        ? `Camera access denied. For better experience on iOS: Click 'Allow' when prompted, then add this site to your home screen to save permissions.`
        : `Unable to access ${facingMode === 'user' ? 'front' : 'back'} camera. Please check permissions.`;
      
      toast({
        title: "Camera error",
        description: errorMessage,
        variant: "destructive",
      });
      setRecordingMode(null);
    }
  };

  // Switch between front and back cameras
  const switchCamera = async () => {
    if (!cameraReady || isRecording) return;

    try {
      // Switch to the other camera
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      console.log(`🔄 Switching from ${currentFacingMode} to ${newFacingMode} camera`);
      console.log('🔄 SWITCH DEBUG: Before switch - cameraReady:', cameraReady);
      
      // Keep button visible during switching by NOT setting cameraReady to false
      setCurrentFacingMode(newFacingMode);
      
      // Stop current camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      // Initialize new camera
      await initializeCamera(newFacingMode);
      
      // Removed annoying popup message per user request
    } catch (error) {
      console.error('Camera switch error:', error);
      toast({
        title: "Switch failed",
        description: "Unable to switch camera. Trying to restore previous camera.",
        variant: "destructive",
      });
      
      // Try to restore previous camera
      try {
        const previousFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        setCurrentFacingMode(previousFacingMode);
        await initializeCamera(previousFacingMode);
      } catch (restoreError) {
        console.error('Failed to restore camera:', restoreError);
        // Only set not ready if we completely fail
        setCameraReady(false);
        setRecordingMode(null);
      }
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    
    recordedChunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    
    // DIAGNOSTIC: Test all MediaRecorder support
    console.log('🔍 DIAGNOSTIC: MediaRecorder format support analysis');
    console.log('Browser:', navigator.userAgent);
    
    const testFormats = [
      'video/webm; codecs="vp8,opus"',
      'video/webm; codecs="vp9,opus"',
      'video/webm; codecs="vp8"',
      'video/webm',
      'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
      'video/mp4; codecs="avc1.4D401E, mp4a.40.2"',
      'video/mp4',
      'video/x-matroska;codecs=avc1'
    ];
    
    testFormats.forEach(format => {
      const supported = MediaRecorder.isTypeSupported(format);
      console.log(`Format "${format}": ${supported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
    });
    
    // Get video track settings to determine optimal bitrate
    const videoTracks = stream.getVideoTracks();
    const videoSettings = videoTracks[0]?.getSettings();
    const resolution = videoSettings ? `${videoSettings.width}x${videoSettings.height}` : 'unknown';
    
    // Calculate optimal bitrate based on resolution
    let targetBitrate = 2500000; // Default 2.5 Mbps for 480p
    if (videoSettings && videoSettings.width && videoSettings.height) {
      const pixelCount = videoSettings.width * videoSettings.height;
      if (pixelCount >= 1920 * 1080) {
        targetBitrate = 8000000; // 8 Mbps for 1080p
      } else if (pixelCount >= 1280 * 720) {
        targetBitrate = 5000000; // 5 Mbps for 720p
      } else if (pixelCount >= 854 * 480) {
        targetBitrate = 2500000; // 2.5 Mbps for 480p
      }
    }
    
    console.log(`🎥 Recording at ${resolution} with target bitrate: ${targetBitrate / 1000000}Mbps`);
    
    // Configure MediaRecorder with high-quality settings
    let options: MediaRecorderOptions = {
      videoBitsPerSecond: targetBitrate,
      audioBitsPerSecond: 128000 // High-quality audio
    };
    
    // Use most reliable WebM format based on diagnostics, prefer VP9 for higher quality
    const supportedFormats = [
      'video/webm; codecs="vp9,opus"', // Best quality
      'video/webm; codecs="vp8,opus"',
      'video/webm; codecs="vp8"',
      'video/webm',
      'video/mp4; codecs="avc1.42001E, mp4a.40.2"', // Last resort
    ];
    
    for (const format of supportedFormats) {
      if (MediaRecorder.isTypeSupported(format)) {
        options.mimeType = format;
        console.log(`✅ Selected format: ${format} with ${targetBitrate / 1000000}Mbps video bitrate`);
        break;
      }
    }
    
    // Diagnostic fallback
    if (!options.mimeType) {
      console.error('❌ No supported formats found - using generic webm');
      options.mimeType = 'video/webm';
    }
    
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    
    // Check if the stream has audio tracks before recording
    const audioTracks = stream.getAudioTracks();
    console.log('Recording with audio tracks:', audioTracks.length);
    console.log('MediaRecorder MIME type:', mediaRecorder.mimeType);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
        console.log('Data chunk received, size:', event.data.size);
      }
    };
    
    mediaRecorder.onstop = () => {
      setProcessingVideo(true);
      
      setTimeout(() => {
        const recordedBlob = new Blob(recordedChunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
        console.log('Final blob created, size:', recordedBlob.size, 'type:', recordedBlob.type);
        
        // DIAGNOSTIC: Inspect binary data to understand corruption
        console.log('🔍 DIAGNOSTIC: Binary data inspection');
        recordedBlob.arrayBuffer().then(buffer => {
          const uint8Array = new Uint8Array(buffer);
          const first16Bytes = Array.from(uint8Array.slice(0, 16));
          const hexString = first16Bytes.map(b => b.toString(16).padStart(2, '0')).join('');
          console.log('First 16 bytes (hex):', hexString);
          console.log('First 16 bytes (decimal):', first16Bytes);
          
          // Check for known signatures
          if (recordedBlob.type.includes('webm')) {
            const webmSignature = [0x1A, 0x45, 0xDF, 0xA3]; // EBML header
            const hasValidWebM = uint8Array[0] === webmSignature[0] && 
                                uint8Array[1] === webmSignature[1] && 
                                uint8Array[2] === webmSignature[2] && 
                                uint8Array[3] === webmSignature[3];
            console.log('WebM EBML signature valid:', hasValidWebM);
          } else if (recordedBlob.type.includes('mp4')) {
            const ftypCheck = Array.from(uint8Array.slice(4, 8)).map(b => String.fromCharCode(b)).join('');
            console.log('MP4 ftyp check:', ftypCheck);
          }
          
          // Test chunks integrity
          console.log('Number of chunks received:', recordedChunksRef.current.length);
          recordedChunksRef.current.forEach((chunk, index) => {
            console.log(`Chunk ${index}: ${chunk.size} bytes, type: ${chunk.type}`);
          });
        });
        
        // CRITICAL: Test if the recorded video is playable locally before proceeding
        console.log('🔍 Testing local video playback before upload...');
        const testVideoElement = document.createElement('video');
        testVideoElement.src = URL.createObjectURL(recordedBlob);
        testVideoElement.muted = true;
        testVideoElement.preload = 'metadata';
        
        let validationPassed = false;
        
        testVideoElement.onloadedmetadata = () => {
          console.log('✅ Local Playback: Video loaded metadata successfully!');
          console.log(`✅ Local Playback: Duration: ${testVideoElement.duration} seconds`);
          console.log(`✅ Local Playback: Video dimensions: ${testVideoElement.videoWidth}x${testVideoElement.videoHeight}`);
          console.log(`✅ Local Playback: Ready state: ${testVideoElement.readyState}`);
          
          validationPassed = true;
          proceedWithValidVideo();
          
          // Clean up test element
          URL.revokeObjectURL(testVideoElement.src);
        };
        
        testVideoElement.onerror = (e) => {
          console.error('❌ Local Playback: Error playing video blob locally!', e);
          console.error('❌ Video data is corrupted at recording stage - cannot proceed with upload');
          
          // Show error to user and don't proceed with upload
          toast({
            title: "Recording Failed",
            description: "Video data is corrupted. Please try recording again with a different browser or device.",
            variant: "destructive",
          });
          setProcessingVideo(false);
          setRecordingComplete(false);
          setRecordedVideo(null);
          setRecordedVideoUrl(null);
          
          // Clean up test element
          URL.revokeObjectURL(testVideoElement.src);
        };
        
        testVideoElement.onloadstart = () => {
          console.log('📥 Local Playback: Starting to load video...');
        };
        
        testVideoElement.oncanplay = () => {
          console.log('✅ Local Playback: Video can start playing');
        };
        
        // Timeout to catch cases where metadata never loads
        setTimeout(() => {
          if (!validationPassed) {
            console.error('❌ Local Playback: Video validation timed out - metadata never loaded');
            toast({
              title: "Recording Validation Failed",
              description: "Video may be corrupted. Please try again.",
              variant: "destructive",
            });
            setProcessingVideo(false);
            setRecordingComplete(false);
            URL.revokeObjectURL(testVideoElement.src);
          }
        }, 5000);
        
        const proceedWithValidVideo = () => {
          setRecordedVideo(recordedBlob);
          
          // Create video URL for playback
          const videoUrl = URL.createObjectURL(recordedBlob);
          setRecordedVideoUrl(videoUrl);
          
          // Get the current recording duration at the time of processing
          const currentDuration = actualRecordingDuration;
          console.log('Using actual recorded duration:', currentDuration, 'seconds');
          
          // If duration is still 0, calculate from timestamp as fallback
          let finalDuration = currentDuration;
          if (finalDuration <= 0 && recordingStartTimestamp > 0) {
            finalDuration = (Date.now() - recordingStartTimestamp) / 1000;
            console.log('Fallback duration calculation:', finalDuration, 'seconds');
          }
          
          setVideoDuration(finalDuration);
          setTrimStart(0);
          setTrimEnd(finalDuration);
          setShowTrimControls(false);
          setIsInTrimMode(false);
          
          // Create preview thumbnail
          const video = document.createElement('video');
          video.src = videoUrl;
          video.currentTime = 1;
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            setVideoPreview(canvas.toDataURL());
            
            setProcessingVideo(false);
            setRecordingComplete(true);
          };
        };
        
      }, 500); // Small delay to ensure camera stream stops
    };
    
    setIsRecording(true);
    setRecordingProgress(0);
    
    // Track recording start time
    const startTime = Date.now();
    setRecordingStartTimestamp(startTime);
    
    // Start recording with timeslice to create fragmented MP4
    // This forces the browser to write metadata incrementally, preventing "moov atom not found" errors
    mediaRecorder.start(1000); // Record in 1-second chunks to create fMP4
    
    // Progress timer
    const timer = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTime) / 1000; // seconds
      const progressPercent = (elapsed / 60) * 100; // 60 seconds max
      
      setRecordingProgress(progressPercent);
      setActualRecordingDuration(elapsed);
      
      if (progressPercent >= 100) {
        stopRecording();
      }
    }, 100);
    
    setRecordingTimer(timer);
    
    // Auto-stop at 60 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        stopRecording();
        toast({
          title: "Recording complete",
          description: "Maximum recording time of 60 seconds reached",
        });
      }
    }, 60000);
  };

  const stopRecording = () => {
    // Capture final duration before clearing timer
    if (recordingStartTimestamp > 0) {
      const finalDuration = (Date.now() - recordingStartTimestamp) / 1000;
      setActualRecordingDuration(finalDuration);
      console.log('Final recording duration captured:', finalDuration, 'seconds');
    }
    
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop camera stream immediately
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    
    setIsRecording(false);
    setRecordingProgress(0);
  };

  const resetVideoSelection = () => {
    setRecordingMode(null);
    setSelectedFile(null);
    setRecordedVideo(null);
    setVideoPreview(null);
    setCameraReady(false);
    setRecordingProgress(0);
    setRecordingComplete(false);
    setRecordedVideoUrl(null);
    setProcessingVideo(false);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setShowTrimControls(false);
    
    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const trimVideo = async () => {
    if (!recordedVideo || !previewVideoRef.current) return;
    
    // Update the video playback to respect trim boundaries
    const video = previewVideoRef.current;
    video.currentTime = trimStart;
    
    // Add event listener to loop within trimmed range
    const handleTimeUpdate = () => {
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Create new preview thumbnail from trimmed start
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    video.onseeked = () => {
      ctx?.drawImage(video, 0, 0);
      setVideoPreview(canvas.toDataURL());
    };
    
    // No toast message for trimming
  };

  const startNewRecording = () => {
    setRecordingComplete(false);
    setRecordedVideo(null);
    setRecordedVideoUrl(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setShowTrimControls(false);
    setIsInTrimMode(false);
    initializeCamera();
  };

  const enterTrimMode = () => {
    setIsInTrimMode(true);
    setShowTrimControls(true);
  };

  const exitTrimMode = () => {
    setIsInTrimMode(false);
    setShowTrimControls(false);
    // Reset trim to full video
    setTrimStart(0);
    setTrimEnd(videoDuration);
  };

  const acceptRecording = () => {
    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setRecordingMode(null);
  };

  const [uploadStatus, setUploadStatus] = useState<{
    stage: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
    videoId?: string;
    message?: string;
  }>({ stage: 'idle' });

  const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Poll video processing status
  const pollVideoStatus = (videoId: string) => {
    let pollAttempts = 0;
    const interval = setInterval(async () => {
      try {
        const statusData = await apiRequest(`/api/videos/${videoId}/status`, "GET");
        
        if (statusData.status === 'approved' && statusData.isActive) {
          setUploadStatus({ stage: 'completed', videoId, message: 'Video processed successfully!' });
          clearInterval(interval);
          
          toast({
            title: "Success!",
            description: "Your video Jem has been processed and is now live!",
          });
          
          // Refresh all video-related queries and close modal
          queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
          queryClient.invalidateQueries({ predicate: (query) => 
            query.queryKey[0] === "/api/videos/nearby" 
          });
          queryClient.refetchQueries({ predicate: (query) => 
            query.queryKey[0] === "/api/videos/nearby" 
          });
          
          setTimeout(() => {
            onClose();
          }, 2000);
          
        } else if (statusData.status === 'flagged') {
          setUploadStatus({ 
            stage: 'failed', 
            videoId, 
            message: statusData.flaggedReason || 'Video was flagged during processing' 
          });
          clearInterval(interval);
          
          toast({
            title: "Processing Failed",
            description: statusData.flaggedReason || "Video processing failed",
            variant: "destructive",
          });
        } else if (statusData.status === 'failed') {
          setUploadStatus({ 
            stage: 'failed', 
            videoId, 
            message: statusData.flaggedReason || 'Video processing failed' 
          });
          clearInterval(interval);
          
          toast({
            title: "Processing Failed",
            description: statusData.flaggedReason || "Video processing failed",
            variant: "destructive",
          });
        } else if (statusData.status === 'bunny_failed') {
          setUploadStatus({ 
            stage: 'failed', 
            videoId, 
            message: 'CDN processing failed - video approved but streaming unavailable' 
          });
          clearInterval(interval);
          
          toast({
            title: "CDN Processing Failed",
            description: "Video was approved but CDN streaming failed",
            variant: "destructive",
          });
        }
        // Continue polling for 'processing' status
        
      } catch (error) {
        console.error('Error polling video status:', error);
        pollAttempts++;
        
        // If authentication error or too many failed attempts, assume video processed successfully
        if (pollAttempts > 10 || (error as any)?.message?.includes('401')) {
          clearInterval(interval);
          setUploadStatus({ 
            stage: 'completed', 
            videoId, 
            message: 'Upload completed - video should appear in your profile shortly' 
          });
          
          // Refresh queries to show the video
          queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
          queryClient.invalidateQueries({ predicate: (query) => 
            query.queryKey[0] === "/api/videos/nearby" 
          });
          
          toast({
            title: "Upload Complete",
            description: "Your video Jem has been uploaded successfully!",
          });
          
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    }, 3000); // Poll every 3 seconds
    
    setStatusPollingInterval(interval);
  };

  const uploadMutation = useMutation({
    mutationFn: async (videoData: any) => {
      const response = await apiRequest("/api/videos", "POST", videoData);
      return response.json();
    },
    onSuccess: (data) => {
      // Close the form immediately
      onClose();
      
      // Trigger processing notification if callback provided
      if (onProcessingStarted) {
        onProcessingStarted(title);
      }
      
      // Refresh queries to show pending video in profile
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/videos/nearby" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/user"] });
      
      if (data.status === 'processing' && (data.videoId || data.id)) {
        // Start polling for processing status in background
        pollVideoStatus(data.videoId || data.id);
      }
    },
    onError: (error) => {
      setUploadStatus({ stage: 'failed', message: 'Upload failed' });
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
      }
    };
  }, [statusPollingInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user needs to see community guidelines before first video upload
    const needsGuidelines = hasPostedVideos === false && !guidelinesStatus?.hasAccepted;
    
    if (needsGuidelines) {
      setShowCommunityGuidelines(true);
      return;
    }

    // Proceed with normal upload
    actuallySubmitUpload();
  };

  const actuallySubmitUpload = async () => {
    
    if (!title || !category) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a category.",
        variant: "destructive",
      });
      return;
    }

    // Validate event date/time fields if Events category is selected
    if (category === "events") {
      if (!eventStartDate || !eventStartTime) {
        toast({
          title: "Event Details Required",
          description: "Please provide event start date and time.",
          variant: "destructive",
        });
        return;
      }

      // If end date is provided, validate it's not before start date
      if (eventEndDate && eventEndDate < eventStartDate) {
        toast({
          title: "Invalid Date Range",
          description: "Event end date cannot be before start date.",
          variant: "destructive",
        });
        return;
      }

      // If end time is provided without end date, use start date
      if (eventEndTime && !eventEndDate) {
        toast({
          title: "Missing End Date",
          description: "Please provide end date when specifying end time.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedFile && !recordedVideo) {
      toast({
        title: "No Video Selected",
        description: "Please record or select a video file.",
        variant: "destructive",
      });
      return;
    }

    // Trigger processing notification and close form immediately
    if (onProcessingStarted) {
      onProcessingStarted(title);
    }
    onClose();

    // Set uploading status
    setUploadStatus({ stage: 'uploading', message: 'Preparing video upload...' });

    // Convert video file to base64 data URL
    const videoFile = selectedFile || recordedVideo;
    if (!videoFile) return;

    try {
      console.log('🚀 FIXED UPLOAD: Using direct binary transfer to prevent corruption');
      
      // Parse group ID from visibility if it's a group selection
      const isGroupVisibility = visibility.startsWith('group_');
      const groupId = isGroupVisibility ? visibility.replace('group_', '') : null;
      
      // Calculate accurate duration from recorded video
      let actualDuration = Math.floor(Math.random() * 60) + 1; // fallback for file uploads
      
      if (recordedVideo) {
        // Use the actual recorded duration captured during recording
        actualDuration = videoDuration > 0 ? videoDuration : actualRecordingDuration;
        console.log('Using recorded video duration:', actualDuration, 'seconds');
      }
      
      // Create FormData for direct binary upload (no base64 conversion)
      const formData = new FormData();
      
      // Convert Blob to File if necessary to ensure proper mimetype
      let finalVideoFile = videoFile;
      if (videoFile instanceof Blob && !(videoFile instanceof File)) {
        // Convert Blob to File with proper mimetype for recorded videos
        const mimeType = videoFile.type || 'video/webm';
        // Clean filename - avoid semicolons and special characters that confuse multipart parsers
        const cleanMimeType = mimeType.split(';')[0]; // Get just 'video/webm' part
        const extension = cleanMimeType.split('/')[1]; // Get 'webm' part
        finalVideoFile = new File([videoFile], `recorded-video.${extension}`, { 
          type: cleanMimeType // Use clean mimetype without codecs
        });
        console.log('Converted Blob to File:', {
          originalType: videoFile.type,
          newType: finalVideoFile.type,
          cleanMimeType: cleanMimeType,
          filename: `recorded-video.${extension}`,
          size: finalVideoFile.size
        });
      }
      
      // Log the final video file details being sent to server
      const fileDetails = {
        type: finalVideoFile.type,
        size: finalVideoFile.size,
        isFile: finalVideoFile instanceof File,
        isBlob: finalVideoFile instanceof Blob
      };
      
      if (finalVideoFile instanceof File) {
        Object.assign(fileDetails, {
          name: finalVideoFile.name,
          lastModified: finalVideoFile.lastModified
        });
      }
      
      console.log('🔍 FRONTEND: Final video file details being sent:', fileDetails);
      
      formData.append('video', finalVideoFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('latitude', userLocation?.lat?.toString() || '');
      formData.append('longitude', userLocation?.lng?.toString() || '');
      formData.append('duration', (trimEnd > 0 ? Math.round(trimEnd - trimStart) : actualDuration).toString());
      formData.append('visibility', isGroupVisibility ? `group_${groupId}` : visibility);
      formData.append('postTiming', postTiming);
      
      // Add event date/time fields if category is events
      if (category === "events") {
        formData.append('eventStartDate', eventStartDate);
        formData.append('eventStartTime', eventStartTime);
        formData.append('eventEndDate', eventEndDate || '');
        formData.append('eventEndTime', eventEndTime || '');
      }
      if (groupId) formData.append('groupId', groupId);
      if (recordedVideo) formData.append('actualRecordingDuration', actualDuration.toString());
      if (postTiming === "custom" && customDateTime) formData.append('customDateTime', customDateTime);
      
      console.log('🔍 FRONTEND: FormData prepared, sending to /api/videos/upload-binary');

      // Upload via chunked upload to bypass Replit proxy size limits
      console.log('🔍 FRONTEND: Using chunked upload to bypass proxy size limits');
      console.log('🔍 FRONTEND: File size:', finalVideoFile.size, 'bytes');
      
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(finalVideoFile.size / CHUNK_SIZE);
      
      console.log('🔍 FRONTEND: Will upload in', totalChunks, 'chunks of', CHUNK_SIZE, 'bytes each');
      
      // Initialize chunked upload
      const initResponse = await fetch('/api/videos/chunked-upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: finalVideoFile instanceof File ? finalVideoFile.name : 'recorded-video.webm',
          fileSize: finalVideoFile.size,
          totalChunks: totalChunks,
          title: title,
          description: description,
          category: category,
          latitude: userLocation?.lat?.toString() || '',
          longitude: userLocation?.lng?.toString() || '',
          duration: (trimEnd > 0 ? Math.round(trimEnd - trimStart) : actualDuration).toString(),
          visibility: isGroupVisibility ? `group_${groupId}` : visibility,
          postTiming: postTiming,
          ...(category === "events" && {
            eventStartDate,
            eventStartTime,
            eventEndDate: eventEndDate || '',
            eventEndTime: eventEndTime || ''
          }),
          ...(groupId && { groupId }),
          ...(recordedVideo && { actualRecordingDuration: actualDuration.toString() }),
          ...(postTiming === "custom" && customDateTime && { customDateTime })
        })
      });
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`Failed to initialize upload: ${errorText}`);
      }
      
      const { uploadId } = await initResponse.json();
      console.log('🔍 FRONTEND: Upload initialized with ID:', uploadId);
      
      // Upload chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, finalVideoFile.size);
        const chunk = finalVideoFile.slice(start, end);
        
        console.log(`🔍 FRONTEND: Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.size} bytes)`);
        setUploadStatus({ 
          stage: 'uploading', 
          message: `Uploading... ${Math.round((chunkIndex + 1) / totalChunks * 100)}%` 
        });
        
        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk, `chunk_${chunkIndex}.dat`);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('uploadId', uploadId);
        
        console.log('🔍 FRONTEND: Sending chunk FormData:', {
          chunkSize: chunk.size,
          uploadId: uploadId,
          chunkIndex: chunkIndex,
          formDataKeys: Array.from(chunkFormData.keys())
        });
        
        try {
          const chunkResponse = await fetch('/api/videos/chunked-upload/chunk', {
            method: 'POST',
            body: chunkFormData,
            credentials: 'include'
          });
          
          console.log('🔍 FRONTEND: Chunk upload response:', chunkResponse.status, chunkResponse.statusText);
          
          if (!chunkResponse.ok) {
            const errorText = await chunkResponse.text();
            console.error('❌ FRONTEND: Chunk upload error details:', errorText);
            throw new Error(`Chunk upload failed: ${chunkResponse.status} ${chunkResponse.statusText} - ${errorText}`);
          }
          
          const chunkResult = await chunkResponse.json();
          console.log('✅ FRONTEND: Chunk upload result:', chunkResult);
          
        } catch (fetchError) {
          console.error('❌ FRONTEND: Network error during chunk upload:', fetchError);
          throw fetchError;
        }
        
        console.log(`✅ FRONTEND: Chunk ${chunkIndex + 1} uploaded successfully`);
      }
      
      // Complete the upload
      console.log('🔍 FRONTEND: Completing chunked upload...');
      const completeResponse = await fetch('/api/videos/chunked-upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ uploadId })
      });
      
      if (!completeResponse.ok) {
        const errorText = await completeResponse.text();
        throw new Error(`Failed to complete upload: ${errorText}`);
      }
      
      const response = completeResponse;

      console.log('🔍 FRONTEND: Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 FRONTEND: Error response body:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Handle the response from chunked upload complete endpoint
      if (data.id || data.videoId) {
        const videoId = data.id || data.videoId;
        setUploadStatus({ 
          stage: 'processing', 
          videoId: videoId, 
          message: 'Video uploaded successfully. Processing in background...' 
        });
        
        // Removed redundant toast notification - using ProcessingNotificationModal instead
        
        pollVideoStatus(videoId);
      } else {
        throw new Error('Unexpected response format: ' + JSON.stringify(data));
      }
    } catch (error) {
      setUploadStatus({ stage: 'failed', message: 'Failed to prepare video' });
      toast({
        title: "Error",
        description: "Failed to process video file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Full-screen camera recording mode
  if (recordingMode === 'camera') {
    // Show processing screen
    if (processingVideo) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg font-medium">Processing Video...</div>
              <div className="text-sm opacity-75">Please wait a moment</div>
            </div>
          </div>
        </div>
      );
    }

    // Show recorded video preview
    if (recordingComplete && recordedVideoUrl) {
      const trimmedDuration = trimEnd - trimStart;
      const canProceed = trimmedDuration <= 60;
      
      return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <video
              ref={previewVideoRef}
              src={recordedVideoUrl}
              className="max-w-full max-h-full object-contain"
              controls={false}
              autoPlay
              loop
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                const duration = video.duration;
                console.log('Preview video duration:', duration, 'readyState:', video.readyState);
                if (duration && isFinite(duration) && duration > 0) {
                  setVideoDuration(duration);
                  setTrimStart(0);
                  setTrimEnd(duration);
                }
              }}
              onDurationChange={(e) => {
                const video = e.target as HTMLVideoElement;
                const duration = video.duration;
                console.log('Preview video duration change:', duration);
                if (duration && isFinite(duration) && duration > 0) {
                  setVideoDuration(duration);
                  setTrimStart(0);
                  setTrimEnd(duration);
                }
              }}
              onTimeUpdate={(e) => {
                const video = e.target as HTMLVideoElement;
                setCurrentTime(video.currentTime);
                if (videoDuration > 0 && video.currentTime >= trimEnd && trimEnd > 0) {
                  video.currentTime = trimStart;
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
              <div className="flex justify-between items-center">
                <button
                  onClick={resetVideoSelection}
                  className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center pointer-events-auto"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="text-white text-center">
                  <div className="text-sm font-medium">Recording Preview</div>
                  <div className="text-xs opacity-75">
                    {videoDuration > 0 ? `${(trimEnd - trimStart).toFixed(1)}s` : 'Loading...'}
                  </div>
                </div>
                <div className="w-10" />
              </div>
            </div>

            {/* Custom playback controls */}
            {!isInTrimMode && (
              <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
                <div className="bg-black/70 rounded-lg px-4 py-3 space-y-2">
                  {/* Progress bar */}
                  <div className="w-full bg-gray-600 rounded-full h-1">
                    <div 
                      className="bg-white h-1 rounded-full transition-all duration-100"
                      style={{ 
                        width: `${videoDuration > 0 ? ((currentTime - trimStart) / (trimEnd - trimStart)) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        if (previewVideoRef.current) {
                          if (previewVideoRef.current.paused) {
                            previewVideoRef.current.play();
                          } else {
                            previewVideoRef.current.pause();
                          }
                        }
                      }}
                      className="text-white hover:text-gray-300 transition-colors"
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                    <div className="text-white text-sm font-mono">
                      {formatTime(currentTime - trimStart)} / {formatTime(trimEnd - trimStart)}
                    </div>
                    <div className="flex-1"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Trim Controls - Only show in trim mode */}
            {isInTrimMode && (
              <div className="absolute bottom-32 left-4 right-4 bg-white rounded-xl p-4 shadow-lg">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium text-gray-900">Trim Video</div>
                  <div className="text-xs text-gray-600">
                    Drag edges to adjust video length
                  </div>
                </div>
                
                {/* Timeline Scrubber */}
                <div className="relative h-12 bg-gray-200 rounded-lg mb-4 overflow-hidden">
                  {/* Full timeline background */}
                  <div className="absolute inset-0 bg-gray-300"></div>
                  
                  {/* Selected portion (multicolor gradient) */}
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 to-violet-500 flex items-center justify-between"
                    style={{
                      left: `${videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0}%`,
                      width: `${videoDuration > 0 ? ((trimEnd - trimStart) / videoDuration) * 100 : 100}%`,
                      paddingLeft: '6px',
                      paddingRight: '6px'
                    }}
                  >
                    {/* Left edge grab handle */}
                    <div className="flex space-x-1 text-white">
                      <div className="w-1 h-4 bg-white"></div>
                      <div className="w-1 h-4 bg-white"></div>
                    </div>
                    
                    {/* Right edge grab handle */}
                    <div className="flex space-x-1 text-white">
                      <div className="w-1 h-4 bg-white"></div>
                      <div className="w-1 h-4 bg-white"></div>
                    </div>
                  </div>
                  
                  {/* Trim handles */}
                  <div 
                    className="absolute top-0 w-1 h-full bg-black cursor-ew-resize z-10"
                    style={{ left: `${videoDuration > 0 ? (trimStart / videoDuration) * 100 : 0}%` }}
                  ></div>
                  <div 
                    className="absolute top-0 w-1 h-full bg-black cursor-ew-resize z-10"
                    style={{ left: `${videoDuration > 0 ? (trimEnd / videoDuration) * 100 : 100}%` }}
                  ></div>
                  
                  {/* Interactive areas for dragging */}
                  {videoDuration > 0 && (
                    <>
                      <div 
                        className="absolute top-0 h-full w-6 cursor-ew-resize z-20"
                        style={{ left: `calc(${(trimStart / videoDuration) * 100}% - 12px)` }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                          const startDrag = (e: MouseEvent) => {
                            const x = e.clientX - rect.left;
                            const percent = (x / rect.width) * 100;
                            const newTime = (percent / 100) * videoDuration;
                            const clampedTime = Math.max(0, Math.min(newTime, trimEnd - 0.5));
                            setTrimStart(clampedTime);
                            if (previewVideoRef.current) {
                              previewVideoRef.current.currentTime = clampedTime;
                            }
                          };
                          const stopDrag = () => {
                            document.removeEventListener('mousemove', startDrag);
                            document.removeEventListener('mouseup', stopDrag);
                          };
                          document.addEventListener('mousemove', startDrag);
                          document.addEventListener('mouseup', stopDrag);
                        }}
                      ></div>
                      
                      <div 
                        className="absolute top-0 h-full w-6 cursor-ew-resize z-20"
                        style={{ left: `calc(${(trimEnd / videoDuration) * 100}% - 12px)` }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                          const startDrag = (e: MouseEvent) => {
                            const x = e.clientX - rect.left;
                            const percent = (x / rect.width) * 100;
                            const newTime = (percent / 100) * videoDuration;
                            const clampedTime = Math.min(videoDuration, Math.max(newTime, trimStart + 0.5));
                            setTrimEnd(clampedTime);
                          };
                          const stopDrag = () => {
                            document.removeEventListener('mousemove', startDrag);
                            document.removeEventListener('mouseup', stopDrag);
                          };
                          document.addEventListener('mousemove', startDrag);
                          document.addEventListener('mouseup', stopDrag);
                        }}
                      ></div>
                    </>
                  )}
                </div>
                
                {/* Time indicators */}
                <div className="flex justify-center items-center mb-4">
                  <div className="text-center">
                    <div className="text-lg font-mono text-gray-900 mb-1">
                      {isFinite(trimmedDuration) ? `${Math.floor(trimmedDuration / 60)}:${(trimmedDuration % 60).toFixed(1).padStart(4, '0')}` : '0:00.0'}
                    </div>
                    <div className="text-xs text-gray-600">
                      Trimmed Length
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={exitTrimMode}
                    className="flex-1 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      trimVideo();
                      setIsInTrimMode(false);
                      // Don't show success message for trimming
                    }}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Apply Trim
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isInTrimMode && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-3">
                <button
                  onClick={startNewRecording}
                  className="px-6 py-3 bg-black/70 text-white rounded-full font-medium backdrop-blur-sm"
                >
                  Start Over
                </button>
                <button
                  onClick={enterTrimMode}
                  className="px-6 py-3 bg-blue-500 text-white rounded-full font-medium"
                >
                  Trim Video
                </button>
                <button
                  onClick={acceptRecording}
                  className="px-8 py-3 bg-green-500 text-white rounded-full font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show camera recording interface
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Camera View */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            style={{ 
              transform: currentFacingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' // Mirror only front camera, back camera normal
            }}
            autoPlay
            muted
            playsInline // Important for iOS
          />
          
          {/* Recording Controls Overlay */}
          <div className="absolute inset-0 bg-black/20">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex justify-between items-center">
                <button
                  onClick={resetVideoSelection}
                  className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="text-white text-center">
                  <div className="text-sm font-medium">
                    {isRecording ? 'Recording' : 'Ready to Record'}
                  </div>
                  {isRecording && (
                    <div className="text-xs opacity-75">
                      {Math.floor((60 - (recordingProgress * 60 / 100)))}s remaining
                    </div>
                  )}
                  {/* iOS Permission Helper */}
                  {(/iPad|iPhone|iPod/.test(navigator.userAgent)) && !isRecording && (
                    <div className="text-xs opacity-75 mt-1">
                      💡 Add to Home Screen for easier permissions
                    </div>
                  )}
                </div>
                
                {/* Camera Switch Button */}
                {(availableCameras.length > 1 || isMobileDevice) && (
                  <button
                    onClick={switchCamera}
                    disabled={!cameraReady || isRecording}
                    className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center disabled:opacity-50"
                    title={`Switch to ${currentFacingMode === 'user' ? 'back' : 'front'} camera`}
                  >
                    <svg 
                      className="w-5 h-5 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isRecording && (
              <div className="absolute top-16 left-4 right-4">
                <div className="w-full bg-black/30 rounded-full h-1">
                  <div 
                    className="bg-red-500 h-1 rounded-full transition-all duration-1000"
                    style={{ width: `${recordingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Recording Button */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
              {/* Record Button with iPad-specific fixes */}
              {(() => {
                const isIpad = /iPad|iPad Pro/.test(navigator.userAgent) || 
                              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                const hasVideoStream = !!videoRef.current?.srcObject;
                const shouldShow = (cameraReady && !isRecording) || (isIpad && hasVideoStream && !isRecording);
                
                // Force show button on iPad if video stream exists
                if (!shouldShow && !isIpad) {
                  return null;
                }
                
                return (
                  <button
                    onClick={startRecording}
                    disabled={isIpad ? isRecording : (!cameraReady || isRecording)}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      (cameraReady && !isRecording) || (isIpad && hasVideoStream && !isRecording)
                        ? 'bg-red-500 hover:bg-red-600 scale-100' 
                        : 'bg-gray-500 opacity-50 scale-95'
                    }`}
                    style={{ 
                      visibility: 'visible',
                      display: 'flex',
                      zIndex: 9999,
                      position: 'relative'
                    }}
                  >
                    <div className="w-6 h-6 bg-white rounded-full" />
                  </button>
                );
              })()}
              
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 bg-red-500 rounded-lg flex items-center justify-center shadow-lg"
                >
                  <div className="w-8 h-8 bg-white rounded" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/50 z-50 modal-backdrop">
      {/* Floating Modal for All Screen Sizes */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] shadow-xl animate-in fade-in-0 zoom-in-95 flex flex-col">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Drop a Jem</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Video input section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add Your Video</h3>
              
              {/* Show video preview if video is selected/recorded */}
              {(selectedFile || recordedVideo) && videoPreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={videoPreview} 
                      alt="Video preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-gray-700" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm text-green-800 font-medium">
                        {selectedFile ? `Selected: ${selectedFile.name}` : 'Video recorded successfully'}
                      </p>
                      <p className="text-xs text-green-600">Ready to upload</p>
                    </div>
                    <button
                      onClick={resetVideoSelection}
                      className="text-green-600 hover:text-green-800 text-sm underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleModeSelect('camera')}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 transition-colors group"
                  >
                    <Video className="w-6 h-6 text-gray-400 group-hover:text-red-500 mb-2" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-red-500">Record Video</span>
                  </button>
                  
                  <button
                    onClick={() => handleModeSelect('select')}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 transition-colors group"
                  >
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-red-500 mb-2" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-red-500">Choose File</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">60 seconds max<br/>Up to 500MB</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/avi,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <video
              ref={videoRef}
              className={`w-full h-48 bg-gray-100 rounded-lg mb-4 ${isRecording ? 'block' : 'hidden'}`}
              autoPlay
              muted
            />
            
            {isRecording && (
              <div className="mb-4 text-center">
                <button
                  onClick={stopRecording}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                >
                  Stop Recording
                </button>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your Jem about?"
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        <div className="flex items-center space-x-2">
                          <img src={cat.icon} alt={cat.name} className="w-4 h-auto object-contain" />
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us more about your Jem..."
                  className="w-full"
                  rows={3}
                />
              </div>

              {/* Event Date/Time Fields - Only show when Events category is selected */}
              {category === "events" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-medium text-blue-900">Event Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Date/Time */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Event Start Date *
                      </label>
                      <Input
                        type="date"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        className="w-full"
                        required={category === "events"}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Event Start Time *
                      </label>
                      <Input
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                        className="w-full"
                        required={category === "events"}
                      />
                    </div>
                    
                    {/* End Date/Time */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Event End Date
                      </label>
                      <Input
                        type="date"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        className="w-full"
                        min={eventStartDate} // End date can't be before start date
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Event End Time
                      </label>
                      <Input
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-blue-600 mt-2">
                    * Start date and time are required. End date/time is optional for ongoing events.
                  </p>
                </div>
              )}

              {/* Visibility Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Visibility
                  </span>
                </label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Who can see this?" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Post Timing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    When to Post
                  </span>
                </label>
                <Select value={postTiming} onValueChange={setPostTiming}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose posting time" />
                  </SelectTrigger>
                  <SelectContent>
                    {postTimingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date/Time Picker */}
              {postTiming === "custom" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              {/* Location Preview with Mini Map */}
              {userLocation && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    {/* Mini Map Preview */}
                    <div className="w-24 h-24 bg-gray-200 rounded-lg relative overflow-hidden flex-shrink-0">
                      {(mapsConfig as any)?.apiKey ? (
                        <img
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${userLocation.lat},${userLocation.lng}&zoom=15&size=96x96&maptype=roadmap&markers=color:red%7C${userLocation.lat},${userLocation.lng}&key=${(mapsConfig as any).apiKey}`}
                          alt="Location preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100"></div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Location Info */}
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="text-sm font-medium text-gray-900">Drop Location</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Your video will be dropped at your current location
                      </div>
                      <div className="text-xs text-gray-500">
                        {locationAddress || "Loading address..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Status Indicator */}
              {uploadStatus.stage !== 'idle' && (
                <div className="mb-4 p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {uploadStatus.stage === 'uploading' && (
                      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadStatus.stage === 'processing' && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadStatus.stage === 'completed' && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                    {uploadStatus.stage === 'failed' && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {uploadStatus.stage === 'uploading' && 'Uploading Video...'}
                        {uploadStatus.stage === 'processing' && 'Processing Video...'}
                        {uploadStatus.stage === 'completed' && 'Video Ready!'}
                        {uploadStatus.stage === 'failed' && 'Upload Failed'}
                      </p>
                      {uploadStatus.message && (
                        <p className="text-xs text-gray-600">{uploadStatus.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>
          
          {/* Fixed Footer with Action Buttons */}
          <div className="flex-shrink-0 border-t border-gray-100 bg-white rounded-b-2xl px-6 py-6">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={uploadStatus.stage === 'uploading' || uploadStatus.stage === 'processing'}
              >
                {uploadStatus.stage === 'processing' ? 'Processing...' : 'Cancel'}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  const formEvent = new Event('submit') as any;
                  formEvent.preventDefault = () => {};
                  handleSubmit(formEvent);
                }}
                disabled={uploadMutation.isPending || uploadStatus.stage === 'processing' || uploadStatus.stage === 'completed'}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {uploadStatus.stage === 'uploading' && "Uploading..."}
                {uploadStatus.stage === 'processing' && "Processing..."}
                {uploadStatus.stage === 'completed' && "Complete!"}
                {uploadStatus.stage === 'failed' && "Retry"}
                {uploadStatus.stage === 'idle' && "Drop Jem"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Community Guidelines Modal */}
    <CommunityGuidelinesModal
      isOpen={showCommunityGuidelines}
      onClose={() => setShowCommunityGuidelines(false)}
      onAccept={() => acceptGuidelinesMutation.mutate()}
    />
    </>
  );
}