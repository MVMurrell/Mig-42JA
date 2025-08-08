-- Add some dummy users for testing
INSERT INTO users (id, email, first_name, last_name, username, bio, gem_coins, profile_image_url) VALUES
('user001', 'alex@example.com', 'Alex', 'Johnson', 'alexj', 'Travel enthusiast and food lover', 150, 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex&backgroundColor=b6e3f4'),
('user002', 'sarah@example.com', 'Sarah', 'Chen', 'sarahc', 'Fitness coach and lifestyle blogger', 200, 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=c0aede'),
('user003', 'mike@example.com', 'Mike', 'Rodriguez', 'mikeR', 'Tech entrepreneur and educator', 75, 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike&backgroundColor=d1d4f9'),
('user004', 'emily@example.com', 'Emily', 'Williams', 'emilyW', 'Art student and creative writer', 120, 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily&backgroundColor=ffd5dc')
ON CONFLICT (id) DO NOTHING;

-- Add some dummy videos from these users around Los Angeles area
INSERT INTO videos (id, user_id, title, description, video_url, thumbnail_url, category, latitude, longitude, views, likes) VALUES
('vid001', 'user001', 'Amazing Sunset at Venice Beach', 'Caught this incredible sunset while walking along Venice Beach boardwalk', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', NULL, 'travel', 34.0195, -118.4912, 45, 12),
('vid002', 'user002', 'Morning Workout in Griffith Park', 'Early morning fitness routine with the Hollywood sign in the background', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', NULL, 'fitness', 34.1365, -118.2940, 78, 23),
('vid003', 'user001', 'Food Truck Paradise Downtown', 'Discovered this amazing taco truck in downtown LA', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', NULL, 'food', 34.0522, -118.2437, 92, 34),
('vid004', 'user003', 'Tech Startup Pitch Event', 'Sharing insights from a recent startup pitch competition', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', NULL, 'business', 34.0928, -118.3287, 156, 67),
('vid005', 'user004', 'Street Art in Arts District', 'Exploring the incredible murals and street art in downtown LA', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', NULL, 'entertainment', 34.0394, -118.2348, 203, 89),
('vid006', 'user002', 'Healthy Smoothie Recipe', 'Quick and nutritious post-workout smoothie recipe', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', NULL, 'lifestyle', 34.0736, -118.4004, 67, 19),
('vid007', 'user003', 'Coding Bootcamp Experience', 'My journey through an intensive coding bootcamp program', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', NULL, 'education', 34.0522, -118.2597, 134, 45),
('vid008', 'user001', 'Hidden Hiking Trail Discovery', 'Found this secret trail in the Hollywood Hills', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', NULL, 'travel', 34.1341, -118.3215, 89, 28),
('vid009', 'user004', 'Late Night Coffee Shop Vibes', 'The perfect study spot for creative minds', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', NULL, 'lifestyle', 34.0928, -118.3628, 45, 15),
('vid010', 'user002', 'Beach Volleyball Tournament', 'Competing in a local beach volleyball competition', 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4', NULL, 'fitness', 34.0195, -118.4912, 112, 38)
ON CONFLICT (id) DO NOTHING;