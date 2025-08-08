import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ChevronLeft, ChevronRight, X, MapPin, Users, Trophy, Heart, Plus, Play, Unlock, UserPlus, MessageSquare, Shield, Star, Zap, Coins } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const pages = [
    {
      icon: <Heart className="w-12 h-12 text-pink-500" />,
      title: "Welcome to Jemzy!",
      content: (
        <div className="text-center space-y-4">
          <p className="text-gray-600 text-lg leading-relaxed">
            A new kind of social media that's local, safe, and fun.
          </p>
          <p className="text-gray-600">
            Connect with people you live and work around, wherever you are. 
            Share moments, discover local Jems, and build real connections 
            in your community.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 font-medium">
              Your local social network starts here!
            </p>
          </div>
        </div>
      )
    },
    {
      icon: <MapPin className="w-12 h-12 text-blue-500" />,
      title: "Map & Jems",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            <strong>Jems</strong> are short videos shared on the map. Here's how they work:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Plus className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Post a Jem</p>
                <p className="text-sm text-gray-600">Tap the + button to record and share a video at your location</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Play className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Watch Jems</p>
                <p className="text-sm text-gray-600">Free within 100ft, 1 coin outside your circle</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Unlock className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Unlock Forever</p>
                <p className="text-sm text-gray-600">Once purchased, watch from anywhere</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Users className="w-12 h-12 text-green-500" />,
      title: "Groups & Chat",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect with others in your area through groups:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <UserPlus className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Join Groups</p>
                <p className="text-sm text-gray-600">Find public groups or get invited to private ones</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Text & Video Chat</p>
                <p className="text-sm text-gray-600">Send messages and video replies in group threads</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Private Groups</p>
                <p className="text-sm text-gray-600">Share Jems selectively with your close connections</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: <Trophy className="w-12 h-12 text-yellow-500" />,
      title: "Quests & Rewards",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Participate in quests to earn coins and bring people together:
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Join Quests</p>
                <p className="text-sm text-gray-600">Complete challenges to win coins and prizes</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Create Quests</p>
                <p className="text-sm text-gray-600">Draw people to locations with your own challenges</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Coins className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Earn Coins</p>
                <p className="text-sm text-gray-600">Use coins to unlock distant Jems and premium features</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Handle touch events for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-[95vw] max-w-md mx-auto p-0 bg-white rounded-xl overflow-hidden sm:w-full [&>button]:hidden"
      >
        <DialogTitle className="sr-only">Welcome to Jemzy</DialogTitle>
        <DialogDescription className="sr-only">
          Welcome tutorial for new users explaining how to use Jemzy, including map features, groups, and quests.
        </DialogDescription>
        
        {/* Header with close button only */}
        <div className="flex justify-end items-center p-4 border-b">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1 h-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content area */}
        <div 
          className="relative max-h-[60vh] sm:max-h-[70vh] overflow-y-auto overflow-x-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300 ease-in-out h-full"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {pages.map((page, index) => (
              <div 
                key={index}
                className="min-w-full flex flex-col items-center justify-center p-3 sm:p-4 text-center"
              >
                <div className="mb-2 sm:mb-3">
                  {page.icon}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
                  {page.title}
                </h2>
                <div className="w-full">
                  {page.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation footer */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-t bg-gray-50">
          <Button 
            variant="outline" 
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 0}
            className="flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          <span className="text-sm text-gray-500">
            {currentPage + 1} of {pages.length}
          </span>

          {currentPage === pages.length - 1 ? (
            <Button 
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Get Started
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={nextPage}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}