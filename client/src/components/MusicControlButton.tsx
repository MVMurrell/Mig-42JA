import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext.tsx';
import { MusicControlModal } from './MusicControlModal.js';
import { LanternModal } from './LanternModal.js';
import { useButtonSound } from '@/hooks/useButtonSound.ts';
import { useQuery } from '@tanstack/react-query';
import runIcon from "@assets/Track_1752105154695.png";
import lanternIcon from "@assets/Lantern2_1752195390568.png";

interface MusicControlButtonProps {
  onActivityTrackingClick?: () => void;
  userProfile?: any;
  isLanternActive?: boolean;
  onLanternToggle?: (isActive: boolean) => void;
}

export const MusicControlButton: React.FC<MusicControlButtonProps> = ({ 
  onActivityTrackingClick, 
  userProfile, 
  isLanternActive, 
  onLanternToggle 
}) => {
  const { isPlaying } = useMusic();
  const [showModal, setShowModal] = useState(false);
  const [showLanternModal, setShowLanternModal] = useState(false);

  // Use passed userProfile prop instead of fetching here
  
  // Create sound-enabled handlers
  const handleShowModal = useButtonSound(() => setShowModal(true));
  const handleCloseModal = useButtonSound(() => setShowModal(false));
  const handleActivityTracking = useButtonSound(onActivityTrackingClick);
  const handleLanternClick = useButtonSound(() => setShowLanternModal(true));

  return (
    <>
      {/* Control Panel Container */}
      <div 
        className="fixed right-4 z-50 flex flex-col gap-2"
        style={{
          top: 'calc(50px + 140px + 12px)' // Ad space (50px mobile) + search/filter height (approx 140px) + 12px spacing
        }}
      >
        {/* Music Control Button */}
        <button
          onClick={handleShowModal}
          className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Music Controls"
        >
          <Music 
            className={`w-5 h-5 ${isPlaying ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`}
          />
        </button>

        {/* Activity Tracking Button */}
        <button
          onClick={handleActivityTracking}
          className="w-10 h-10 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-lg shadow-lg flex items-center justify-center transition-colors"
          aria-label="Activity Tracking"
        >
          <img src={runIcon} alt="Activity Tracking" className="w-6 h-6" />
        </button>

        {/* Lantern Button */}
        <button
          onClick={handleLanternClick}
          className="w-10 h-10 bg-white hover:bg-gray-50 text-black border border-gray-200 rounded-lg shadow-lg flex items-center justify-center transition-colors"
          aria-label="Lanterns"
        >
          <img src={lanternIcon} alt="Lanterns" className="w-6 h-6" />
        </button>
      </div>

      <MusicControlModal 
        isOpen={showModal}
        onClose={handleCloseModal}
      />

      <LanternModal 
        isOpen={showLanternModal} 
        onClose={() => setShowLanternModal(false)}
        userProfile={userProfile}
        isLanternActive={isLanternActive}
        onLanternToggle={(isActive) => {
          onLanternToggle?.(isActive);
          setShowLanternModal(false); // Close modal after toggling
        }}
      />
    </>
  );
};