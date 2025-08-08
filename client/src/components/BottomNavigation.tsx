import { MapPin, Users, ScrollText, User, Video } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useLocation } from "wouter";
import { useButtonSound } from "@/hooks/useButtonSound.ts";
import { useVideoUploadSound } from "@/hooks/useVideoUploadSound.ts";

interface BottomNavigationProps {
  onUpload: () => void;
}

export default function BottomNavigation({ onUpload }: BottomNavigationProps) {
  const [, setLocation] = useLocation();
  const playBellSound = useVideoUploadSound();
  
  // Create sound-enabled handlers
  const handleGroupsClick = useButtonSound(() => setLocation('/groups'));
  const handleQuestClick = useButtonSound(() => setLocation('/quest'));
  const handleProfileClick = useButtonSound(() => setLocation('/profile'));
  
  // Custom handler for video upload with bell sound
  const handleUploadClick = () => {
    playBellSound();
    onUpload();
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around py-3 mobile-landscape-safe">
        <button className="flex flex-col items-center gap-1 text-red-500 px-4 py-2">
          <MapPin className="w-6 h-6" />
          <span className="text-xs font-medium">Map</span>
        </button>
        
        <button 
          onClick={handleGroupsClick}
          className="flex flex-col items-center gap-1 text-gray-400 px-4 py-2"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Groups</span>
        </button>
        
        <Button
          onClick={handleUploadClick}
          className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center -mt-3 shadow-lg"
        >
          <Video className="w-6 h-6 text-white" />
        </Button>
        
        <button 
          onClick={handleQuestClick}
          className="flex flex-col items-center gap-1 text-gray-400 px-4 py-2"
        >
          <ScrollText className="w-6 h-6" />
          <span className="text-xs">Quests</span>
        </button>
        
        <button 
          onClick={handleProfileClick}
          className="flex flex-col items-center gap-1 text-gray-400 px-4 py-2"
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
}
