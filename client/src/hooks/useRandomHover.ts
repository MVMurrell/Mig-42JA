import { useEffect, useRef } from 'react';

const colors = [
  'hsl(0, 72%, 51%)',     // Jemzy Red
  'hsl(24, 100%, 48%)',   // Jemzy Orange  
  'hsl(207, 90%, 54%)',   // Jemzy Blue
  'hsl(142, 71%, 45%)',   // Jemzy Green
  'hsl(259, 53%, 70%)',   // Jemzy Purple
  'hsl(45, 100%, 50%)',   // Jemzy Gold
  'hsl(320, 70%, 55%)',   // Pink
  'hsl(280, 65%, 60%)',   // Violet
  'hsl(180, 70%, 50%)',   // Cyan
  'hsl(50, 85%, 55%)',    // Bright Yellow
  'hsl(15, 80%, 60%)',    // Coral
  'hsl(270, 75%, 65%)',   // Magenta
];

export function useRandomHover<T extends HTMLElement = HTMLElement>() {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseEnter = () => {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      element.style.setProperty('--random-color', randomColor);
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return elementRef;
}