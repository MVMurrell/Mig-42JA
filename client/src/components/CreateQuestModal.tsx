import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { MapPin, Upload, Calendar as CalendarIcon, Clock, AlertTriangle, Coins, Search } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { apiRequest } from "@/lib/queryClient.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { Loader } from "@googlemaps/js-api-loader";

const questSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radiusInFeet: z.number().min(10).max(1000),
  requiredParticipants: z.number().min(2).max(500),
  rewardPerParticipant: z.number().min(1).max(1000),
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => {
  const duration = data.endDate.getTime() - data.startDate.getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  return duration <= threeDays;
}, {
  message: "Quest duration cannot exceed 3 days",
  path: ["endDate"],
});

type QuestFormData = z.infer<typeof questSchema>;

interface CreateQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number };
}

export function CreateQuestModal({ isOpen, onClose, userLocation }: CreateQuestModalProps) {
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [locationSet, setLocationSet] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create a stable "today" date that doesn't change during component lifecycle
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison

  // Fetch Google Maps API key
  const { data: configData } = useQuery<{ apiKey: string }>({
    queryKey: ["/api/config/maps-key"],
    retry: false,
  });

  const form = useForm<QuestFormData>({
    resolver: zodResolver(questSchema),
    defaultValues: {
      title: "",
      description: "",
      radiusInFeet: 100,
      requiredParticipants: 10,
      rewardPerParticipant: 50,
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      latitude: userLocation?.lat || 36.0571,
      longitude: userLocation?.lng || -94.1606,
    },
  });

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (input: string) => {
    if (!autocompleteService || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const request = {
        input,
        componentRestrictions: { country: 'us' },
        types: ['establishment', 'geocode']
      };

      autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
        if (status === 'OK' && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
          console.log("Found", predictions.length, "suggestions for:", input);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Search for location by place ID or address
  const searchLocation = async (placeId?: string, address?: string) => {
    if (!map) return;
    
    setIsSearching(true);
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      let result;

      if (placeId) {
        result = await geocoder.geocode({ placeId });
      } else {
        const query = address || searchQuery.trim();
        if (!query) return;
        
        result = await geocoder.geocode({ 
          address: query,
          region: 'US'
        });
      }
      
      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        
        console.log(`Found location: ${result.results[0].formatted_address} at ${lat}, ${lng}`);
        
        // Update map center and marker
        map.setCenter({ lat, lng });
        map.setZoom(16);
        
        if (marker) {
          marker.setPosition({ lat, lng });
        }
        
        // Update form
        form.setValue("latitude", lat);
        form.setValue("longitude", lng);
        setLocationSet(true);
        
        // Clear search and hide suggestions
        setSearchQuery("");
        setShowSuggestions(false);
        setSuggestions([]);
      } else {
        console.log("No results found for:", placeId || address || searchQuery);
      }
    } catch (error) {
      console.error("Error searching for location:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);
    searchLocation(suggestion.place_id);
  };

  // Reset map state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMap(null);
      setMarker(null);
      setSearchQuery("");
      setIsSearching(false);
      setIsMapLoading(false);
    }
  }, [isOpen]);

  // Initialize Google Maps - use existing API if available
  useEffect(() => {
    const initializeMap = async () => {
      if (!isOpen || !mapRef.current || map) return;

      setIsMapLoading(true);
      console.log("Starting Google Maps initialization for quest creation...");

      try {
        // Check if Google Maps is already loaded
        if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
          console.log("Using existing Google Maps API");
          await initMapWithExistingAPI();
        } else {
          // Load Google Maps API using Loader
          if (!configData?.apiKey) {
            console.log("Waiting for Google Maps API key...");
            setIsMapLoading(false);
            return;
          }

          console.log("Loading Google Maps API with Loader...");
          const loader = new Loader({
            apiKey: configData.apiKey,
            version: "weekly",
            libraries: ["places"],
          });

          await loader.load();
          console.log("Google Maps API loaded successfully");
          await initMapWithExistingAPI();
        }
      } catch (error) {
        console.error("Failed to initialize Google Maps:", error);
        setIsMapLoading(false);
      }
    };

    const initMapWithExistingAPI = async () => {
      if (!mapRef.current) {
        console.error("Map container ref is null");
        setIsMapLoading(false);
        return;
      }

      const initialCenter = { 
        lat: userLocation?.lat || 36.0571, 
        lng: userLocation?.lng || -94.1606 
      };

      console.log("Creating map instance with center:", initialCenter);
      const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        disableDefaultUI: false,
      });

      console.log("Creating marker at position:", initialCenter);
      const markerInstance = new (window as any).google.maps.Marker({
        position: initialCenter,
        map: mapInstance,
        draggable: true,
        title: "Quest Location - Drag to reposition",
      });

      // Update form when marker is dragged
      markerInstance.addListener("dragend", () => {
        const position = markerInstance.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          console.log("Marker dragged to:", { lat, lng });
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          setLocationSet(true);
        }
      });

      // Update marker when map is clicked
      mapInstance.addListener("click", (e: any) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          console.log("Map clicked at:", { lat, lng });
          markerInstance.setPosition(e.latLng);
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          setLocationSet(true);
        }
      });

      setMap(mapInstance);
      setMarker(markerInstance);
      setLocationSet(true); // Set initial location as confirmed
      setIsMapLoading(false);
      console.log("Google Maps initialization completed for quest creation");
      
      // Initialize autocomplete service
      const service = new (window as any).google.maps.places.AutocompleteService();
      setAutocompleteService(service);
      console.log("Places Autocomplete service initialized");
    };

    // Small delay to ensure DOM is ready and check if API is available
    const timer = setTimeout(initializeMap, 200);
    return () => clearTimeout(timer);
  }, [isOpen, configData?.apiKey, userLocation, form, map]);



  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    console.log('🎯 QUEST CREATE: Starting image upload...');
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload/image?type=quest", {
      method: "POST",
      body: formData,
      credentials: 'include', // Essential for authentication
    });
    
    console.log('🎯 QUEST CREATE: Image upload response:', response.status, response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to upload image" }));
      
      // Handle AI moderation rejection
      if (response.status === 400 && errorData.code === 'CONTENT_VIOLATION') {
        throw new Error(`Image rejected: ${errorData.reason || 'Content violates community guidelines'}`);
      }
      
      throw new Error(errorData.message || "Failed to upload image");
    }

    const data = await response.json();
    // For quest images, use the permanent GCS path instead of signed URL
    return data.permanentUrl || data.url;
  };

  const createQuestMutation = useMutation({
    mutationFn: async (data: QuestFormData & { imageUrl?: string; totalReward: number; latitude: number; longitude: number }) => {
      console.log('🎯 QUEST CREATE: Starting API request...');
      console.log('🎯 QUEST CREATE: Sending data to server:', data);
      console.log('🎯 QUEST CREATE: Request URL: /api/quests');
      console.log('🎯 QUEST CREATE: Request method: POST');
      
      try {
        const response = await apiRequest("/api/quests", {method: "POST", data});
        console.log('🎯 QUEST CREATE: API request successful');
        return response;
      } catch (error) {
        console.error('🎯 QUEST CREATE: API request failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quests/active"] });
      onClose();
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      setLocationSet(false);
    },
  });

  const onSubmit = async (data: QuestFormData) => {
    console.log('🎯 QUEST CREATE: Form submitted with data:', data);
    
    // Check authentication status before making request
    try {
      const authResponse = await fetch('/api/auth/user', { credentials: 'include' });
      console.log('🎯 QUEST CREATE: Auth check response:', {
        status: authResponse.status,
        ok: authResponse.ok,
        statusText: authResponse.statusText
      });
      
      if (!authResponse.ok) {
        console.error('🎯 QUEST CREATE: User not authenticated before quest creation');
        return;
      }
      
      const authData = await authResponse.json();
      console.log('🎯 QUEST CREATE: Current user:', authData);
    } catch (authError) {
      console.error('🎯 QUEST CREATE: Auth check failed:', authError);
      return;
    }

    try {
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const totalReward = data.rewardPerParticipant * data.requiredParticipants;
      
      console.log('🎯 QUEST CREATE: About to call mutation with data:', {
        ...data,
        imageUrl,
        totalReward,
        latitude: data.latitude,
        longitude: data.longitude,
      });

      await createQuestMutation.mutateAsync({
        ...data,
        imageUrl,
        totalReward,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      
      console.log('🎯 QUEST CREATE: Mutation completed successfully');
      
      toast({
        title: "Quest Created!",
        description: "Your quest has been created successfully and is now live.",
      });
    } catch (error) {
      console.error("Error creating quest:", error);
      console.error("Full error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        stringified: JSON.stringify(error, null, 2)
      });
      
      // Handle specific image moderation errors
      if (error instanceof Error) {
        if (error.message.includes("Image rejected")) {
          toast({
            variant: "destructive",
            title: "Image Not Allowed",
            description: "The uploaded image violates our community guidelines. Please choose a different image.",
          });
        } else if (error.message.includes("inappropriate content")) {
          toast({
            variant: "destructive",
            title: "Content Moderation",
            description: "Our AI detected inappropriate content in your image. Please try a different image.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Quest Creation Failed",
            description: error.message || "Failed to create quest. Please try again.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Unexpected Error",
          description: "Something went wrong. Please try again later.",
        });
      }
    }
  };

  const watchedValues = form.watch();
  const totalCost = watchedValues.rewardPerParticipant * watchedValues.requiredParticipants;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none max-h-none rounded-none border-0 m-0 p-0 md:max-w-2xl md:max-h-[90vh] md:rounded-lg md:border md:m-auto md:p-6 md:h-auto md:w-auto overflow-y-auto">
        <div className="p-4 h-full flex flex-col md:p-6">
          <DialogHeader className="flex-shrink-0 mb-4">
            <DialogTitle className="text-center text-xl md:text-left">Create New Quest</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Quest Image (Optional)</Label>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-dashed"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload</span>
                  </div>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Quest Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Enter a compelling quest title"
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Rules & Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe what participants need to do to complete this quest"
              rows={4}
            />
            {form.formState.errors.description && (
              <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-4">
            <Label>Quest Location</Label>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Location Search */}
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        ref={searchInputRef}
                        placeholder="Search for a specific location (e.g., Fayetteville Public Library, Arkansas)"
                        value={searchQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchQuery(value);
                          fetchSuggestions(value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchLocation();
                          }
                          if (e.key === 'Escape') {
                            setShowSuggestions(false);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow clicking on them
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                      />
                      
                      {/* Autocomplete Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.place_id}
                              className="px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              onClick={() => selectSuggestion(suggestion)}
                            >
                              <div className="text-sm font-medium text-gray-900">
                                {suggestion.structured_formatting?.main_text || suggestion.description}
                              </div>
                              {suggestion.structured_formatting?.secondary_text && (
                                <div className="text-xs text-gray-500">
                                  {suggestion.structured_formatting.secondary_text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => searchLocation()}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-3"
                    >
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Map */}
                  <div className="relative">
                    <div ref={mapRef} className="w-full h-64 rounded-lg border bg-gray-100" />
                    {isMapLoading && (
                      <div className="absolute inset-0 bg-gray-50 rounded-lg flex items-center justify-center">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          <span>Loading map...</span>
                        </div>
                      </div>
                    )}
                    {!map && !isMapLoading && (
                      <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="w-8 h-8 mx-auto mb-2 opacity-50">
                            <MapPin className="w-full h-full" />
                          </div>
                          <div className="text-sm">Map will load here</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="text-sm text-gray-600">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Drag the marker or click to set quest location
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <Label htmlFor="radius">Participation Radius</Label>
            <Select
              value={watchedValues.radiusInFeet?.toString()}
              onValueChange={(value) => form.setValue("radiusInFeet", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select radius" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 feet</SelectItem>
                <SelectItem value="25">25 feet</SelectItem>
                <SelectItem value="50">50 feet</SelectItem>
                <SelectItem value="100">100 feet</SelectItem>
                <SelectItem value="200">200 feet</SelectItem>
                <SelectItem value="500">500 feet</SelectItem>
                <SelectItem value="1000">1000 feet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label htmlFor="participants">Required Participants</Label>
            <Input
              id="participants"
              type="number"
              min="2"
              max="500"
              {...form.register("requiredParticipants", { valueAsNumber: true })}
            />
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label htmlFor="reward">Reward per Participant (Jem Coins)</Label>
            <Input
              id="reward"
              type="number"
              min="1"
              max="1000"
              {...form.register("rewardPerParticipant", { valueAsNumber: true })}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal text-sm")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {watchedValues.startDate ? format(watchedValues.startDate, "MMM d, yyyy h:mm a") : "Pick date & time"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={watchedValues.startDate}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = watchedValues.startDate || new Date();
                          const newDate = new Date(date);
                          newDate.setHours(currentTime.getHours());
                          newDate.setMinutes(currentTime.getMinutes());
                          form.setValue("startDate", newDate);
                        }
                      }}
                      disabled={(date) => date < today}
                      initialFocus
                    />
                    <div className="mt-3 flex items-center space-x-2 border-t pt-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <Input
                        type="time"
                        value={watchedValues.startDate ? format(watchedValues.startDate, "HH:mm") : ""}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':');
                          const currentDate = watchedValues.startDate || new Date();
                          const newDate = new Date(currentDate);
                          newDate.setHours(parseInt(hours));
                          newDate.setMinutes(parseInt(minutes));
                          form.setValue("startDate", newDate);
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal text-sm")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {watchedValues.endDate ? format(watchedValues.endDate, "MMM d, yyyy h:mm a") : "Pick date & time"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={watchedValues.endDate}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = watchedValues.endDate || addHours(watchedValues.startDate || new Date(), 1);
                          const newDate = new Date(date);
                          newDate.setHours(currentTime.getHours());
                          newDate.setMinutes(currentTime.getMinutes());
                          form.setValue("endDate", newDate);
                        }
                      }}
                      disabled={(date) => date < watchedValues.startDate || date > addDays(watchedValues.startDate, 3)}
                      initialFocus
                    />
                    <div className="mt-3 flex items-center space-x-2 border-t pt-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <Input
                        type="time"
                        value={watchedValues.endDate ? format(watchedValues.endDate, "HH:mm") : ""}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':');
                          const currentDate = watchedValues.endDate || addHours(watchedValues.startDate || new Date(), 1);
                          const newDate = new Date(currentDate);
                          newDate.setHours(parseInt(hours));
                          newDate.setMinutes(parseInt(minutes));
                          form.setValue("endDate", newDate);
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cost Summary */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">Quest Cost Summary</h3>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Participants needed:</span>
                  <span>{watchedValues.requiredParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reward per participant:</span>
                  <span>{watchedValues.rewardPerParticipant} coins</span>
                </div>
                <div className="flex justify-between font-medium text-yellow-800 border-t pt-1">
                  <span>Total cost:</span>
                  <span>{totalCost} Jem Coins</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">Important Notice</p>
                  <p>Once created, quests cannot be deleted to protect participant interests. Ensure all details are correct before creating.</p>
                </div>
              </div>
            </CardContent>
          </Card>

              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 flex-shrink-0 pt-4 border-t bg-white">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createQuestMutation.isPending}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {createQuestMutation.isPending ? "Creating..." : `Create Quest (${totalCost} coins)`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}