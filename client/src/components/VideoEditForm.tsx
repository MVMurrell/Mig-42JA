import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { apiRequest } from "@/lib/queryClient.ts";
import { Trash2 } from "lucide-react";

interface VideoEditFormProps {
  videoId: string;
  currentTitle: string;
  currentDescription: string;
  currentCategory: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const categories = [
  "travel", "food", "lifestyle", "fitness", "art", "music", "nature", "pets",
  "sports", "technology", "education", "comedy", "beauty", "fashion",
  "business", "health", "gaming", "diy", "photography", "family",
  "adventure", "culture", "science", "cooking", "wellness", "entertainment",
  "news", "politics", "history", "literature", "philosophy", "spirituality",
  "relationships", "finance", "real-estate", "automotive", "crafts",
  "gardening", "home-improvement", "parenting", "dating", "career",
  "volunteering", "activism", "environment", "charity", "community",
  "celebration", "holiday", "seasonal", "weather", "local-events",
  "festivals", "concerts", "theater", "movies", "books", "podcasts",
  "social-media", "internet", "memes", "trends", "challenges",
  "tutorials", "reviews", "unboxing", "hauls", "vlogs", "interviews",
  "documentaries", "behind-the-scenes", "bloopers", "time-lapse",
  "stop-motion", "animation", "dance", "singing", "instruments",
  "drawing", "painting", "sculpture", "crafting", "sewing",
  "knitting", "woodworking", "metalworking", "pottery", "jewelry",
  "makeup", "skincare", "haircare", "nails", "fashion-design",
  "interior-design", "architecture", "landscaping", "urban-planning",
  "transportation", "logistics", "manufacturing", "agriculture",
  "fishing", "hunting", "camping", "hiking", "climbing", "skiing",
  "snowboarding", "surfing", "swimming", "diving", "sailing",
  "flying", "driving", "motorcycles", "bicycles", "skateboarding",
  "rollerblading", "parkour", "martial-arts", "yoga", "meditation",
  "mindfulness", "therapy", "counseling", "coaching", "mentoring",
  "teaching", "learning", "studying", "research", "experiments",
  "discoveries", "inventions", "innovations", "startups", "entrepreneurship",
  "investing", "trading", "cryptocurrency", "blockchain", "ai",
  "machine-learning", "robotics", "space", "astronomy", "physics",
  "chemistry", "biology", "medicine", "psychology", "sociology",
  "anthropology", "archaeology", "geology", "geography", "meteorology",
  "oceanography", "ecology", "conservation", "sustainability",
  "renewable-energy", "climate-change", "pollution", "recycling",
  "waste-management", "water-conservation", "biodiversity", "wildlife",
  "marine-life", "insects", "birds", "mammals", "reptiles", "amphibians",
  "fish", "plants", "trees", "flowers", "gardens", "farms",
  "ranches", "orchards", "vineyards", "breweries", "distilleries",
  "restaurants", "cafes", "bars", "clubs", "hotels", "resorts",
  "spas", "salons", "gyms", "stadiums", "arenas", "theaters",
  "museums", "galleries", "libraries", "schools", "universities",
  "hospitals", "clinics", "laboratories", "offices", "factories",
  "warehouses", "stores", "markets", "malls", "plazas", "parks",
  "beaches", "mountains", "forests", "deserts", "rivers", "lakes",
  "oceans", "cities", "towns", "villages", "neighborhoods", "streets",
  "bridges", "tunnels", "roads", "highways", "railways", "airports",
  "ports", "stations", "terminals", "landmarks", "monuments",
  "statues", "fountains", "gardens", "courtyards", "plazas",
  "squares", "circles", "intersections", "corners", "alleys",
  "pathways", "trails", "boardwalks", "piers", "docks", "marinas",
  "harbors", "bays", "coves", "inlets", "peninsulas", "islands",
  "continents", "countries", "states", "provinces", "regions",
  "districts", "counties", "municipalities", "territories", "colonies",
  "fyi", "challenge", "love", "chat"
];

export default function VideoEditForm({
  videoId,
  currentTitle,
  currentDescription,
  currentCategory,
  onSuccess,
  onCancel,
  onDelete
}: VideoEditFormProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription);
  const [category, setCategory] = useState(currentCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest(`/api/videos/${videoId}`, 'PATCH', {
        title,
        description,
        category
      });

      toast({
        title: "Video Updated",
        description: "Your video has been updated successfully.",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);

    try {
      await apiRequest(`/api/videos/${videoId}`, 'DELETE');

      toast({
        title: "Video Deleted",
        description: "Your video has been deleted successfully.",
      });
      
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter video title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your video..."
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isDeleting}
          className="flex-1"
        >
          Cancel
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteClick}
            disabled={isSubmitting || isDeleting}
            className="px-3"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || isDeleting}
          className="flex-1"
        >
          {isSubmitting ? "Updating..." : "Update Video"}
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex space-x-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? "Deleting..." : "Delete Video"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}