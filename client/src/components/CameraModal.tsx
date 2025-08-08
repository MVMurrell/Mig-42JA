import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      setError("Camera access denied or not available. Please check your permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
  };

  const usePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    setCapturedImage(null);
    setError(null);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black text-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-white hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">Take Photo</h2>
        <div className="w-10" />
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg mb-4">{error}</p>
            <Button onClick={startCamera} variant="outline" className="text-black">
              Try Again
            </Button>
          </div>
        ) : capturedImage ? (
          <div className="h-full w-full relative">
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-full w-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Camera overlay/guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-8 inset-y-16 border-2 border-white border-opacity-50 rounded-lg"></div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={retakePhoto}
              variant="outline"
              size="lg"
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={usePhoto}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              <Check className="w-5 h-5 mr-2" />
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Button
              onClick={capturePhoto}
              size="lg"
              disabled={!stream || error !== null}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-20 h-20 p-0"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black"></div>
            </Button>
          </div>
        )}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}