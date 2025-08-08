import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.tsx';

interface VideoCompatibilityTestProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoCompatibilityTest({ isOpen, onClose }: VideoCompatibilityTestProps) {
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({});
  const [isRunning, setIsRunning] = useState(false);

  const videoFormats = [
    'video/mp4',
    'video/webm',
    'video/webm; codecs="vp8"',
    'video/webm; codecs="vp9"',
    'video/mp4; codecs="avc1.42E01E"',
    'video/mp4; codecs="avc1.42001E, mp4a.40.2"'
  ];

  useEffect(() => {
    if (isOpen && !isRunning) {
      runCompatibilityTest();
    }
  }, [isOpen]);

  const runCompatibilityTest = () => {
    setIsRunning(true);
    const results: {[key: string]: boolean} = {};
    
    videoFormats.forEach(format => {
      const video = document.createElement('video');
      const canPlay = video.canPlayType(format);
      results[format] = canPlay !== '';
      console.log(`Format ${format}: ${canPlay}`);
    });
    
    setTestResults(results);
    setIsRunning(false);
  };

  const getTroubleshootingSteps = () => {
    const supportedFormats = Object.entries(testResults).filter(([_, supported]) => supported);
    
    if (supportedFormats.length === 0) {
      return [
        "Your Chrome browser appears to be missing video codecs",
        "Try updating Chrome to the latest version",
        "Check if hardware acceleration is enabled in Chrome settings",
        "Try using a different browser (Firefox, Safari, Edge)",
        "On some systems, you may need to install additional codec packs"
      ];
    }
    
    return [
      `Your browser supports ${supportedFormats.length} video formats`,
      "The app should work with these formats",
      "If videos still don't play, try refreshing the page"
    ];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-xl">
        <DialogHeader>
          <DialogTitle>Video Compatibility Test</DialogTitle>
          <DialogDescription>
            Testing your browser's video format support to troubleshoot playback issues.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Testing your browser's video format support...
          </div>
          
          {isRunning ? (
            <div>Running tests...</div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-medium">Test Results:</h3>
              {videoFormats.map(format => (
                <div key={format} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-mono">{format}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    testResults[format] 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {testResults[format] ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="font-medium">Troubleshooting Steps:</h3>
            <ul className="text-sm space-y-1">
              {getTroubleshootingSteps().map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={runCompatibilityTest}>
              Run Test Again
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}