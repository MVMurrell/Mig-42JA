import { useState, useEffect, useRef } from "react";
import { Gem, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { AppInstructionsModal } from "./AppInstructionsModal.js";
import { Loader } from "@googlemaps/js-api-loader";
// import { Loader } from "@googlemaps/js-api-loader";
import { useQuery } from "@tanstack/react-query";
import { useButtonSound } from "@/hooks/useButtonSound.ts";
import { useCoinCollectionSound } from "@/hooks/useCoinCollectionSound.ts";
import { useTreasureChestSound } from "@/hooks/useTreasureChestSound.ts";
import { useLanternSound } from "@/hooks/useLanternSound.ts";
import { useGroupPlaySound } from "@/hooks/useGroupPlaySound.ts";
import locationCenteredIcon from "@assets/Property 1=my_location_FILL1_wght400_GRAD0_opsz24.png";
import locationNotCenteredIcon from "@assets/Property 1=Location notcentered.png";
import coinIcon from "@assets/state=coins-empty.png";
import artIcon from "@assets/Property 1=Red.png";
import gamesIcon from "@assets/Property 1=Green.png";
import educationIcon from "@assets/Property 1=Orange.png";
import productsIcon from "@assets/Purple_1749397661787.png";
import servicesIcon from "@assets/Property 1=Pink.png";
import reviewIcon from "@assets/Property 1=Yellow.png";
import eventsIcon from "@assets/Property 1=Blue.png";
import challengeIcon from "@assets/Black_1749397661786.png";
import chatIcon from "@assets/Aqua_1749397661785.png";
import fyiIcon from "@assets/Cobalt_1749397661786.png";
import loveIcon from "@assets/Lilac_1749397661786.png";
import natureIcon from "@assets/Neon Green_1749397661787.png";
import couponIcon from "@assets/Mint_1749397661787.png";
import jemzyLogo from "@assets/JemzyLogoIcon.png";
import questIcon from "@assets/Quest_1750561755098.png";
import treasureIcon from "@assets/Treasure_1752016786995.png";
import dragonIcon from "@assets/Dragon_1752105853943.png";
import mysteryBoxIcon from "@assets/MysteryBox_1752339493995.png";
import lanternIcon from "@assets/Lantern2_1752195390568.png";
import { TreasureChestModal } from "./TreasureChestModal.js";
import { MysteryBoxModal } from "./MysteryBoxModal.js";
import DragonModal from "./DragonModal.js";
import { LanternModal } from "./LanternModal.js";
import { apiRequest } from "@/lib/queryClient";
import { toDate } from "@/lib/dates";

// import { loadGoogleMaps } from '@/lib/mapsLoader.ts';

interface Video {
  id: string;
  title: string;
  category: string;
  latitude?: string;
  longitude?: string;
  likes: number;
  views: number;
  watchedByUser?: boolean;
  requiresCoin?: boolean;
  distance?: number;
  createdAt?: string;
  groupName?: string;
  eventStartDate?: string;
  eventStartTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  userProfileImageUrl?: string;
  userReadyPlayerMeAvatarUrl?: string;
  isFromFollowedUser?: boolean;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  status: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  imageUrl?: string;
}

interface TreasureChest {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  difficulty: string;
  spawnedAt: string;
  expiresAt: string;
  isCollected: boolean;
  nearestVideoId?: string;
  nearestVideoDistance?: number;
}

interface MysteryBox {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  xpReward: number;
  lanternReward: number;
  rarity: string;
  spawnedAt: string;
  expiresAt: string;
  isCollected: boolean;
  nearestVideoId?: string;
  nearestVideoDistance?: number;
}

interface Dragon {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  totalHealth: number;
  currentHealth: number;
  videoCount: number;
  nearestVideoIds: string[];
  expiresAt: string;
}

interface MapInterfaceProps {
  videos: Video[];
  userLocation: { lat: number; lng: number } | null;
  mapCenter?: { lat: number; lng: number } | null;
  onVideoClick: (video: Video) => void;
  onLocationCenter: () => void;
  onPlayVideosInRadius?: (videos: Video[]) => void;
  targetVideoId?: string | null;
  isLoading?: boolean;
  hideWatchedVideos?: boolean;
  selectedCategories?: string[];
  appliedFilters?: {
    dateRange: string;
    sortBy: string;
    groups: string[];
    hideWatchedVideos: boolean;
  };

  userGemCoins?: number;
  userLanterns?: number;
  userProfileImage?: string;
  onCoinClick?: () => void;
  highlightedVideoId?: string;
  onViewportChange?: (viewport: {
    bounds: any;
    center: { lat: number; lng: number };
  }) => void;
  onQuestClick?: (quest: Quest) => void;
  lanternState?: {
    isActive: boolean;
    position?: { lat: number; lng: number };
  };
  onLanternActivate?: (position: { lat: number; lng: number }) => void;
  onLanternPurchase?: () => void;
}

// Custom gem icons with original dimensions and paths
const categoryIcons = {
  art: { url: "/map_icons/gems/Property 1=Red.png", width: 60, height: 60 },
  education: {
    url: "/map_icons/gems/Property 1=Orange.png",
    width: 60,
    height: 60,
  },
  review: {
    url: "/map_icons/gems/Property 1=Yellow.png",
    width: 56,
    height: 58,
  },
  games: { url: "/map_icons/gems/Property 1=Green.png", width: 37, height: 60 },
  events: { url: "/map_icons/gems/Property 1=Blue.png", width: 48, height: 60 },
  products: {
    url: "/map_icons/gems/Purple_1749397661787.png",
    width: 63,
    height: 63,
  },
  services: {
    url: "/map_icons/gems/Property 1=Pink.png",
    width: 60,
    height: 60,
  },
  challenge: {
    url: "/map_icons/gems/Black_1749397661786.png",
    width: 60,
    height: 60,
  },
  chat: {
    url: "/map_icons/gems/Aqua_1749397661785.png",
    width: 60,
    height: 48,
  },
  fyi: {
    url: "/map_icons/gems/Cobalt_1749397661786.png",
    width: 60,
    height: 37,
  },
  love: {
    url: "/map_icons/gems/Lilac_1749397661786.png",
    width: 58,
    height: 55,
  },
  nature: {
    url: "/map_icons/gems/Neon Green_1749397661787.png",
    width: 60,
    height: 60,
  },
  coupon: {
    url: "/map_icons/gems/Mint_1749397661787.png",
    width: 58,
    height: 58,
  },
  default: { url: "/map_icons/gems/Property 1=Red.png", width: 60, height: 60 },
};

// Helper function to calculate distance between two points in meters
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Helper function to calculate countdown text for events
const getEventCountdown = (
  eventStartDate?: string,
  eventStartTime?: string
): string | null => {
  if (!eventStartDate || !eventStartTime) return null;

  const eventDateTime = toDate(`${eventStartDate}T${eventStartTime}`);
  const now = new Date();
  const diffMs = eventDateTime.getTime() - now.getTime();

  // If event has passed, return null
  if (diffMs < 0) return "Live";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;

  return "Live";
};

// Helper function to calculate quest countdown
const getQuestCountdown = (endDate?: string): string | null => {
  if (!endDate) return null;

  const questEndDateTime = toDate(endDate);
  const now = new Date();
  const diffMs = questEndDateTime.getTime() - now.getTime();

  // If quest has ended, return null
  if (diffMs < 0) return "Ended";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? "s" : ""}`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""}`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;

  return "Ending soon";
};

// Helper function to calculate treasure chest countdown
const getTreasureCountdown = (expiresAt: string): string => {
  const expireTime = toDate(expiresAt);
  const now = new Date();
  const diffMs = expireTime.getTime() - now.getTime();

  if (diffMs < 0) return "Expired";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
};

// Helper function to create treasure chest marker with countdown
const createTreasureMarker = (
  chest: TreasureChest,
  iconSize: number,
  zoomLevel: number
): HTMLElement => {
  const now = new Date();
  const expiresAt = toDate(chest.expiresAt);
  const timeLeft = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);

  // Format time display to stay on one line
  const timeDisplay =
    hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;

  // Difficulty colors
  const difficultyColors: { [key: string]: string } = {
    easy: "#10B981", // Green
    medium: "#F59E0B", // Yellow
    hard: "#EF4444", // Red
    very_hard: "#8B5CF6", // Purple
    extreme: "#F97316", // Orange
  };

  const color = difficultyColors[chest.difficulty] || "#EF4444";

  const markerContent = document.createElement("div");
  markerContent.className = "treasure-marker-content";
  markerContent.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  `;

  // For zoomed out views, show minimal icon (like gems)
  if (zoomLevel < 13) {
    const iconElement = document.createElement("div");
    iconElement.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      opacity: 0.8;
    `;
    markerContent.appendChild(iconElement);
    return markerContent;
  }

  // Create treasure chest icon container with uploaded image (full size for zoomed in)
  const chestContainer = document.createElement("div");
  chestContainer.style.cssText = `
    width: ${iconSize}px;
    height: ${iconSize}px;
    border-radius: 50%;
    background-color: ${color};
    border: 3px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  `;

  // Create treasure chest image using uploaded asset
  const chestImg = document.createElement("img");
  chestImg.src = treasureIcon;
  chestImg.style.cssText = `
    width: ${iconSize * 0.7}px;
    height: ${iconSize * 0.7}px;
    object-fit: contain;
  `;

  // Create timer text with quest-style formatting
  const timerText = document.createElement("div");
  timerText.textContent = timeDisplay;
  timerText.style.cssText = `
    background-color: rgba(0,0,0,0.8);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: ${Math.max(10, iconSize * 0.2)}px;
    font-weight: bold;
    margin-top: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  `;

  chestContainer.appendChild(chestImg);
  markerContent.appendChild(chestContainer);
  markerContent.appendChild(timerText);

  return markerContent;
};

// Helper function to create event marker with countdown text
const createEventMarkerWithCountdown = (
  countdownText: string,
  iconSize: number
): string => {
  const iconConfig = categoryIcons.events;
  const scaleMultiplier =
    iconSize / Math.max(iconConfig.width, iconConfig.height);
  const scaledWidth = Math.round(iconConfig.width * scaleMultiplier);
  const scaledHeight = Math.round(iconConfig.height * scaleMultiplier);

  // Calculate text positioning with much more space
  const textY = scaledHeight + 18; // Position text further below the gem
  const fontSize = 14; // Larger font size for visibility
  const totalHeight = scaledHeight + 30; // Much more space for text

  // Create SVG with embedded blue gem and countdown text
  const svg = `<svg width="${scaledWidth}" height="${totalHeight}" viewBox="0 0 ${scaledWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="textShadow" x="-100%" y="-100%" width="300%" height="300%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,1)"/>
    </filter>
    <linearGradient id="gemGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:white;stop-opacity:0" />
    </linearGradient>
  </defs>
  <!-- Blue gem background -->
  <circle cx="${scaledWidth / 2}" cy="${scaledHeight / 2}" r="${
    scaledHeight / 2 - 2
  }" fill="#3b82f6" stroke="white" stroke-width="2"/>
  <!-- Gem shine effect -->
  <circle cx="${scaledWidth / 2}" cy="${scaledHeight / 2}" r="${
    scaledHeight / 2 - 4
  }" fill="url(#gemGradient)" opacity="0.3"/>
  <!-- Background rectangle for text visibility -->
  <rect x="0" y="${
    scaledHeight + 4
  }" width="${scaledWidth}" height="20" fill="rgba(0,0,0,0.7)" rx="3"/>
  <!-- Countdown text with strong shadow and background -->
  <text x="${scaledWidth / 2}" y="${textY}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="white" 
        stroke="black" 
        stroke-width="1">${countdownText}</text>
</svg>`;

  console.log(
    "Created countdown SVG for text:",
    countdownText,
    "dimensions:",
    scaledWidth,
    "x",
    totalHeight
  );
  return "data:image/svg+xml;base64," + btoa(svg);
};

// Get hex color for category
const getCategoryHexColor = (category: string): string => {
  const colorMap: { [key: string]: string } = {
    art: "#FF0000", // Red
    education: "#FFA500", // Orange
    review: "#FFFF00", // Yellow
    games: "#00FF00", // Green
    events: "#0000FF", // Blue
    products: "#800080", // Purple
    services: "#FFC0CB", // Pink
    challenge: "#000000", // Black
    chat: "#00FFFF", // Aqua
    fyi: "#0047AB", // Cobalt
    love: "#C8A2C8", // Lilac
    nature: "#32CD32", // Neon Green
    coupon: "#98FF98", // Mint
    default: "#808080", // Gray
  };
  return colorMap[category] || colorMap.default;
};

// Create small circular marker for zoomed out views
const createSmallMarker = (category: string): string => {
  const color = getCategoryHexColor(category);
  return (
    "data:image/svg+xml;base64," +
    btoa(`
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5" fill="${color}" stroke="white" stroke-width="1"/>
    </svg>
  `)
  );
};

// Helper function to create quest marker with countdown text
const createQuestMarkerWithCountdown = (
  countdownText: string,
  iconSize: number
): string => {
  const scaleMultiplier = iconSize / 40; // Based on quest icon dimensions
  const scaledWidth = Math.round(40 * scaleMultiplier);
  const scaledHeight = Math.round(40 * scaleMultiplier);

  // Calculate text positioning - moved down and left to overlap quest image more
  const textY = scaledHeight + 10; // Moved closer to the image (8px closer)
  const fontSize = 14;
  const totalHeight = scaledHeight + 25; // Adjusted total height accordingly

  // Create SVG with embedded quest icon and countdown text
  const svg = `<svg width="${scaledWidth}" height="${totalHeight}" viewBox="0 0 ${scaledWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="questTextShadow" x="-100%" y="-100%" width="300%" height="300%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,1)"/>
    </filter>
    <linearGradient id="questGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:white;stop-opacity:0" />
    </linearGradient>
  </defs>
  <!-- Gold quest background -->
  <circle cx="${scaledWidth / 2}" cy="${scaledHeight / 2}" r="${
    scaledHeight / 2 - 2
  }" fill="#FFD700" stroke="white" stroke-width="2"/>
  <!-- Quest icon overlay -->
  <circle cx="${scaledWidth / 2}" cy="${scaledHeight / 2}" r="${
    scaledHeight / 2 - 4
  }" fill="url(#questGradient)"/>
  <!-- Countdown text - positioned more to the left and closer to image -->
  <text x="${
    scaledWidth / 2 - 12
  }" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" filter="url(#questTextShadow)">${countdownText}</text>
</svg>`;

  return "data:image/svg+xml;base64," + btoa(svg);
};

// Helper function to create mystery box marker with countdown and rarity
const createMysteryBoxMarker = (
  box: MysteryBox,
  iconSize: number,
  zoomLevel: number
): HTMLElement => {
  const now = new Date();
  const expiresAt = toDate(box.expiresAt);
  const timeLeft = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);

  // Format time display to stay on one line
  const timeDisplay =
    hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;

  // Rarity colors and labels
  const rarityInfo: { [key: string]: { color: string; label: string } } = {
    common: { color: "#6B7280", label: "C" }, // Gray
    rare: { color: "#3B82F6", label: "R" }, // Blue
    epic: { color: "#8B5CF6", label: "E" }, // Purple
    legendary: { color: "#F59E0B", label: "L" }, // Gold
  };

  const rarity = rarityInfo[box.rarity] || rarityInfo["common"];

  const markerContent = document.createElement("div");
  markerContent.className = "mystery-box-marker-content";
  markerContent.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  `;

  // For zoomed out views, show minimal icon
  if (zoomLevel < 13) {
    const iconElement = document.createElement("div");
    iconElement.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 3px;
      background-color: ${rarity.color};
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      opacity: 0.8;
      position: relative;
    `;

    // Add small rarity indicator
    const rarityDot = document.createElement("div");
    rarityDot.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: ${rarity.color};
      border: 1px solid white;
    `;
    iconElement.appendChild(rarityDot);
    markerContent.appendChild(iconElement);
    return markerContent;
  }

  // Simple mystery box icon - just the PNG without backgrounds or badges
  const iconElement = document.createElement("img");
  iconElement.src = mysteryBoxIcon;
  iconElement.style.cssText = `
    width: ${Math.min(48, iconSize)}px;
    height: ${Math.min(48, iconSize)}px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `;
  markerContent.appendChild(iconElement);

  // Add time remaining display beneath the icon (similar to quests)
  if (timeLeft > 0) {
    const timeElement = document.createElement("div");
    timeElement.style.cssText = `
      background: rgba(0, 0, 0, 0.75);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 8px;
      margin-top: 4px;
      text-align: center;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
    `;
    timeElement.textContent = timeDisplay;
    markerContent.appendChild(timeElement);
  }

  return markerContent;
};

// Create followed user marker with profile picture and gem icon
const createFollowedUserMarkerContent = (
  iconSize: number,
  video: Video,
  zoomLevel: number
): HTMLElement => {
  const markerContent = document.createElement("div");
  markerContent.className = "followed-user-marker-content";
  markerContent.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  `;

  const opacity = video.watchedByUser ? 0.3 : 1.0;
  const baseSize = zoomLevel < 15 ? 40 : 48;

  if (zoomLevel < 13) {
    // Small circular marker for zoomed out views
    const iconElement = document.createElement("div");
    iconElement.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #FF6B6B;
      border: 2px solid white;
      opacity: ${opacity};
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    markerContent.appendChild(iconElement);
  } else {
    // Create container for profile picture and gem icon overlay
    const container = document.createElement("div");
    container.style.cssText = `
      position: relative;
      width: ${baseSize}px;
      height: ${baseSize}px;
      opacity: ${opacity};
    `;

    // Create circular profile image container
    const profileContainer = document.createElement("div");
    profileContainer.style.cssText = `
      width: ${baseSize}px;
      height: ${baseSize}px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #FF6B6B;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      background-color: #f0f0f0;
    `;

    // Profile image - prioritize Ready Player Me avatar
    const profileImage = document.createElement("img");
    const avatarUrl =
      video.userReadyPlayerMeAvatarUrl || video.userProfileImageUrl;
    profileImage.src =
      avatarUrl || "https://via.placeholder.com/48x48/cccccc/999999?text=U";
    profileImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    profileImage.onerror = () => {
      // Fallback to regular profile image if Ready Player Me fails
      if (video.userReadyPlayerMeAvatarUrl && video.userProfileImageUrl) {
        profileImage.src = video.userProfileImageUrl;
        profileImage.onerror = () => {
          // Final fallback to initials if both images fail
          profileContainer.innerHTML = `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #FF6B6B;
              color: white;
              font-weight: bold;
              font-size: ${baseSize * 0.4}px;
            ">U</div>
          `;
        };
      } else {
        // Fallback to initials if image fails
        profileContainer.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #FF6B6B;
            color: white;
            font-weight: bold;
            font-size: ${baseSize * 0.4}px;
          ">U</div>
        `;
      }
    };

    profileContainer.appendChild(profileImage);

    // Get gem icon for category
    const categoryIcon =
      categoryIcons[video.category as keyof typeof categoryIcons] ||
      categoryIcons.default;
    const gemSize = Math.round(baseSize * 0.4);

    // Create gem icon overlay in top right
    const gemIcon = document.createElement("div");
    gemIcon.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      width: ${gemSize}px;
      height: ${gemSize}px;
      background-image: url('${categoryIcon.url}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      z-index: 2;
    `;

    container.appendChild(profileContainer);
    container.appendChild(gemIcon);
    markerContent.appendChild(container);
  }

  return markerContent;
};

// Create custom HTML content for advanced markers with proper anchoring
const createAdvancedMarkerContent = (
  iconSize: number,
  video: Video,
  zoomLevel: number,
  countdownText?: string
): HTMLElement => {
  // Check if this is a video from a followed user
  if (
    video.isFromFollowedUser &&
    (video.userReadyPlayerMeAvatarUrl || video.userProfileImageUrl)
  ) {
    return createFollowedUserMarkerContent(iconSize, video, zoomLevel);
  }

  const markerContent = document.createElement("div");
  markerContent.className = "custom-marker-content";
  markerContent.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  `;

  const opacity = video.watchedByUser ? 0.3 : 1.0;

  if (zoomLevel < 13) {
    // Small circular marker for zoomed out views
    const color = getCategoryHexColor(video.category);
    const iconElement = document.createElement("div");
    iconElement.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      opacity: ${opacity};
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    markerContent.appendChild(iconElement);
  } else {
    // Full gem icon for zoomed in views
    const iconConfig =
      categoryIcons[video.category as keyof typeof categoryIcons] ||
      categoryIcons.default;
    const aspectRatio = iconConfig.width / iconConfig.height;

    // Calculate dimensions while keeping both width and height within 48px max
    let actualWidth, actualHeight;
    if (aspectRatio > 1) {
      // Wide icon: constrain width to 48px, scale height accordingly
      actualWidth = Math.min(48, iconSize * aspectRatio);
      actualHeight = actualWidth / aspectRatio;
    } else {
      // Tall icon: constrain height to 48px, scale width accordingly
      actualHeight = Math.min(48, iconSize);
      actualWidth = actualHeight * aspectRatio;
    }

    // Final safety check to ensure neither dimension exceeds 48px
    actualWidth = Math.min(48, actualWidth);
    actualHeight = Math.min(48, actualHeight);

    const iconImg = document.createElement("img");
    iconImg.src = iconConfig.url;
    iconImg.style.cssText = `
      width: ${actualWidth}px;
      height: ${actualHeight}px;
      display: block;
      object-fit: contain;
      opacity: ${opacity};
    `;
    markerContent.appendChild(iconImg);

    if (countdownText) {
      const textElement = document.createElement("div");
      textElement.style.cssText = `
        font-family: sans-serif;
        font-size: 12px;
        color: black;
        text-align: center;
        background-color: white;
        padding: 2px 5px;
        border-radius: 3px;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        font-weight: bold;
        opacity: ${opacity};
      `;
      textElement.textContent = countdownText;
      markerContent.appendChild(textElement);
    }
  }

  return markerContent;
};

// Create lantern marker with activation radius and cost indicator
const createLanternMarker = (lanternCount: number): HTMLElement => {
  const markerContent = document.createElement("div");
  markerContent.className = "lantern-marker-content";
  markerContent.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
    z-index: 1000;
  `;

  // Lantern icon
  const lanternIconElement = document.createElement("img");
  lanternIconElement.src = lanternIcon;
  lanternIconElement.style.cssText = `
    width: 48px;
    height: 48px;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  `;
  markerContent.appendChild(lanternIconElement);

  // Lantern count indicator
  const costElement = document.createElement("div");
  costElement.style.cssText = `
    font-family: sans-serif;
    font-size: 12px;
    color: white;
    text-align: center;
    background-color: rgba(239, 68, 68, 0.9);
    padding: 2px 6px;
    border-radius: 12px;
    white-space: nowrap;
    font-weight: bold;
    margin-top: 2px;
    border: 1px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;
  costElement.textContent = `${lanternCount} lantern${
    lanternCount !== 1 ? "s" : ""
  }`;
  markerContent.appendChild(costElement);

  return markerContent;
};

export default function MapInterface({
  videos,
  userLocation,
  mapCenter,
  onVideoClick,
  onLocationCenter,
  onPlayVideosInRadius,
  targetVideoId,
  isLoading,
  hideWatchedVideos,
  selectedCategories = [],
  appliedFilters,
  userGemCoins,
  userLanterns,
  onCoinClick,
  highlightedVideoId,
  userProfileImage,
  onViewportChange,
  onQuestClick,
  lanternState,
  onLanternActivate,
  onLanternPurchase,
}: MapInterfaceProps): JSX.Element {
  // Map state
  const [lanternMarker, setLanternMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [lanternCircle, setLanternCircle] = useState<google.maps.Circle | null>(
    null
  );
  // Sound effects hooks
  const playButtonSound = useButtonSound();
  const playCoinCollectionSound = useCoinCollectionSound();
  const playTreasureChestOpeningSound = useTreasureChestSound();
  const playLanternSound = useLanternSound();
  const playGroupPlaySound = useGroupPlaySound();

  // Modal state for treasure chest collection
  const [selectedTreasureChest, setSelectedTreasureChest] =
    useState<TreasureChest | null>(null);
  const [showTreasureChestModal, setShowTreasureChestModal] = useState(false);

  // Modal state for mystery box collection
  const [selectedMysteryBox, setSelectedMysteryBox] =
    useState<MysteryBox | null>(null);
  const [showMysteryBoxModal, setShowMysteryBoxModal] = useState(false);

  // Modal state for dragon interaction
  const [selectedDragonId, setSelectedDragonId] = useState<string | null>(null);
  const [showDragonModal, setShowDragonModal] = useState(false);

  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(15);
  const [currentMapCenter, setCurrentMapCenter] = useState(
    userLocation || { lat: 36.0573, lng: -94.1607 }
  );
  const [isUserCentered, setIsUserCentered] = useState(!!userLocation);
  const [showInstructions, setShowInstructions] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const questMarkersRef = useRef<Map<string, any>>(new Map());
  const questCirclesRef = useRef<Map<string, any>>(new Map());
  const treasureMarkersRef = useRef<Map<string, any>>(new Map());
  const mysteryBoxMarkersRef = useRef<Map<string, any>>(new Map());
  const dragonMarkersRef = useRef<Map<string, any>>(new Map());
  const dragonCirclesRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const activationCircleRef = useRef<any>(null);
  const dragListenerRef = useRef<any>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightCircleRef = useRef<any>(null);
  const lanternListenerRef = useRef<any>(null);
  const persistentTargetVideoId = useRef<string | null>(null);

  // Fetch active quests for map markers
  const { data: activeQuests = [] } = useQuery<Quest[]>({
    queryKey: ["/api/quests/active"],
    enabled: !!googleMapRef.current,
    queryFn: () => apiRequest("/api/quests/active"),
  });

  // Fetch active treasure chests for map markers
  const { data: treasureChests = [] } = useQuery<TreasureChest[]>({
    queryKey: ["/api/treasure-chests"],
    enabled: !!googleMapRef.current,
    refetchInterval: 30000, // Refresh every 30 seconds for countdown updates
    queryFn: () => apiRequest("/api/treasure-chests"),
  });

  // Fetch active mystery boxes for map markers
  const { data: mysteryBoxes = [] } = useQuery<MysteryBox[]>({
    queryKey: ["/api/mystery-boxes"],
    enabled: !!googleMapRef.current,
    refetchInterval: 30000, // Refresh every 30 seconds for mystery box updates
    queryFn: () => apiRequest("/api/mystery-boxes"),
  });

  // Fetch active dragons for map markers
  const { data: dragons = [] } = useQuery<Dragon[]>({
    queryKey: ["/api/dragons"],
    enabled: !!googleMapRef.current,
    refetchInterval: 30000, // Refresh every 30 seconds for dragon status updates
    queryFn: () => apiRequest("/api/dragons"),
  });

  // Fetch user profile for lantern count
  const { data: userProfile } = useQuery({
    queryKey: ["/api/users/me/profile"],
    staleTime: 30000, // 30 seconds
    queryFn: () => apiRequest("/api/users/me/profile"),
  });

  // Random colors for hover effects
  const colors = [
    "hsl(0, 72%, 51%)", // Jemzy Red
    "hsl(24, 100%, 48%)", // Jemzy Orange
    "hsl(207, 90%, 54%)", // Jemzy Blue
    "hsl(142, 71%, 45%)", // Jemzy Green
    "hsl(259, 53%, 70%)", // Jemzy Purple
    "hsl(45, 100%, 50%)", // Jemzy Gold
    "hsl(320, 70%, 55%)", // Pink
    "hsl(280, 65%, 60%)", // Violet
    "hsl(180, 70%, 50%)", // Cyan
    "hsl(50, 85%, 55%)", // Bright Yellow
    "hsl(15, 80%, 60%)", // Coral
    "hsl(270, 75%, 65%)", // Magenta
  ];

  const getRandomColor = () =>
    colors[Math.floor(Math.random() * colors.length)];

  // Update persistent target video ID when prop changes
  useEffect(() => {
    if (targetVideoId) {
      persistentTargetVideoId.current = targetVideoId;
      console.log("Updated persistent target video ID:", targetVideoId);
    }
  }, [targetVideoId]);

  type MapsConfig = { apiKey: string; mapId?: string };

  // Fetch Google Maps API key
  const { data: configData } = useQuery<MapsConfig>({
    queryKey: ["/api/config/maps-key"],
    retry: false,
    queryFn: () => apiRequest<MapsConfig>("/api/config/maps-key"),
  });

  const canAdvanced = !!(
    (window as any).google?.maps?.marker?.AdvancedMarkerElement &&
    configData?.mapId
  );


  function addMarker(
    position: google.maps.LatLngLiteral,
    opts: {
      title?: string;
      htmlContent?: HTMLElement | null;
      iconUrl?: string;
      iconSize?: number; // px
      zIndex?: number;
      onClick?: () => void;
    }
  ) {
    if (canAdvanced && opts.htmlContent) {
      const m = new (window as any).google.maps.marker.AdvancedMarkerElement({
        position,
        map: googleMapRef.current,
        content: opts.htmlContent,
        title: opts.title,
        zIndex: opts.zIndex,
      });
      if (opts.onClick) m.addListener("click", opts.onClick);
      return m;
    } else {
      const m = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        title: opts.title,
        zIndex: opts.zIndex,
        icon: opts.iconUrl
          ? {
              url: opts.iconUrl,
              scaledSize: new google.maps.Size(
                opts.iconSize ?? 32,
                opts.iconSize ?? 32
              ),
            }
          : undefined,
      });
      if (opts.onClick) m.addListener("click", opts.onClick as any);
      return m;
    }
  }
  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || googleMapRef.current || !configData?.apiKey)
        return;

      const loader = new Loader({
        apiKey: configData.apiKey,
        version: "weekly",
        libraries: ["places", "marker"],
      });
      loader
        .load()
        .then((google) => {
          try {
            // const google = await loader.load();

            // Center on user location if available, otherwise default to center
            const centerLocation = userLocation || {
              lat: 36.0573,
              lng: -94.1607,
            };

            const map = new google.maps.Map(mapRef.current!, {
              center: centerLocation,
              zoom: userLocation ? 19 : 12,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              ...(configData?.mapId
    ? { mapId: configData.mapId }     // when using Cloud Styled Map
    : {
        // only use styles if NO mapId:
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        ],
      }),
              disableDefaultUI: true, // Disable all default UI controls
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              rotateControl: false,
              scaleControl: false,
              panControl: false,
              gestureHandling: "greedy", // Allow all gestures
            });

            googleMapRef.current = map;
            // Add drag listener to detect when user moves the map
            const dragListener = map.addListener("dragstart", () => {
              console.log("Map drag detected, setting isUserCentered to false");
              setIsUserCentered(false);
            });
            dragListenerRef.current = dragListener;

            // Add zoom listener
            map.addListener("zoom_changed", () => {
              const newZoomLevel = map.getZoom() || 15;
              setZoomLevel(newZoomLevel);
            });

            // Add viewport change listeners for search functionality
            const boundsChangedListener = map.addListener(
              "bounds_changed",
              () => {
                if (onViewportChange && googleMapRef.current) {
                  const bounds = googleMapRef.current.getBounds();
                  const center = googleMapRef.current.getCenter();
                  if (bounds && center) {
                    onViewportChange({
                      bounds: bounds,
                      center: {
                        lat: center.lat(),
                        lng: center.lng(),
                      },
                    });
                  }
                }
              }
            );

            // Create user marker and activation circle
            createUserMarker(map);
          } catch (error) {
            console.error("Failed to load Google Maps:", error);
          }
        })
        .catch((error) => {
          console.error("Error loading Google Maps:", error);
        });
    };

    initializeMap();
  }, [configData, userLocation]);

  // Update user marker when userLocation changes and auto-center on first load
  useEffect(() => {
    if (googleMapRef.current && userLocation) {
      console.log("User location updated to:", userLocation);

      // Auto-center and zoom on first user location acquisition
      if (!isUserCentered) {
        googleMapRef.current.setCenter({
          lat: userLocation.lat,
          lng: userLocation.lng,
        });
        googleMapRef.current.setZoom(19);
        setIsUserCentered(true);
        setCurrentMapCenter(userLocation);
      }

      createUserMarker(googleMapRef.current);
    }
  }, [userLocation]);

  // Update activation circle when videos change or lantern state changes
  useEffect(() => {
    if (googleMapRef.current && userLocation) {
      createUserMarker(googleMapRef.current);
    }
  }, [videos, userLocation, lanternState]);

  // Update user marker when profile image changes
  useEffect(() => {
    if (googleMapRef.current && userLocation) {
      console.log(
        "Profile image changed, updating user marker:",
        userProfileImage
      );
      createUserMarker(googleMapRef.current);
    }
  }, [userProfileImage]);

  // Function to create user marker and activation circle
  const createUserMarker = (map: any) => {
    if (!userLocation) return;

    // Remove existing user marker and circle
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }
    if (activationCircleRef.current) {
      activationCircleRef.current.setMap(null);
    }

    // Check if there are videos within activation radius
    const videosInRadius = videos.filter((video) => {
      if (!video.latitude || !video.longitude) return false;
      const videoLat = parseFloat(video.latitude);
      const videoLng = parseFloat(video.longitude);
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        videoLat,
        videoLng
      );
      return distance <= 30.48; // 100 feet in meters
    });

    const hasVideosNearby = videosInRadius.length > 0;

    // Create activation circle (100 feet radius) - only when lantern is NOT active
    const googleMaps = (window as any).google?.maps;
    if (!googleMaps) return;

    if (!lanternState?.isActive) {
      activationCircleRef.current = new googleMaps.Circle({
        strokeColor: hasVideosNearby ? "#22C55E" : "#6B7280",
        strokeOpacity: hasVideosNearby ? 0.8 : 0.5,
        strokeWeight: 2,
        fillColor: hasVideosNearby ? "#22C55E" : "#000000",
        fillOpacity: hasVideosNearby ? 0.2 : 0.1,
        map: map,
        center: userLocation,
        radius: 30.48, // 100 feet in meters
      });
    }

    // Create user marker - show play button instead of profile when videos are nearby (but hide when lantern is active)
    let userIcon;
    if (hasVideosNearby && !lanternState?.isActive) {
      // Show play button instead of profile icon (only when lantern is NOT active)
      userIcon = {
        url:
          "data:image/svg+xml;base64," +
          btoa(`
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#22C55E" fill-opacity="0.9"/>
            <circle cx="20" cy="20" r="18" stroke="white" stroke-width="2"/>
            <path d="M15 12L15 28L28 20L15 12Z" fill="white"/>
          </svg>
        `),
        scaledSize: new googleMaps.Size(40, 40),
        anchor: new googleMaps.Point(20, 20),
      };
    } else {
      // Regular user marker - use actual profile image with circular styling
      if (userProfileImage) {
        // Use a fallback icon for now, we'll create custom HTML marker below
        userIcon = null; // We'll handle this with AdvancedMarkerElement
      } else {
        // Fallback to default user icon only if no profile image available
        userIcon = {
          url:
            "data:image/svg+xml;base64," +
            btoa(`
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.15)"/>
                </filter>
              </defs>
              <circle cx="22" cy="22" r="21" fill="#3B82F6" filter="url(#shadow)"/>
              <circle cx="22" cy="22" r="20" fill="#3B82F6"/>
              <path d="M22 22C19.5 22 17.5 20 17.5 17.5S19.5 13 22 13s4.5 2 4.5 4.5S24.5 22 22 22Zm0 3.5c-2.33 0-7 2.33-7 7v1h7.5 6.5V32.5c0-4.67-4.67-7-7-7Z" fill="white"/>
            </svg>
          `),
          scaledSize: new googleMaps.Size(44, 44),
          anchor: new googleMaps.Point(22, 22),
        };
      }
    }

    // When lantern is active, show user's actual GPS location as a separate marker
    if (lanternState?.isActive) {
      // Create simple GPS location marker when lantern is active
      const gpsLocationIcon = {
        url:
          "data:image/svg+xml;base64," +
          btoa(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
          </svg>
        `),
        scaledSize: new googleMaps.Size(24, 24),
        anchor: new googleMaps.Point(12, 12),
      };

      userMarkerRef.current = new googleMaps.Marker({
        position: userLocation,
        map: map,
        icon: gpsLocationIcon,
        title: "Your GPS Location",
        zIndex: 5000,
      });
    }
    // Create user marker - use AdvancedMarkerElement for profile images (when lantern is not active and no videos nearby)
    else if (userProfileImage && !hasVideosNearby && !lanternState?.isActive) {
      // Create custom HTML element for profile image
      const profileElement = document.createElement("div");
      profileElement.style.cssText = `
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        background-color: #f0f0f0;
        cursor: pointer;
      `;

      const img = document.createElement("img");
      img.src =
        userProfileImage +
        (userProfileImage.includes("?") ? "&" : "?") +
        "t=" +
        Date.now();
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      img.onerror = () => {
        // Fallback if image fails to load
        profileElement.innerHTML = `
          <div style="width: 100%; height: 100%; background-color: #3B82F6; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        `;
      };
      profileElement.appendChild(img);

      // Try to use AdvancedMarkerElement if available
      if (googleMaps.marker && googleMaps.marker.AdvancedMarkerElement) {
        userMarkerRef.current = new googleMaps.marker.AdvancedMarkerElement({
          position: userLocation,
          map: map,
          content: profileElement,
          zIndex: 10000,
        });
      } else {
        // Fallback to regular marker with icon
        userMarkerRef.current = new googleMaps.Marker({
          position: userLocation,
          map: map,
          icon: userIcon || {
            url:
              "data:image/svg+xml;base64," +
              btoa(`
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.15)"/>
                  </filter>
                </defs>
                <circle cx="22" cy="22" r="21" fill="#3B82F6" filter="url(#shadow)"/>
                <circle cx="22" cy="22" r="20" fill="#3B82F6"/>
                <path d="M22 22C19.5 22 17.5 20 17.5 17.5S19.5 13 22 13s4.5 2 4.5 4.5S24.5 22 22 22Zm0 3.5c-2.33 0-7 2.33-7 7v1h7.5 6.5V32.5c0-4.67-4.67-7-7-7Z" fill="white"/>
              </svg>
            `),
            scaledSize: new googleMaps.Size(44, 44),
            anchor: new googleMaps.Point(22, 22),
          },
          title: "Your Location",
          zIndex: 10000,
        });
      }
    } else {
      // Use regular marker for play button or fallback
      userMarkerRef.current = new googleMaps.Marker({
        position: userLocation,
        map: map,
        icon: userIcon,
        title: hasVideosNearby
          ? `${videosInRadius.length} video${
              videosInRadius.length > 1 ? "s" : ""
            } available nearby`
          : "Your Location",
        zIndex: 10000, // Ensure play button appears above all gem markers
      });
    }

    // Add click listener to user marker
    if (hasVideosNearby) {
      // Videos nearby - play videos in radius
      userMarkerRef.current.addListener("click", () => {
        playGroupPlaySound(); // Play magical wand sound for group video playback
        if (onPlayVideosInRadius) {
          onPlayVideosInRadius(videosInRadius);
        }
      });
    } else {
      // No videos nearby - show instructions modal when clicking profile picture
      userMarkerRef.current.addListener("click", () => {
        setShowInstructions(true);
      });
    }
  };

  // Add treasure chest markers to Google Maps
  useEffect(() => {
    if (!googleMapRef.current || !treasureChests.length) return;

    console.log("🎁 Adding treasure chest markers:", treasureChests.length);

    // Remove all existing markers to recreate with new zoom sizing
    treasureMarkersRef.current.forEach((markerData, chestId) => {
      if (typeof markerData === "object" && markerData.marker) {
        markerData.marker.setMap(null);
        markerData.circle?.setMap(null);
      } else {
        (markerData as any).setMap(null);
      }
    });
    treasureMarkersRef.current.clear();

    treasureChests.forEach((chest) => {
      const position = {
        lat: parseFloat(chest.latitude),
        lng: parseFloat(chest.longitude),
      };

      // Apply same zoom-based sizing as gem markers
      const baseIconSize = zoomLevel < 15 ? 32 : 48;
      const iconSize = baseIconSize;

      // Create treasure chest marker content
      const markerContent = createTreasureMarker(chest, iconSize, zoomLevel);

      const chestMarker = addMarker(position, {
        title: `Treasure Chest - ${chest.coinReward} coins`,
        // htmlContent: markerContent, // used if advanced is available
        htmlContent: canAdvanced ? markerContent : null,
        iconUrl: canAdvanced ? undefined : treasureIcon, // fallback icon
        iconSize: iconSize,
        zIndex: 5000,
        onClick: () => handleTreasureChestClick(chest),
      });
      // Get difficulty-based colors for the circle
      const getDifficultyCircleColor = (difficulty: string) => {
        switch (difficulty) {
          case "easy":
            return "#22C55E"; // Green
          case "medium":
            return "#3B82F6"; // Blue
          case "hard":
            return "#F97316"; // Orange
          case "very_hard":
            return "#EF4444"; // Red
          case "extreme":
            return "#A855F7"; // Purple
          default:
            return "#FFD700"; // Gold fallback
        }
      };

      const circleColor = getDifficultyCircleColor(chest.difficulty);

      // Add 100-foot transparent circle around treasure chest with difficulty color
      const treasureCircle = new google.maps.Circle({
        strokeColor: circleColor,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: circleColor,
        fillOpacity: 0.15,
        map: googleMapRef.current,
        center: position,
        radius: 30.48, // 100 feet in meters
      });

      // Add click listener for collection
      chestMarker.addListener("click", () => handleTreasureChestClick(chest));

      treasureMarkersRef.current.set(chest.id, {
        marker: chestMarker,
        circle: treasureCircle,
      });
      console.log("🎁 Added treasure chest marker:", chest.id, "at", position);
    });

    // Remove markers for treasure chests that no longer exist
    treasureMarkersRef.current.forEach((markerData, chestId) => {
      const chestExists = treasureChests.some((chest) => chest.id === chestId);
      if (!chestExists) {
        if (typeof markerData === "object" && markerData.marker) {
          markerData.marker.setMap(null);
          markerData.circle?.setMap(null);
        } else {
          // Legacy marker handling
          (markerData as any).setMap(null);
        }
        treasureMarkersRef.current.delete(chestId);
        console.log("🎁 Removed treasure chest marker:", chestId);
      }
    });
  }, [treasureChests, zoomLevel]);

  // Add mystery box markers to Google Maps
  useEffect(() => {
    if (!googleMapRef.current || !mysteryBoxes.length) return;

    console.log("🎁 Adding mystery box markers:", mysteryBoxes.length);

    // Remove all existing markers to recreate with new zoom sizing
    mysteryBoxMarkersRef.current.forEach((markerData, boxId) => {
      if (typeof markerData === "object" && markerData.marker) {
        markerData.marker.setMap(null);
        markerData.circle?.setMap(null);
      } else {
        (markerData as any).setMap(null);
      }
    });
    mysteryBoxMarkersRef.current.clear();

    mysteryBoxes.forEach((box) => {
      const position = {
        lat: parseFloat(box.latitude),
        lng: parseFloat(box.longitude),
      };

      // Apply same zoom-based sizing as gem markers
      const baseIconSize = zoomLevel < 15 ? 32 : 48;
      const iconSize = baseIconSize;

      // Create mystery box marker content
      const markerContent = createMysteryBoxMarker(box, iconSize, zoomLevel);

      const boxMarker = addMarker(position, {
        title: `Mystery Box: ${box.rarity} - ${box.coinReward}c ${box.xpReward}xp ${box.lanternReward}l`,
        htmlContent: canAdvanced? markerContent: null,
        iconUrl: canAdvanced ? undefined : mysteryBoxIcon,
        iconSize: iconSize,
        zIndex: 5100,
        onClick: () => handleMysteryBoxClick(box),
      });

      // Get rarity-based colors for the circle
      const getRarityCircleColor = (rarity: string) => {
        switch (rarity) {
          case "common":
            return "#6B7280"; // Gray
          case "rare":
            return "#3B82F6"; // Blue
          case "epic":
            return "#8B5CF6"; // Purple
          case "legendary":
            return "#F59E0B"; // Gold
          default:
            return "#6B7280"; // Gray fallback
        }
      };

      const circleColor = getRarityCircleColor(box.rarity);

      // Add 100-foot transparent circle around mystery box with rarity color
      const mysteryBoxCircle = new google.maps.Circle({
        strokeColor: circleColor,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: circleColor,
        fillOpacity: 0.15,
        map: googleMapRef.current,
        center: position,
        radius: 30.48, // 100 feet in meters
      });

      // Add click listener for collection
      console.log("🎁 Adding click listener to mystery box marker:", box.id);
      boxMarker.addListener("click", () => {
        console.log("🎁 Click event fired for mystery box:", box.id);
        handleMysteryBoxClick(box);
      });

      mysteryBoxMarkersRef.current.set(box.id, {
        marker: boxMarker,
        circle: mysteryBoxCircle,
      });

      console.log("🎁 Added mystery box marker:", box.id, "at", position);
    });

    // Remove markers for mystery boxes that no longer exist
    mysteryBoxMarkersRef.current.forEach((markerData, boxId) => {
      const boxExists = mysteryBoxes.some((box) => box.id === boxId);
      if (!boxExists) {
        if (typeof markerData === "object" && markerData.marker) {
          markerData.marker.setMap(null);
          markerData.circle?.setMap(null);
        } else {
          (markerData as any).setMap(null);
        }
        mysteryBoxMarkersRef.current.delete(boxId);
        console.log("🎁 Removed mystery box marker:", boxId);
      }
    });
  }, [mysteryBoxes, zoomLevel]);

  // Add lantern marker when active
  useEffect(() => {
    if (!googleMapRef.current) return;

    // Remove existing lantern marker and circle
    if (lanternMarker) {
      lanternMarker.map = null;
      setLanternMarker(null);
    }
    if (lanternCircle) {
      lanternCircle.setMap(null);
      setLanternCircle(null);
    }
    if (lanternListenerRef.current) {
      google.maps.event.removeListener(lanternListenerRef.current);
      lanternListenerRef.current = null;
    }

    // Only create lantern marker if active
    if (lanternState?.isActive) {
      // Get center of current map view for pinned positioning
      const mapCenter = googleMapRef.current.getCenter();
      const centerPosition = {
        lat: mapCenter.lat(),
        lng: mapCenter.lng(),
      };

      // Create orange gradient circle for 100ft play circle (30.48 meters)
      const circle = new google.maps.Circle({
        strokeColor: "#FF8C00", // Dark orange
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#FFA500", // Orange
        fillOpacity: 0.2,
        map: googleMapRef.current,
        center: centerPosition,
        radius: 30.48, // 100 feet in meters
      });
      setLanternCircle(circle);

      // Create lantern marker at screen center
      const markerContent = createLanternMarker(userLanterns || 0);

      const marker = addMarker(centerPosition, {
        title: "Lantern",
        htmlContent: canAdvanced
          ? createLanternMarker(userLanterns || 0)
          : null,
        iconUrl: canAdvanced ? undefined : lanternIcon,
        iconSize: 48,
        zIndex: 15000,
        onClick: () =>
          userLanterns
            ? onLanternActivate?.(centerPosition)
            : onLanternPurchase?.(),
      });

      setLanternMarker(marker);

      // Update lantern position when map moves to keep it center-pinned
      const centerChangedListener = googleMapRef.current.addListener(
        "center_changed",
        () => {
          const newCenter = googleMapRef.current.getCenter();
          const newPosition = {
            lat: newCenter.lat(),
            lng: newCenter.lng(),
          };

          // Update circle position
          circle.setCenter(newPosition);
          // Update marker position
          marker.position = newPosition;
        }
      );

      // Store marker with listener reference for cleanup
      setLanternMarker(marker);
      // Store listener separately for cleanup
      lanternListenerRef.current = centerChangedListener;
    }
  }, [lanternState, googleMapRef.current]);

  // Handle treasure chest collection
  const handleTreasureChestClick = async (chest: TreasureChest) => {
    // Always show modal - location check will be handled inside the modal
    setSelectedTreasureChest(chest);
    setShowTreasureChestModal(true);
  };

  // Handle mystery box click
  const handleMysteryBoxClick = async (box: MysteryBox) => {
    console.log("🎁 Mystery box clicked:", box.id, box);
    // Always show modal - location check will be handled inside the modal
    setSelectedMysteryBox(box);
    setShowMysteryBoxModal(true);
    console.log(
      "🎁 Modal should open now - selectedBox:",
      box.id,
      "showModal:",
      true
    );
  };

  // Handle actual treasure chest collection from modal
  const handleTreasureChestCollect = async (chest: TreasureChest) => {
    if (!userLocation) return;

    try {
      const response = await fetch(`/api/treasure-chests/${chest.id}/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Play treasure chest opening sound effect
        playTreasureChestOpeningSound();

        // Remove the collected chest marker
        const marker = treasureMarkersRef.current.get(chest.id);
        if (marker) {
          marker.setMap(null);
          treasureMarkersRef.current.delete(chest.id);
        }

        // Close modal after successful collection
        setShowTreasureChestModal(false);
        setSelectedTreasureChest(null);

        // Success is now handled by the modal
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("🎁 Error collecting treasure chest:", error);
      throw error;
    }
  };

  // Handle mystery box collection from modal
  const handleMysteryBoxCollect = async (box: MysteryBox) => {
    if (!userLocation) return;

    try {
      const response = await fetch(`/api/mystery-boxes/${box.id}/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Play magical wand sound effect for mystery box
        playLanternSound();

        // Remove the collected box marker
        const markerData = mysteryBoxMarkersRef.current.get(box.id);
        if (markerData) {
          if (typeof markerData === "object" && markerData.marker) {
            markerData.marker.setMap(null);
            markerData.circle?.setMap(null);
          } else {
            (markerData as any).setMap(null);
          }
          mysteryBoxMarkersRef.current.delete(box.id);
        }

        // Close modal after successful collection
        setShowMysteryBoxModal(false);
        setSelectedMysteryBox(null);

        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("🎁 Error collecting mystery box:", error);
      throw error;
    }
  };

  // Handle dragon click
  const handleDragonClick = (dragon: Dragon) => {
    setSelectedDragonId(dragon.id);
    setShowDragonModal(true);
  };

  // Handle dragon defeat event
  const handleDragonDefeated = () => {
    // Refresh dragons query to remove defeated dragon
    // This will be handled by the modal's onDragonDefeated callback
  };

  // Add video markers to Google Maps
  useEffect(() => {
    console.log(
      "Marker placement effect running - videos:",
      videos?.length,
      "googleMap:",
      !!googleMapRef.current
    );

    if (!googleMapRef.current) {
      console.log("Google Maps not ready yet, skipping marker placement");
      return;
    }

    if (!videos || videos.length === 0) {
      console.log("No videos to place markers for");
      return;
    }

    console.log("Adding markers to Google Maps:", videos.length, "videos");

    // Map category colors to hex values
    const getCategoryHexColor = (category: string) => {
      const colorMap = {
        art: "#ef4444", // red-500
        education: "#f97316", // orange-500
        review: "#eab308", // yellow-500
        games: "#22c55e", // green-500
        events: "#3b82f6", // blue-500
        products: "#a855f7", // purple-500
        services: "#ec4899", // pink-500
        challenge: "#374151", // gray-800
        chat: "#06b6d4", // cyan-500
        fyi: "#1d4ed8", // blue-700
        love: "#ddd6fe", // purple-300
        nature: "#a3e635", // lime-400
        coupon: "#6ee7b7", // emerald-300
      };
      return colorMap[category as keyof typeof colorMap] || "#6b7280"; // gray-500
    };

    // Filter videos based on all criteria
    const filteredVideos = videos
      .filter((video) => (hideWatchedVideos ? !video.watchedByUser : true))
      .filter((video) => {
        // Category filter
        if (selectedCategories.length === 0) return true;
        return selectedCategories.some(
          (cat) => video.category.toLowerCase() === cat.toLowerCase()
        );
      })
      .filter((video) => {
        // Date range filter
        if (!appliedFilters || appliedFilters.dateRange === "all") return true;
        if (!video.createdAt) return true;

        const videoDate = toDate(video.createdAt!);
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;

        switch (appliedFilters.dateRange) {
          case "today":
            return now.getTime() - videoDate.getTime() < dayMs;
          case "this week":
            return now.getTime() - videoDate.getTime() < 7 * dayMs;
          case "this month":
            return now.getTime() - videoDate.getTime() < 30 * dayMs;
          default:
            return true;
        }
      })
      .filter((video) => {
        // Group filter
        if (
          !appliedFilters ||
          !appliedFilters.groups ||
          appliedFilters.groups.length === 0
        )
          return true;
        return appliedFilters.groups.includes(video.groupName || "");
      })
      .filter((video) => video.latitude && video.longitude);

    // Process filtered videos for marker creation

    // Get current video IDs
    const currentVideoIds = new Set(filteredVideos.map((video) => video.id));

    // Remove markers for videos that no longer exist or don't match filters
    markersMapRef.current.forEach((marker, videoId) => {
      if (!currentVideoIds.has(videoId)) {
        marker.setMap(null);
        markersMapRef.current.delete(videoId);
      }
    });

    // Check for and remove duplicate markers at same positions
    const positionMap = new Map<string, string[]>();
    markersMapRef.current.forEach((marker, videoId) => {
      // Handle both regular Marker and AdvancedMarkerElement
      let pos;
      if (marker.getPosition && typeof marker.getPosition === "function") {
        // Regular Marker
        pos = marker.getPosition();
      } else if (marker.position) {
        // AdvancedMarkerElement
        pos = marker.position;
      }

      if (pos) {
        let lat, lng;
        if (typeof pos.lat === "function") {
          lat = pos.lat();
          lng = pos.lng();
        } else {
          lat = pos.lat;
          lng = pos.lng;
        }
        const posKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        if (!positionMap.has(posKey)) {
          positionMap.set(posKey, []);
        }
        positionMap.get(posKey)!.push(videoId);
      }
    });

    // Remove duplicate markers (keep only the first one at each position)
    positionMap.forEach((videoIds, posKey) => {
      if (videoIds.length > 1) {
        // Keep the first marker, remove the rest
        for (let i = 1; i < videoIds.length; i++) {
          const duplicateMarker = markersMapRef.current.get(videoIds[i]);
          if (duplicateMarker) {
            duplicateMarker.setMap(null);
            markersMapRef.current.delete(videoIds[i]);
          }
        }
      }
    });

    // Sort videos by ID to ensure consistent ordering
    const sortedVideos = filteredVideos.sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    // Track new markers for proper handling
    const newMarkers: any[] = [];

    // Process each video
    sortedVideos.forEach((video, index) => {
      console.log(
        "Processing video for marker:",
        video.id,
        video.title,
        video.category
      );

      if (!video.latitude || !video.longitude) {
        console.log("Skipping video - missing location:", video.id);
        return;
      }

      const position = {
        lat: parseFloat(video.latitude),
        lng: parseFloat(video.longitude),
      };

      console.log("Creating marker at position:", position);

      const opacity = video.watchedByUser ? 0.3 : 1.0;
      const existingMarker = markersMapRef.current.get(video.id);

      console.log("Existing marker found:", !!existingMarker);

      if (existingMarker) {
        // Update existing marker with custom gem icon - size based on zoom level
        const baseIconSize = zoomLevel < 11 ? 24 : 48; // Larger base size for gem visibility
        const isHighlighted = highlightedVideoId === video.id;
        const iconSize = Math.min(
          48,
          isHighlighted ? baseIconSize * 1.2 : baseIconSize
        ); // Cap at 48px max

        // Handle event markers with countdown - update existing marker instead of removing
        if (video.category === "events") {
          const countdown = getEventCountdown(
            video.eventStartDate,
            video.eventStartTime
          );
          if (countdown) {
            // Update existing marker to show countdown, maintaining pinning behavior
            const iconSize = Math.min(
              48,
              baseIconSize * (isHighlighted ? 1.2 : 1.0)
            );
            const customContent = createAdvancedMarkerContent(
              iconSize,
              video,
              zoomLevel,
              countdown || undefined
            );

            // Check if this is already an AdvancedMarkerElement
            if (existingMarker.content !== undefined) {
              // Update existing AdvancedMarkerElement content and ensure position is correct
              existingMarker.content = customContent;
              existingMarker.position = {
                lat: position.lat,
                lng: position.lng,
              };
              console.log(
                "Updated existing AdvancedMarkerElement for event:",
                video.title
              );
            } else {
              // Convert regular marker to AdvancedMarkerElement while maintaining position
              // existingMarker.setMap(null);
              // markersMapRef.current.delete(video.id);

              // const advancedMarker = new (
              //   window as any
              // ).google.maps.marker.AdvancedMarkerElement({
              //   position: { lat: position.lat, lng: position.lng },
              //   map: googleMapRef.current,
              //   content: customContent,
              //   title: video.title,
              //   gmpDraggable: false, // Ensure marker is not draggable to prevent floating
              // });

              // advancedMarker.addListener("click", () => {
              //   console.log(
              //     "Advanced marker clicked for video:",
              //     video.id,
              //     video.title
              //   );
              //   handleVideoClick(video);
              // });

              // markersMapRef.current.set(video.id, advancedMarker);
              // console.log(
              //   "Converted regular marker to AdvancedMarkerElement for event:",
              //   video.title
              // );
            }
            return; // Skip regular marker processing
          } else {
            // Continue to regular marker logic for events without countdown
            console.log(
              "Event countdown for",
              video.title,
              ":",
              countdown,
              "startDate:",
              video.eventStartDate,
              "startTime:",
              video.eventStartTime
            );
          }
        }

        // Convert regular marker to AdvancedMarkerElement for consistency
        if (existingMarker.content === undefined) {
          // // This is a regular marker, convert to AdvancedMarkerElement
          // existingMarker.setMap(null);
          // markersMapRef.current.delete(video.id);

          // const customContent = createAdvancedMarkerContent(
          //   iconSize,
          //   video,
          //   zoomLevel
          // );

          // const advancedMarker = new (
          //   window as any
          // ).google.maps.marker.AdvancedMarkerElement({
          //   position: { lat: position.lat, lng: position.lng },
          //   map: googleMapRef.current,
          //   content: customContent,
          //   title: video.title,
          //   gmpDraggable: false,
          // });

          // advancedMarker.addListener("click", () => {
          //   console.log(
          //     "Advanced marker clicked for video:",
          //     video.id,
          //     video.title
          //   );
          //   handleVideoClick(video);
          // });

          // markersMapRef.current.set(video.id, advancedMarker);
          // console.log(
          //   "Converted regular marker to AdvancedMarkerElement for:",
          //   video.title
          // );
        } else {
          // This is already an AdvancedMarkerElement, just update content
          // const customContent = createAdvancedMarkerContent(
          //   iconSize,
          //   video,
          //   zoomLevel
          // );
          // existingMarker.content = customContent;
          // existingMarker.position = { lat: position.lat, lng: position.lng };
          // console.log(
          //   "Updated existing AdvancedMarkerElement for:",
          //   video.title
          // );
        }

        // Debug marker visibility
        // Log marker details with proper type checking
        let markerPosition;
        if (
          existingMarker.getPosition &&
          typeof existingMarker.getPosition === "function"
        ) {
          markerPosition = existingMarker.getPosition()?.toString();
        } else if (existingMarker.position) {
          markerPosition = `(${existingMarker.position.lat}, ${existingMarker.position.lng})`;
        }
        console.log(
          "Updated existing AdvancedMarkerElement - position:",
          markerPosition
        );
      } else {
        // Check if there's already a marker at this very close position (within 1 meter)
        let markerExistsAtPosition = false;
        markersMapRef.current.forEach((existingMarker, existingId) => {
          if (existingId !== video.id) {
            // Get position with proper type checking
            let existingPos;
            if (
              existingMarker.getPosition &&
              typeof existingMarker.getPosition === "function"
            ) {
              existingPos = existingMarker.getPosition();
            } else if (existingMarker.position) {
              existingPos = existingMarker.position;
            }
            if (existingPos) {
              // Calculate distance in meters - only block if markers are within 1 meter
              let existingLat, existingLng;
              if (typeof existingPos.lat === "function") {
                // Google Maps LatLng object
                existingLat = existingPos.lat();
                existingLng = existingPos.lng();
              } else if (typeof existingPos.lat === "number") {
                // Plain object with lat/lng properties
                existingLat = existingPos.lat;
                existingLng = existingPos.lng;
              } else {
                // Skip if we can't determine position
                return;
              }
              const latDiff = existingLat - position.lat;
              const lngDiff = existingLng - position.lng;
              const distanceMeters =
                Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough conversion to meters

              if (distanceMeters < 1) {
                // Only block if within 1 meter
                markerExistsAtPosition = true;
              }
            }
          }
        });

        if (!markerExistsAtPosition) {
          // Create AdvancedMarkerElement for all new markers
          const isHighlighted = highlightedVideoId === video.id;
          const baseIconSize = zoomLevel < 15 ? 32 : 48;
          const iconSize = Math.min(
            48,
            isHighlighted ? baseIconSize * 1.2 : baseIconSize
          );

          // Check for event countdown
          let countdown = undefined;
          if (video.category === "events") {
            countdown = getEventCountdown(
              video.eventStartDate,
              video.eventStartTime
            );
            console.log(
              "Event countdown for",
              video.title,
              "(new marker):",
              countdown,
              "startDate:",
              video.eventStartDate,
              "startTime:",
              video.eventStartTime
            );
          }

          const customContent = createAdvancedMarkerContent(
            iconSize,
            video,
            zoomLevel,
            countdown || undefined
          );

          // const advancedMarker = new (
          //   window as any
          // ).google.maps.marker.AdvancedMarkerElement({
          //   position: { lat: position.lat, lng: position.lng },
          //   map: googleMapRef.current,
          //   content: customContent,
          //   title: video.title,
          //   gmpDraggable: false,
          // });

          const m = addMarker(position, {
  title: video.title,
  htmlContent: customContent,
  iconUrl: customContent ? undefined : (countdown ? createEventMarkerWithCountdown(countdown, iconSize) : (categoryIcons[video.category as keyof typeof categoryIcons]?.url || categoryIcons.default.url)),
  iconSize: iconSize,
  zIndex: 4000,
  onClick: () => handleVideoClick(video),
});

          console.log("New AdvancedMarkerElement created for:", video.title);

          // Add click listener for AdvancedMarkerElement
          m.addListener("click", () => {
            console.log(
              "Advanced marker clicked for video:",
              video.id,
              video.title
            );
            console.log("Target video ID (prop):", targetVideoId);
            console.log(
              "Persistent target video ID:",
              persistentTargetVideoId.current
            );

            // Use persistent target video ID that survives re-renders
            const activeTargetVideoId = persistentTargetVideoId.current;

            // If we have a target video ID, prioritize it over others at the same location
            if (activeTargetVideoId) {
              const targetVideo = videos.find(
                (v) => v.id === activeTargetVideoId
              );
              console.log(
                "Found target video:",
                targetVideo?.id,
                targetVideo?.title
              );
              console.log("Location match check:", {
                targetLat: targetVideo?.latitude,
                targetLng: targetVideo?.longitude,
                clickedLat: video.latitude,
                clickedLng: video.longitude,
                match:
                  targetVideo &&
                  targetVideo.latitude === video.latitude &&
                  targetVideo.longitude === video.longitude,
              });

              if (
                targetVideo &&
                targetVideo.latitude === video.latitude &&
                targetVideo.longitude === video.longitude
              ) {
                console.log("Using target video:", targetVideo.id);
                persistentTargetVideoId.current = null; // Clear after use
                handleVideoClick(targetVideo);
                return;
              }
            }

            // Default behavior - click on the specific marker video
            console.log("Using clicked marker video:", video.id);
            handleVideoClick(video);
          });

          markersMapRef.current.set(video.id, m);
        }
      }
    });

    // Update markersRef for compatibility
    markersRef.current = Array.from(markersMapRef.current.values());
  }, [
    videos,
    hideWatchedVideos,
    selectedCategories,
    appliedFilters,
    googleMapRef.current,
    highlightedVideoId,
  ]);

  // Update marker sizes when zoom level changes
  useEffect(() => {
    if (!googleMapRef.current) return;

    console.log(
      "Zoom level changed to:",
      zoomLevel,
      "Total markers:",
      markersMapRef.current.size
    );

    markersMapRef.current.forEach((marker, videoId) => {
      const video = videos.find((v) => v.id === videoId);
      if (video) {
        // Update AdvancedMarkerElement content based on zoom level
        const baseIconSize = zoomLevel < 15 ? 32 : 48;
        const isHighlighted = highlightedVideoId === video.id;
        const iconSize = Math.min(
          48,
          isHighlighted ? baseIconSize * 1.2 : baseIconSize
        );

        // Check for event countdown
        let countdown = undefined;
        if (video.category === "events") {
          countdown = getEventCountdown(
            video.eventStartDate,
            video.eventStartTime
          );
        }

        const customContent = createAdvancedMarkerContent(
          iconSize,
          video,
          zoomLevel,
          countdown || undefined
        );

        // Update AdvancedMarkerElement content
        if (marker.content !== undefined) {
          marker.content = customContent;
        }
      }
    });

    // Update quest marker sizes when zoom level changes
    questMarkersRef.current.forEach((questMarker, questId) => {
      const quest = activeQuests.find((q: any) => q.id === questId);
      if (quest) {
        // Recreate quest marker content with new size
        const questCountdown = getQuestCountdown(quest.endDate);

        const questMarkerContent = document.createElement("div");
        questMarkerContent.className = "quest-marker-content";
        questMarkerContent.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
        `;

        if (zoomLevel < 13) {
          // Small circular marker for zoomed out views (same as video markers)
          const iconElement = document.createElement("div");
          iconElement.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #FFD700;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          `;
          questMarkerContent.appendChild(iconElement);
        } else {
          // Full quest marker for zoomed in views
          const baseQuestSize = zoomLevel < 15 ? 32 : 48;

          if (quest.imageUrl) {
            const circleContainer = document.createElement("div");
            circleContainer.className = "circle-container";
            circleContainer.style.cssText = `
              width: ${baseQuestSize}px;
              height: ${baseQuestSize}px;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid #FFD700;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              justify-content: center;
              align-items: center;
            `;

            const questImageElement = document.createElement("img");
            questImageElement.className = "user-quest-image";
            questImageElement.src = quest.imageUrl.startsWith(
              "/uploads/quest-images/"
            )
              ? quest.imageUrl.replace("/uploads/quest-images/", "/uploads/")
              : quest.imageUrl;
            questImageElement.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            `;

            // Add error handling for expired URLs
            questImageElement.onerror = () => {
              console.log("Quest marker image failed to load:", quest.imageUrl);
              // Hide the image and show fallback
              questImageElement.style.display = "none";
              // Create fallback icon with quest title initial
              const fallbackIcon = document.createElement("div");
              fallbackIcon.textContent = quest.title.charAt(0).toUpperCase();
              fallbackIcon.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: white;
                font-weight: bold;
                font-size: ${baseQuestSize * 0.4}px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
              `;
              circleContainer.appendChild(fallbackIcon);
            };

            const questScrollIcon = document.createElement("img");
            questScrollIcon.className = "quest-scroll-overlay-icon";
            questScrollIcon.src = questIcon;
            questScrollIcon.style.cssText = `
              position: absolute;
              width: ${Math.max(16, baseQuestSize * 0.5)}px;
              height: ${Math.max(16, baseQuestSize * 0.5)}px;
              top: -3px;
              right: -3px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            `;

            circleContainer.appendChild(questImageElement);
            questMarkerContent.appendChild(circleContainer);
            questMarkerContent.appendChild(questScrollIcon);
          } else {
            const questIconElement = document.createElement("img");
            questIconElement.src = questIcon;
            questIconElement.style.cssText = `
              width: ${baseQuestSize}px;
              height: ${baseQuestSize}px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            `;
            questMarkerContent.appendChild(questIconElement);
          }

          // Only show label for zoomed in views
          const questLabel = document.createElement("div");
          questLabel.textContent = questCountdown || quest.title;
          questLabel.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 4px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          questMarkerContent.appendChild(questLabel);
        }

        // Update quest marker content
        if (questMarker.content !== undefined) {
          questMarker.content = questMarkerContent;
        }
      }
    });
  }, [zoomLevel, videos, highlightedVideoId, activeQuests]);

  // Quest markers effect - add quest markers with radius circles
  useEffect(() => {
    if (!googleMapRef.current || !activeQuests || activeQuests.length === 0) {
      return;
    }

    console.log(
      "Adding quest markers to Google Maps:",
      activeQuests.length,
      "quests"
    );

    // Remove quest markers that no longer exist
    const currentQuestIds = new Set(activeQuests.map((quest: any) => quest.id));
    questMarkersRef.current.forEach((marker, questId) => {
      if (!currentQuestIds.has(questId)) {
        marker.setMap(null);
        questMarkersRef.current.delete(questId);
      }
    });

    // Remove quest circles that no longer exist
    questCirclesRef.current.forEach((circle, questId) => {
      if (!currentQuestIds.has(questId)) {
        circle.setMap(null);
        questCirclesRef.current.delete(questId);
      }
    });

    // Create or update quest markers and radius circles
    activeQuests.forEach((quest) => {
      if (!quest.latitude || !quest.longitude) return;

      const position = {
        lat: parseFloat(quest.latitude.toString()),
        lng: parseFloat(quest.longitude.toString()),
      };

      // Calculate quest countdown
      const questCountdown = getQuestCountdown(quest.endDate);

      const questRadius = quest.radiusInMeters || 100; // Default 100 meters

      // Create or update radius circle
      let existingCircle = questCirclesRef.current.get(quest.id);
      if (existingCircle) {
        // Update existing circle
        existingCircle.setCenter(position);
        existingCircle.setRadius(questRadius);
      } else {
        // Create new radius circle
        const radiusCircle = new (window as any).google.maps.Circle({
          strokeColor: "#FFD700", // Gold color for quest radius
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: "#FFD700",
          fillOpacity: 0.15,
          map: googleMapRef.current,
          center: position,
          radius: questRadius,
          zIndex: 1, // Behind markers
        });

        questCirclesRef.current.set(quest.id, radiusCircle);
        console.log(
          "Created quest radius circle for:",
          quest.title,
          "radius:",
          questRadius
        );
      }

      // Create or update quest marker
      let existingMarker = questMarkersRef.current.get(quest.id);
      if (existingMarker) {
        // Update existing marker position
        existingMarker.position = position;
        console.log("Updated existing quest marker for:", quest.title);
      } else {
        // Create quest marker content with custom icon or uploaded image
        const questMarkerContent = document.createElement("div");
        questMarkerContent.className = "quest-marker-content";
        questMarkerContent.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: auto;
          padding-right: 15px;
        `;

        if (zoomLevel < 13) {
          // Small circular marker for zoomed out views (same as video markers)
          const iconElement = document.createElement("div");
          iconElement.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #FFD700;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          `;
          questMarkerContent.appendChild(iconElement);
        } else {
          // Full quest marker for zoomed in views
          const baseQuestSize = zoomLevel < 15 ? 32 : 48;

          if (quest.imageUrl) {
            // Create circular image container with quest scroll icon in top right
            const circleContainer = document.createElement("div");
            circleContainer.className = "circle-container";
            circleContainer.style.cssText = `
              width: ${baseQuestSize}px;
              height: ${baseQuestSize}px;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid #FFD700;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              justify-content: center;
              align-items: center;
            `;

            // Create quest image element
            const questImageElement = document.createElement("img");
            questImageElement.className = "user-quest-image";
            questImageElement.src = quest.imageUrl.startsWith(
              "/uploads/quest-images/"
            )
              ? quest.imageUrl.replace("/uploads/quest-images/", "/uploads/")
              : quest.imageUrl;
            questImageElement.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            `;

            // Add error handling for expired URLs
            questImageElement.onerror = () => {
              console.log("Quest marker image failed to load:", quest.imageUrl);
              // Hide the image and show fallback
              questImageElement.style.display = "none";
              // Create fallback icon with quest title initial
              const fallbackIcon = document.createElement("div");
              fallbackIcon.textContent = quest.title.charAt(0).toUpperCase();
              fallbackIcon.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: white;
                font-weight: bold;
                font-size: ${baseQuestSize * 0.4}px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
              `;
              circleContainer.appendChild(fallbackIcon);
            };

            // Create quest scroll icon overlay in top right
            const questScrollIcon = document.createElement("img");
            questScrollIcon.className = "quest-scroll-overlay-icon";
            questScrollIcon.src = questIcon;
            questScrollIcon.style.cssText = `
              position: absolute;
              width: ${Math.max(16, baseQuestSize * 0.5)}px;
              height: ${Math.max(16, baseQuestSize * 0.5)}px;
              top: -3px;
              right: -3px;
              z-index: 10;
              filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
            `;

            circleContainer.appendChild(questImageElement);
            questMarkerContent.appendChild(circleContainer);
            questMarkerContent.appendChild(questScrollIcon);
          } else {
            // Create quest icon container (default behavior)
            const questIconElement = document.createElement("img");
            questIconElement.src = questIcon;
            questIconElement.style.cssText = `
              width: ${baseQuestSize}px;
              height: ${baseQuestSize}px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            `;
            questMarkerContent.appendChild(questIconElement);
          }
        }

        // Only show label for zoomed in views
        if (zoomLevel >= 13) {
          const questLabel = document.createElement("div");
          questLabel.textContent = questCountdown || quest.title;
          questLabel.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 4px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          questMarkerContent.appendChild(questLabel);
        }

        // Create AdvancedMarkerElement for quest
        const questMarker = addMarker(position, {
          title: `Quest: ${quest.title}`,
          htmlContent: canAdvanced ? questMarkerContent : null,
          iconUrl: canAdvanced ? undefined : questIcon,
          iconSize: zoomLevel < 15 ? 32 : 48,
          zIndex: 10,
          onClick: () => onQuestClick?.(quest),
        });


        questMarkersRef.current.set(quest.id, questMarker);
        console.log(
          "Created new quest marker for:",
          quest.title,
          "at position:",
          position
        );
      }
    });
  }, [activeQuests, onQuestClick]);

  // Add Dragon markers to the map
  useEffect(() => {
    if (!googleMapRef.current || !dragons || dragons.length === 0) {
      return;
    }

    console.log(
      "🐉 Adding dragon markers to Google Maps:",
      dragons.length,
      "dragons"
    );

    // Remove all existing markers to recreate with new zoom sizing
    dragonMarkersRef.current.forEach((marker, dragonId) => {
      marker.setMap(null);
    });
    dragonMarkersRef.current.clear();

    // Remove all existing circles to recreate
    dragonCirclesRef.current.forEach((circle, dragonId) => {
      circle.setMap(null);
    });
    dragonCirclesRef.current.clear();

    // Create or update dragon markers and radius circles
    dragons.forEach((dragon) => {
      if (!dragon.latitude || !dragon.longitude) return;

      const position = {
        lat: parseFloat(dragon.latitude.toString()),
        lng: parseFloat(dragon.longitude.toString()),
      };

      // Calculate time remaining until dragon expires
      const expiresAt = toDate(dragon.expiresAt);
      const now = new Date();
      const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutesRemaining = Math.floor(
        (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
      );

      let dragonCountdown = "";
      if (timeRemaining > 0) {
        if (hoursRemaining > 0) {
          dragonCountdown = `${hoursRemaining}h ${minutesRemaining}m`;
        } else {
          dragonCountdown = `${minutesRemaining}m`;
        }
      }

      const dragonRadius = 60.96; // 200ft in meters

      // Create radius circle (blue transparent) - all circles cleared above
      {
        // Create radius circle
        const radiusCircle = new (window as any).google.maps.Circle({
          strokeColor: "#3B82F6", // Blue color for dragon radius
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: "#3B82F6",
          fillOpacity: 0.15,
          map: googleMapRef.current,
          center: position,
          radius: dragonRadius,
          zIndex: 1, // Behind markers
        });

        dragonCirclesRef.current.set(dragon.id, radiusCircle);
        console.log(
          "🐉 Created dragon radius circle for dragon:",
          dragon.id,
          "radius:",
          dragonRadius
        );
      }

      // Create dragon marker (all markers cleared above for zoom sizing)
      {
        // Create dragon marker content
        const dragonMarkerContent = document.createElement("div");
        dragonMarkerContent.className = "dragon-marker-content";
        dragonMarkerContent.style.cssText = `
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 10;
        `;

        // Apply same zoom-based sizing as gem markers
        const baseIconSize = zoomLevel < 15 ? 32 : 48;
        const iconSize = baseIconSize;

        if (zoomLevel < 13) {
          // Small circular marker for zoomed out views (like gems)
          const iconElement = document.createElement("div");
          iconElement.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            opacity: 0.8;
          `;
          dragonMarkerContent.appendChild(iconElement);
        } else {
          // Full dragon marker for zoomed in views
          const baseDragonSize = iconSize;

          // Create dragon icon element
          const dragonIconElement = document.createElement("img");
          dragonIconElement.src = dragonIcon;
          dragonIconElement.style.cssText = `
            width: ${baseDragonSize}px;
            height: ${baseDragonSize}px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          `;
          dragonMarkerContent.appendChild(dragonIconElement);
        }

        // Only show label for zoomed in views
        if (zoomLevel >= 13) {
          const dragonLabel = document.createElement("div");
          const healthPercentage = Math.round(
            (dragon.currentHealth / dragon.totalHealth) * 100
          );
          dragonLabel.textContent = dragonCountdown
            ? `${dragonCountdown} • ${healthPercentage}% HP`
            : `${healthPercentage}% HP`;
          dragonLabel.style.cssText = `
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 4px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          dragonMarkerContent.appendChild(dragonLabel);
        }

        // Create AdvancedMarkerElement for dragon
        const dragonMarker = addMarker(position, {
          title: `Dragon Challenge - ${dragon.coinReward} coins`,
          htmlContent: ((): HTMLElement | null => {
            if (!canAdvanced) return null; // no Map ID → fall back to PNG
            const c = document.createElement("div");
            c.className = "dragon-marker-content";
            c.style.cssText =
              "position:absolute;bottom:0;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;z-index:10;";
            const img = document.createElement("img");
            img.src = dragonIcon;
            img.style.cssText =
              "width:48px;height:48px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));";
            c.appendChild(img);
            return c;
          })(),
          iconUrl: canAdvanced ? undefined : dragonIcon,
          iconSize: 48,
          zIndex: 10,
          onClick: () => handleDragonClick(dragon),
        });
        // Add click listener
        dragonMarker.addListener("click", () => {
          console.log("🐉 Dragon marker clicked:", dragon.id);
          handleDragonClick(dragon);
        });

        dragonMarkersRef.current.set(dragon.id, dragonMarker);
        console.log(
          "🐉 Created new dragon marker for:",
          dragon.id,
          "at position:",
          position
        );
      }
    });
  }, [dragons, zoomLevel]);

  // Handle highlighted video - center map and animate marker with retry logic
  useEffect(() => {
    if (!highlightedVideoId || !googleMapRef.current) return;

    const highlightedVideo = videos.find((v) => v.id === highlightedVideoId);
    if (
      !highlightedVideo ||
      !highlightedVideo.latitude ||
      !highlightedVideo.longitude
    )
      return;

    const position = {
      lat: parseFloat(highlightedVideo.latitude),
      lng: parseFloat(highlightedVideo.longitude),
    };

    // Center map on the highlighted video with maximum zoom for precise focus
    googleMapRef.current.panTo(position);
    googleMapRef.current.setZoom(22);

    // Check if marker exists, if not create a temporary marker or just show highlighting circle
    const marker = markersMapRef.current.get(highlightedVideoId);

    if (marker) {
      // Existing marker found
    } else {
      // Create temporary marker for distant video

      // Create a temporary marker for this video if it doesn't exist
      const categoryIcons = {
        art: artIcon,
        education: educationIcon,
        review: reviewIcon,
        games: gamesIcon,
        events: eventsIcon,
        products: productsIcon,
        services: servicesIcon,
        challenge: challengeIcon,
        chat: chatIcon,
        fyi: fyiIcon,
        love: loveIcon,
        nature: natureIcon,
        coupon: couponIcon,
        travel: artIcon, // fallback
        default: artIcon,
      } satisfies Record<string, string>;

      // Create temporary AdvancedMarkerElement for consistency
      const tempContent = canAdvanced
        ? createAdvancedMarkerContent(48, highlightedVideo, 18)
        : null;
      const tempMarker = addMarker(position, {
        title: highlightedVideo.title,
        htmlContent: canAdvanced? tempContent : null,
        iconUrl: canAdvanced
          ? undefined
          : categoryIcons[
              highlightedVideo.category as keyof typeof categoryIcons
            ] ?? categoryIcons.default,
        iconSize: 48,
        zIndex: 4000,
        onClick: () => onVideoClick(highlightedVideo),
      });

      // Store the temporary marker
      markersMapRef.current.set(highlightedVideoId, tempMarker);

      // Add click listener to the temporary marker
      tempMarker.addListener("click", () => {
        onVideoClick(highlightedVideo);
      });
    }

    // Clear any existing animation and highlight circle
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    if (highlightCircleRef.current) {
      highlightCircleRef.current.setMap(null);
      highlightCircleRef.current = null;
    }

    // Create highlighting animation
    const createHighlightOverlay = () => {
      const highlightCircle = new (window as any).google.maps.Circle({
        strokeColor: "#FFD700",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: "#FFD700",
        fillOpacity: 0.2,
        map: googleMapRef.current,
        center: position,
        radius: 50,
        zIndex: 999,
      });

      // Store reference for cleanup
      highlightCircleRef.current = highlightCircle;

      // Animate the circle with pulsing effect
      let pulseCount = 0;
      const maxPulses = 4;
      const pulseAnimation = () => {
        if (pulseCount >= maxPulses) {
          // Complete cleanup
          highlightCircle.setMap(null);
          highlightCircleRef.current = null;
          animationTimeoutRef.current = null;
          return;
        }

        // Pulse effect by changing radius and opacity
        const isExpanding = pulseCount % 2 === 0;
        const newRadius = isExpanding ? 80 : 35;
        const newFillOpacity = isExpanding ? 0.1 : 0.3;
        const newStrokeOpacity = isExpanding ? 0.5 : 0.9;

        highlightCircle.setRadius(newRadius);
        highlightCircle.setOptions({
          fillOpacity: newFillOpacity,
          strokeOpacity: newStrokeOpacity,
        });

        pulseCount++;
        animationTimeoutRef.current = setTimeout(pulseAnimation, 600);
      };

      // Start pulsing animation
      pulseAnimation();
    };

    // Create the highlight overlay
    createHighlightOverlay();

    // Cleanup function to clear animation on unmount or re-trigger
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      if (highlightCircleRef.current) {
        highlightCircleRef.current.setMap(null);
        highlightCircleRef.current = null;
      }
    };
  }, [highlightedVideoId, videos]);

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById("map-container");
      if (container) {
        setMapDimensions({
          width: container.offsetWidth,
          height: container.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (userLocation && isUserCentered) {
      setCurrentMapCenter(userLocation);
    }
  }, [userLocation, isUserCentered]);

  // Update map center when mapCenter prop changes (from search)
  useEffect(() => {
    if (
      mapCenter &&
      typeof mapCenter.lat === "number" &&
      typeof mapCenter.lng === "number" &&
      !isNaN(mapCenter.lat) &&
      !isNaN(mapCenter.lng)
    ) {
      setCurrentMapCenter(mapCenter);
      setIsUserCentered(false);
      if (googleMapRef.current) {
        googleMapRef.current.panTo({
          lat: mapCenter.lat,
          lng: mapCenter.lng,
        });
      }
    } else if (mapCenter) {
      console.error("Invalid mapCenter coordinates:", mapCenter);
    }
  }, [mapCenter]);

  // Calculate distance between two coordinates in meters
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Handle location center button
  const handleLocationCenter = () => {
    if (!userLocation || !googleMapRef.current) return;

    console.log("Location center clicked, setting isUserCentered to true");

    // Move the map first
    googleMapRef.current.panTo({
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
    googleMapRef.current.setZoom(19);

    // Set the state and force immediate update
    setIsUserCentered((prev) => {
      console.log("Setting isUserCentered from", prev, "to true");
      return true;
    });
    setCurrentMapCenter(userLocation);

    onLocationCenter();
  };

  // Handle video click - now all videos are clickable
  const handleVideoClick = async (video: Video) => {
    if (!userLocation || !video.latitude || !video.longitude) {
      onVideoClick(video);
      return;
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      parseFloat(video.latitude),
      parseFloat(video.longitude)
    );

    // If within 100 feet, play for free
    if (distance <= 30.48) {
      onVideoClick(video);
    } else {
      // Check if video is purchased
      try {
        const response = await fetch(`/api/videos/${video.id}/purchased`);
        if (response.ok) {
          const data = await response.json();
          if (data.purchased) {
            // Video is purchased - play for free
            onVideoClick(video);
            return;
          }
        }
      } catch (error) {
        console.error("Error checking purchase status:", error);
      }

      // Video not purchased - show coin payment modal
      onVideoClick({
        ...video,
        requiresCoin: true,
        distance: Math.round(distance),
      });
    }
  };

  // Generate mock video positions for demo
  const getVideoPosition = (index: number) => {
    const positions = [
      { x: 20, y: 30 },
      { x: 45, y: 25 },
      { x: 65, y: 40 },
      { x: 35, y: 55 },
      { x: 75, y: 20 },
      { x: 25, y: 70 },
      { x: 55, y: 65 },
      { x: 85, y: 45 },
      { x: 15, y: 45 },
      { x: 70, y: 75 },
      { x: 40, y: 15 },
      { x: 80, y: 65 },
      { x: 30, y: 85 },
      { x: 60, y: 35 },
      { x: 90, y: 25 },
      { x: 10, y: 60 },
      { x: 50, y: 80 },
      { x: 75, y: 55 },
      { x: 35, y: 10 },
      { x: 65, y: 90 },
    ];
    return positions[index % positions.length];
  };

  const handleZoomIn = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom();
      googleMapRef.current.setZoom(Math.min(currentZoom + 1, 20));
    }
    setIsUserCentered(false);
  };

  const handleZoomOut = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom();
      googleMapRef.current.setZoom(Math.max(currentZoom - 1, 8));
    }
    setIsUserCentered(false);
  };

  // Handle map dragging/panning
  const handleMapDrag = () => {
    setIsUserCentered(false);
  };

  // Handle center location button
  const handleCenterLocation = () => {
    if (googleMapRef.current && userLocation) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(19);
      setIsUserCentered(true);
      onLocationCenter();
    }
  };

  // Handle manual treasure chest spawning (for testing)
  const handleSpawnTreasureChest = async () => {
    try {
      const response = await fetch("/api/treasure-chests/spawn", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const result = await response.json();
        console.log("🎁 Treasure chest spawned:", result);
        // Refresh treasure chests to show new one
        setTimeout(() => {
          // Trigger treasure chest refresh
          window.location.reload();
        }, 1000);
      } else {
        console.error("Failed to spawn treasure chest");
      }
    } catch (error) {
      console.error("Error spawning treasure chest:", error);
    }
  };

  return (
    <div
      id="map-container"
      className="relative w-full h-full bg-gray-100 overflow-hidden"
    >
      {/* Google Maps Container */}
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      />

      {/* Fallback content while Google Maps loads */}
      {!googleMapRef.current && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-green-200">
          <div className="absolute inset-0">
            <svg className="w-full h-full opacity-20">
              <defs>
                <pattern
                  id="streets"
                  patternUnits="userSpaceOnUse"
                  width="100"
                  height="100"
                >
                  <path d="M 0 50 L 100 50" stroke="#666" strokeWidth="2" />
                  <path d="M 50 0 L 50 100" stroke="#666" strokeWidth="2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#streets)" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="flex items-center space-x-2">
              <img
                src={jemzyLogo}
                alt="Jemzy"
                className="w-5 h-5 animate-pulse object-contain"
              />
              <span className="text-gray-600">Finding Jems nearby...</span>
            </div>
          </div>
        </div>
      )}

      {/* Video markers are now handled by Google Maps - no static overlays needed */}

      {/* User location is handled by Google Maps if needed */}

      {/* Map Controls */}
      <div
        className="absolute right-4 z-30 space-y-2"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 8px)",
        }}
      >
        {/* Coin Counter */}
        {userGemCoins !== undefined && (
          <button
            onClick={() => {
              playButtonSound();
              onCoinClick?.();
            }}
            onMouseEnter={(e) => {
              const randomColor = getRandomColor();
              e.currentTarget.style.setProperty("--hover-color", randomColor);
            }}
            className="flex flex-col items-center bg-white rounded-lg shadow-lg px-2 py-2 hover:shadow-xl transition-shadow random-hover"
          >
            <img src={coinIcon} alt="Coins" className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold text-gray-800">
              {userGemCoins}
            </span>
          </button>
        )}

        {/* Zoom Controls */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
          <Button
            onClick={() => {
              playButtonSound();
              handleZoomIn();
            }}
            onMouseEnter={(e) => {
              const randomColor = getRandomColor();
              e.currentTarget.style.setProperty("--hover-color", randomColor);
            }}
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-none border-b text-lg font-bold random-hover"
          >
            +
          </Button>
          <Button
            onClick={() => {
              playButtonSound();
              handleZoomOut();
            }}
            onMouseEnter={(e) => {
              const randomColor = getRandomColor();
              e.currentTarget.style.setProperty("--hover-color", randomColor);
            }}
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-none text-lg font-bold random-hover"
          >
            −
          </Button>
        </div>

        {/* Location Center Button */}
        <Button
          onClick={() => {
            playButtonSound();
            handleLocationCenter();
          }}
          onMouseEnter={(e) => {
            const randomColor = getRandomColor();
            e.currentTarget.style.setProperty("--hover-color", randomColor);
          }}
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 bg-white rounded-lg shadow-lg random-hover"
        >
          <img
            src={
              isUserCentered ? locationCenteredIcon : locationNotCenteredIcon
            }
            alt="Center location"
            className="w-6 h-6"
          />
        </Button>
      </div>

      {/* App Instructions Modal */}
      <AppInstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      {/* Treasure Chest Modal */}
      <TreasureChestModal
        chest={selectedTreasureChest}
        isOpen={showTreasureChestModal}
        onClose={() => {
          setShowTreasureChestModal(false);
          setSelectedTreasureChest(null);
        }}
        userLocation={userLocation}
        onCollect={handleTreasureChestCollect}
      />

      {/* Mystery Box Modal */}
      <MysteryBoxModal
        box={selectedMysteryBox}
        isOpen={showMysteryBoxModal}
        onClose={() => {
          setShowMysteryBoxModal(false);
          setSelectedMysteryBox(null);
        }}
        onCollect={handleMysteryBoxCollect}
        userLocation={userLocation}
      />

      {/* Dragon Modal */}
      <DragonModal
        dragonId={selectedDragonId}
        isOpen={showDragonModal}
        onClose={() => {
          setShowDragonModal(false);
          setSelectedDragonId(null);
        }}
        onDragonDefeated={() => {
          // Refresh dragons data when a dragon is defeated
          // The useQuery will automatically refetch
        }}
        userLocation={userLocation}
      />
    </div>
  );
}
