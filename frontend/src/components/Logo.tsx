import { cn } from '@/utils/cn';
import logoImage from '@/logo/logo black spark with tagline.png';

interface LogoProps {
  className?: string;
  invert?: boolean;
}

const Logo = ({ className, invert = false }: LogoProps) => {
  return (
    <img 
      src={logoImage} 
      alt="SPARK" 
      className={cn('h-8 w-auto md:h-12', invert && 'invert brightness-0 invert', className)}
    />
  );
};

export default Logo;
