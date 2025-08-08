import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, MapPin, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils.ts";

interface DualModeSearchProps {
  onLocationSearch: (query: string, suggestions: any[]) => void;
  onKeywordSearch: (keyword: string) => void;
  onVideoContentSearch: (query: string) => void;
  onClearSearch: () => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
  isSearchActive?: boolean;
}

type SearchMode = 'location' | 'keyword' | 'content';

export default function DualModeSearch({
  onLocationSearch,
  onKeywordSearch,
  onVideoContentSearch,
  onClearSearch,
  userLocation,
  className,
  isSearchActive
}: DualModeSearchProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>('content');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<{keyword: string}[]>([]);
  const [videoContentSuggestions, setVideoContentSuggestions] = useState<{query: string, matchCount: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const modeDropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available keywords for auto-complete
  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const response = await fetch('/api/search/keywords');
        if (response.ok) {
          const keywords = await response.json();
          setAvailableKeywords(keywords);
        }
      } catch (error) {
        console.error('Failed to fetch keywords:', error);
      }
    };

    // Always fetch keywords since we show both search types
    fetchKeywords();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        // Always search both video content and location simultaneously
        await Promise.all([
          handleVideoContentSearch(searchQuery),
          handleLocationSearch(searchQuery)
        ]);
      }, 300);
    } else {
      setSearchSuggestions([]);
      setKeywordSuggestions([]);
      setVideoContentSuggestions([]);
      setShowSuggestions(false);
      onClearSearch();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationSearch = async (query: string) => {
    try {
      const response = await fetch(
        `/api/search/places?q=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = data || [];

        setSearchSuggestions(suggestions);
        setShowSuggestions(true);
        // Don't trigger onLocationSearch while typing - only when selecting
      }
    } catch (error) {
      console.error('Location search failed:', error);
    }
  };

  const handleVideoContentSearch = async (query: string) => {
    try {
      console.log(`🔍 VIDEO SEARCH: Searching for "${query}"`);
      const response = await fetch(`/api/search/videos?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const videos = await response.json();
        console.log(`🔍 VIDEO SEARCH: Found ${videos.length} videos matching "${query}"`);
        
        if (videos.length > 0) {
          setVideoContentSuggestions([{
            query: query,
            matchCount: videos.length
          }]);
        } else {
          setVideoContentSuggestions([]);
        }
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Video content search failed:', error);
    }
  };

  const handleKeywordSearch = (keyword: string) => {
    const filteredKeywords = availableKeywords.filter(k => 
      k.toLowerCase().includes(keyword.toLowerCase())
    );
    
    setKeywordSuggestions(filteredKeywords.map(k => ({ keyword: k })));
    setShowSuggestions(filteredKeywords.length > 0 || searchSuggestions.length > 0 || videoContentSuggestions.length > 0);
    
    // Trigger immediate search for exact matches
    if (availableKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())) {
      onKeywordSearch(keyword);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    // Clear all suggestions and hide dropdown immediately
    setSearchSuggestions([]);
    setKeywordSuggestions([]);
    setVideoContentSuggestions([]);
    setShowSuggestions(false);
    
    if (suggestion.query && suggestion.matchCount) {
      // This is a video content suggestion
      setSearchQuery(suggestion.query);
      onVideoContentSearch(suggestion.query);
    } else if (suggestion.place_id || suggestion.description || suggestion.name || suggestion.formatted_address) {
      // This is a location suggestion - handle multiple possible properties from Google Places API
      const locationName = suggestion.name || suggestion.description || suggestion.formatted_address;
      setSearchQuery(locationName);
      console.log('🗺️ LOCATION SEARCH: Navigating to:', suggestion.geometry?.location, 'for query:', locationName);
      onLocationSearch(locationName, [suggestion]);
    } else if (suggestion.keyword) {
      // This is a keyword suggestion
      setSearchQuery(suggestion.keyword);
      onKeywordSearch(suggestion.keyword);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchSuggestions([]);
    setKeywordSuggestions([]);
    setVideoContentSuggestions([]);
    setShowSuggestions(false);
    onClearSearch();
    searchInputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (searchSuggestions.length > 0 || keywordSuggestions.length > 0 || videoContentSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const toggleMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setShowModeDropdown(false);
    onClearSearch();
    
    // Focus input after mode change
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const getModeConfig = () => {
    if (searchMode === 'location') {
      return {
        label: 'Location',
        icon: MapPin,
        bgColor: 'bg-blue-500',
        hoverColor: 'hover:bg-blue-600',
        placeholder: 'Search places, addresses...',
        description: 'Find videos by location'
      };
    } else if (searchMode === 'content') {
      return {
        label: 'Video Content',
        icon: MessageSquare,
        bgColor: 'bg-green-500',
        hoverColor: 'hover:bg-green-600',
        placeholder: 'Search spoken words like "bass", "Lake Fayetteville"...',
        description: 'Find videos by what people say in them'
      };
    } else {
      return {
        label: 'Keyword',
        icon: MessageSquare,
        bgColor: 'bg-red-500',
        hoverColor: 'hover:bg-red-600',
        placeholder: 'Search by spoken words...',
        description: 'Find videos by audio content'
      };
    }
  };

  const config = getModeConfig();
  const IconComponent = config.icon;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Simple Search Container */}
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Search places and content"
              className="w-full px-4 py-2.5 text-gray-900 placeholder-gray-500 bg-transparent border-none outline-none text-base"
            />
            
            {/* Search/Clear Icon */}
            <div 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
              onClick={searchQuery ? clearSearch : undefined}
            >
              {searchQuery ? (
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Search className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Search Suggestions Dropdown - Absolute positioned overlay */}
      {showSuggestions && (videoContentSuggestions.length > 0 || searchSuggestions.length > 0 || keywordSuggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-y-auto">
            {/* Video Content Results - Always at the top */}
            {videoContentSuggestions.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-red-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-red-500" />
                    VIDEOS WITH MATCHING CONTENT
                  </div>
                </div>
                {videoContentSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.query || index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 border-b border-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-red-500" />
                      <div>
                        <span className="font-medium text-gray-900 text-sm">
                          Search videos saying "{suggestion.query}"
                        </span>
                        <div className="text-xs text-red-600 mt-1">
                          {suggestion.matchCount} video{suggestion.matchCount !== 1 ? 's' : ''} found
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Location Results */}
            {searchSuggestions.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Locations
                  </div>
                </div>
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.place_id || index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {suggestion.name || suggestion.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {suggestion.formatted_address || suggestion.types?.slice(0, 2).join(', ') || 'Location'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Keyword/Transcript Results */}
            {keywordSuggestions.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Video Content
                  </div>
                </div>
                {keywordSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.keyword || index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-gray-900 text-sm">
                        {suggestion.keyword}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
}