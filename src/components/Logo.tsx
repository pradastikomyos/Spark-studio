import logoLight from '../logo/Light mode/light mode.png';
import logoDark from '../logo/dark mode/dark mode.png';

interface LogoProps {
  isDark: boolean;
  className?: string;
}

const Logo = ({ isDark, className = 'h-12 w-auto' }: LogoProps) => {
  return (
    <img 
      src={isDark ? logoDark : logoLight} 
      alt="Spark Photo Studio" 
      className={`transition-all duration-300 ${className}`}
      style={{
        transform: isDark ? 'scale(1)' : 'scale(1)',
        transformOrigin: 'left center'
      }}
    />
  );
};

export default Logo;
