import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils.ts"

// Random colors for hover effects
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

const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground random-hover",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onMouseEnter, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Apply random color effect for outline variant buttons
      if (variant === 'outline') {
        const randomColor = getRandomColor();
        e.currentTarget.style.setProperty('--hover-color', randomColor);
      }
      
      // Call original onMouseEnter if provided
      if (onMouseEnter) {
        onMouseEnter(e);
      }
    };
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onMouseEnter={handleMouseEnter}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
