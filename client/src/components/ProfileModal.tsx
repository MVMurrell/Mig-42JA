// This component has been removed - use /profile route instead
// All profile functionality has been consolidated to the real profile page

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  // Redirect to profile page instead of showing modal
  window.location.href = '/profile';
  return null;
}