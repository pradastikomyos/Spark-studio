interface StarSparkleIconProps {
  className?: string;
}

export default function StarSparkleIcon({ className = '' }: StarSparkleIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main Star */}
      <path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill="currentColor"
        className="animate-pulse-slow"
      />
      
      {/* Sparkle 1 - Top Right */}
      <circle
        cx="18"
        cy="6"
        r="1.5"
        fill="currentColor"
        className="animate-sparkle-1"
      />
      
      {/* Sparkle 2 - Bottom Left */}
      <circle
        cx="6"
        cy="18"
        r="1"
        fill="currentColor"
        className="animate-sparkle-2"
      />
      
      {/* Sparkle 3 - Top Left */}
      <circle
        cx="5"
        cy="7"
        r="0.8"
        fill="currentColor"
        className="animate-sparkle-3"
      />
    </svg>
  );
}
