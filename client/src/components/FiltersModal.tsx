import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useQuery } from "@tanstack/react-query";

interface Group {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdBy: string;
  memberCount: number;
  isOwner?: boolean;
  isMember?: boolean;
}

interface FiltersModalProps {
  onClose: () => void;
  currentHideWatchedVideos?: boolean;
  onApplyFilters?: (filters: {
    dateRange: string;
    sortBy: string;
    groups: string[];
    hideWatchedVideos: boolean;
  }) => void;
}

export default function FiltersModal({ onClose, onApplyFilters, currentHideWatchedVideos }: FiltersModalProps) {
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedSort, setSelectedSort] = useState("most viewed");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [hideWatchedVideos, setHideWatchedVideos] = useState(currentHideWatchedVideos || false);

  const dateOptions = ["today", "this week", "this month", "all"];
  const sortOptions = ["most viewed", "most recent", "trending", "closest"];

  // Fetch user's groups (both owned and joined)
  const { data: userGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/groups/user"],
  }) as { data: Group[]; isLoading: boolean };

  // Separate groups by public/private
  const publicGroups = userGroups.filter(group => group.isPublic);
  const privateGroups = userGroups.filter(group => !group.isPublic);

  // Load saved filters on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('jemzy-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSelectedDate(filters.dateRange || "all");
        setSelectedSort(filters.sortBy || "most viewed");
        setSelectedGroups(filters.groups || []);
        setHideWatchedVideos(filters.hideWatchedVideos || false);
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const handleApplyFilters = () => {
    const filters = {
      dateRange: selectedDate,
      sortBy: selectedSort,
      groups: selectedGroups,
      hideWatchedVideos: hideWatchedVideos,
    };
    
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
    
    // Store filters in localStorage for persistence
    localStorage.setItem('jemzy-filters', JSON.stringify(filters));
    
    onClose();
  };

  const handleReset = () => {
    setSelectedDate("all");
    setSelectedSort("most viewed");
    setSelectedGroups([]);
    setHideWatchedVideos(false);
    
    // Clear localStorage
    localStorage.removeItem('jemzy-filters');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 modal-backdrop">
      {/* Floating Modal for All Screen Sizes */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] flex flex-col">
          <div className="p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Jem Filters</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="px-6 overflow-y-auto flex-1">
            
            <div className="space-y-6">
              {/* Date Posted */}
              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-3">Date Posted</h3>
                <div className="flex gap-2 flex-wrap">
                  {dateOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedDate(option)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedDate === option
                          ? "bg-gray-900 text-white"
                          : "border border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {selectedDate === option && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort By */}
              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-3">Sort By</h3>
                <div className="flex gap-2 flex-wrap">
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedSort(option)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedSort === option
                          ? "bg-gray-900 text-white"
                          : "border border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {selectedSort === option && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Groups */}
              <div>
                <h3 className="font-bold text-sm text-gray-700 mb-3">Groups</h3>
                
                {isLoadingGroups ? (
                  <div className="text-sm text-gray-500">Loading groups...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Public Groups */}
                    {publicGroups.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Public Groups</h4>
                        <div className="flex gap-2 flex-wrap">
                          {publicGroups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => toggleGroup(group.id)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                selectedGroups.includes(group.id)
                                  ? "bg-gray-900 text-white"
                                  : "border border-gray-300 text-gray-700 hover:border-gray-400"
                              }`}
                            >
                              {selectedGroups.includes(group.id) && (
                                <Check className="w-3 h-3 inline mr-1" />
                              )}
                              {group.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Private Groups */}
                    {privateGroups.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Private Groups</h4>
                        <div className="flex gap-2 flex-wrap">
                          {privateGroups.map((group) => (
                            <button
                              key={group.id}
                              onClick={() => toggleGroup(group.id)}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                selectedGroups.includes(group.id)
                                  ? "bg-gray-900 text-white"
                                  : "border border-gray-300 text-gray-700 hover:border-gray-400"
                              }`}
                            >
                              {selectedGroups.includes(group.id) && (
                                <Check className="w-3 h-3 inline mr-1" />
                              )}
                              {group.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No groups message */}
                    {userGroups.length === 0 && (
                      <div className="text-sm text-gray-500">You haven't joined any groups yet.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Hide Watched Videos */}
              <div className="pb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideWatchedVideos}
                    onChange={(e) => setHideWatchedVideos(e.target.checked)}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Hide videos I've already watched
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Fixed at bottom */}
          <div className="p-6 pt-4 flex-shrink-0 border-t border-gray-100">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
