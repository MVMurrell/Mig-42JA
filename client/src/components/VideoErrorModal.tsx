import { X, AlertTriangle, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface VideoErrorModalProps {
  video: any;
  onClose: () => void;
  onRetry?: () => void;
  onDelete?: () => void;
}

export default function VideoErrorModal({ video, onClose, onRetry, onDelete }: VideoErrorModalProps) {
  const getErrorDetails = () => {
    const flaggedReason = video.flaggedReason || '';
    const moderationResults = video.moderationResults || {};
    
    // Parse moderation results if it's a string
    let parsedResults = moderationResults;
    if (typeof moderationResults === 'string') {
      try {
        parsedResults = JSON.parse(moderationResults);
      } catch (e) {
        parsedResults = {};
      }
    }

    if (flaggedReason.includes('Audio processing failed')) {
      return {
        title: 'Audio Analysis Failed',
        description: 'Your video could not be processed due to an audio issue.',
        details: [
          'The audio in your video could not be analyzed',
          'This may be due to an unsupported audio format',
          'Videos without audio tracks may cause this error',
          'This video cannot be processed further'
        ],
        solutions: [
          'Upload a new video with clear audio',
          'Ensure your video uses a common format like MP4',
          'Check that your video has an audio track',
          'Contact support if you need assistance'
        ],
        retryable: false
      };
    }

    if (flaggedReason.includes('FFmpeg')) {
      return {
        title: 'Video Format Error',
        description: 'Your video format could not be processed.',
        details: [
          'The video encoding or format is not supported',
          'Our processing services are temporarily busy',
          'File may be corrupted or incomplete'
        ],
        solutions: [
          'Try re-exporting your video in MP4 format',
          'Ensure the video file is not corrupted',
          'Try uploading again later'
        ],
        retryable: true
      };
    }

    if (parsedResults.audioModeration === 'rejected') {
      return {
        title: 'Content Policy Violation',
        description: 'Your video audio contains content that violates our community guidelines.',
        details: [
          'Inappropriate language or content detected',
          'Harmful or offensive speech identified',
          'Content may promote harmful activities'
        ],
        solutions: [
          'Review our community guidelines',
          'Edit your video to remove problematic content',
          'Appeal this decision if you believe it was made in error'
        ],
        retryable: false
      };
    }

    return {
      title: 'Processing Error',
      description: 'Your video encountered an error during processing.',
      details: [
        'An unexpected error occurred during video analysis',
        'Our services may be temporarily busy'
      ],
      solutions: [
        'Try uploading the video again',
        'Contact support if the problem continues'
      ],
      retryable: true
    };
  };

  const errorInfo = getErrorDetails();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{errorInfo.title}</h2>
              <p className="text-sm text-gray-500">Video: {video.title || 'Untitled'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-700">{errorInfo.description}</p>
          </div>

          {/* Error Details */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium text-gray-900">What happened?</h3>
            </div>
            <ul className="space-y-2">
              {errorInfo.details.map((detail, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-4 h-4 text-green-600" />
              <h3 className="font-medium text-gray-900">How to fix this</h3>
            </div>
            <ul className="space-y-2">
              {errorInfo.solutions.map((solution, index) => (
                <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{solution}</span>
                </li>
              ))}
            </ul>
          </div>


        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-xl space-y-3 sm:space-y-0">
          {/* Mobile: Stack buttons vertically */}
          <div className="flex flex-col sm:hidden space-y-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>

            {onDelete && (
              <Button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Video
              </Button>
            )}
          </div>
          
          {/* Desktop: Horizontal layout */}
          <div className="hidden sm:flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>

            {onDelete && (
              <Button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Video
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}