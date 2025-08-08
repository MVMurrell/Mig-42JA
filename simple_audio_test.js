// Simple test to identify audio processing failure
console.log('Testing audio processing failure...');

// Check if recent video exists and has problematic audio
const testVideoId = '8e1d4e8a-addb-40c7-92db-d72117d12d32';
console.log('Testing video ID:', testVideoId);

// Test basic Google Cloud credentials
try {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const bucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
  console.log('Project ID:', projectId ? 'PRESENT' : 'MISSING');
  console.log('Storage bucket:', bucket ? 'PRESENT' : 'MISSING');
  console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'PRESENT' : 'MISSING');
} catch (error) {
  console.error('Environment check failed:', error.message);
}
