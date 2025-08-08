import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Coins } from 'lucide-react';

interface XPNotificationProps {
  isVisible: boolean;
  xpGained: number;
  activity: string;
  coinsGained?: number;
  onClose: () => void;
}

export const XPNotification: React.FC<XPNotificationProps> = ({
  isVisible,
  xpGained,
  activity,
  coinsGained,
  onClose,
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      setShouldRender(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.3,
          }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-lg shadow-2xl border border-purple-400 min-w-[280px] max-w-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-300" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-medium text-yellow-300">
                    +{xpGained} XP
                  </span>
                </div>
                <p className="text-sm text-white/90 truncate">
                  {activity}
                </p>
                {coinsGained && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Coins className="w-3 h-3 text-yellow-300" />
                    <span className="text-xs text-yellow-300">
                      +{coinsGained} coins
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPNotification;