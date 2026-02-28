interface BrandedLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BrandedLoader = ({ text = 'Loading...', size = 'md', className = '' }: BrandedLoaderProps) => {
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Logo with custom pulse animation */}
      <div className="relative">
        <img
          src="/images/landing/stage55.png"
          alt="Loading"
          className={`${sizeClasses[size]} object-contain animate-logo-pulse`}
        />
      </div>

      {/* Loading text */}
      {text && (
        <p className={`${textSizeClasses[size]} font-medium text-gray-600 animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default BrandedLoader;
