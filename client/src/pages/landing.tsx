import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Gem, MapPin, Users, Video, Star, Heart } from "lucide-react";
import jemzyLogo from "@assets/JemzyLogoIcon.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={jemzyLogo} alt="Jemzy" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Jemzy</h1>
          </div>
          <Button 
            onClick={() => window.location.href = "/api/login"}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Discover Stories Around You
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Jemzy brings location-based video sharing to life. Drop video gems at your favorite spots 
            and unlock others' stories as you explore the world around you.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg"
          >
            Start Exploring
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How Jemzy Works
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-xl">Drop Video Jems</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Record up to 60-second videos and drop them as Jems at your current location. 
                Share your experiences, discoveries, and moments with the world.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-500" />
              </div>
              <CardTitle className="text-xl">Explore Your Area</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Walk around and discover video Jems dropped by others. Get within 100 feet 
                of a Jem to unlock and watch the video content.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-xl">Connect & Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Follow other creators, join groups, and build your collection of favorite Jems. 
                Earn Jem coins by engaging with the community.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-500" />
              </div>
              <CardTitle className="text-xl">Gamified Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Earn gem coins by watching videos, posting content, and engaging with the community. 
                Use coins to unlock premium features and content.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="text-xl">Categories & Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Organize your content by categories like Arts & Fun, Education, Events, and Sports. 
                Filter discoveries based on your interests.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gem className="w-8 h-8 text-orange-500" />
              </div>
              <CardTitle className="text-xl">Digital Avatar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your location is represented by your digital avatar with a 100-foot radius circle, 
                showing you exactly what content you can access.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Start Your Journey?
          </h3>
          <p className="text-xl mb-8 text-red-100">
            Join thousands of creators sharing their world through Jemzy
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            className="bg-white text-red-500 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Jemzy</span>
          </div>
          <p className="text-gray-400">
            © 2024 Jemzy. Discover the world around you, one gem at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
