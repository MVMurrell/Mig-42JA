import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Star, Trophy, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { calculateXPRequiredForLevel } from '@shared/xpSystem.ts';

interface LevelUpModalProps {
  isOpen: boolean;
  oldLevel: number;
  newLevel: number;
  currentXP: number;
  nextLevelXP: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  oldLevel,
  newLevel,
  currentXP,
  nextLevelXP,
  onClose,
}) => {
  const currentLevelXP = calculateXPRequiredForLevel(newLevel);
  const nextLevelXPCorrect = calculateXPRequiredForLevel(newLevel + 1);
  const progressXP = Math.max(0, currentXP - currentLevelXP);
  const neededXP = Math.max(1, nextLevelXPCorrect - currentLevelXP);
  const progressPercentage = Math.min(100, Math.max(0, (currentXP / nextLevelXPCorrect) * 100));





  const getLevelIcon = (level: number) => {
    if (level >= 50) return <Crown className="w-8 h-8 text-yellow-500" />;
    if (level >= 25) return <Trophy className="w-8 h-8 text-yellow-500" />;
    if (level >= 10) return <Star className="w-8 h-8 text-yellow-500" />;
    return <Sparkles className="w-8 h-8 text-yellow-500" />;
  };

  const getLevelTitle = (level: number) => {
    if (level >= 50) return "Legendary Explorer";
    if (level >= 25) return "Expert Adventurer";
    if (level >= 10) return "Skilled Traveler";
    if (level >= 5) return "Active User";
    if (level >= 1) return "Beginner";
    return "Noob!";
  };

  const handleClose = () => {
    console.log('LevelUpModal: Close button clicked');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('LevelUpModal: Dialog onOpenChange called with:', open);
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Level Up!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Celebration Animation */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
                className="text-center"
              >
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-2xl">
                    {getLevelIcon(newLevel)}
                  </div>
                  
                  {/* Sparkle Effects */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-32 h-32 opacity-20"
                    >
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                      </div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                      </div>
                      <div className="absolute top-1/2 left-0 transform -translate-y-1/2">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                      </div>
                    </motion.div>
                  </div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="text-2xl font-bold text-gray-900">
                    Level {newLevel}!
                  </h3>
                  <p className="text-lg text-gray-600">
                    {getLevelTitle(newLevel)}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress to Next Level */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress to Level {newLevel + 1}</span>
              <span className="text-gray-600">
                {currentXP.toLocaleString()} / {nextLevelXPCorrect.toLocaleString()} XP
              </span>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Next Level at {nextLevelXPCorrect.toLocaleString()} XP
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-center text-xs text-gray-500">
              {isNaN(progressPercentage) ? 0 : Math.round(progressPercentage)}% complete
            </div>
          </motion.div>

          {/* Current Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Level</span>
              <span className="text-lg font-bold text-gray-900">
                {newLevel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total XP</span>
              <span className="text-lg font-bold text-gray-900">
                {currentXP.toLocaleString()}
              </span>
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg shadow-lg"
            >
              Continue Exploring
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LevelUpModal;