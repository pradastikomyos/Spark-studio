import { cn } from '@/utils/cn';

interface LogoProps {
  className?: string;
}

const Logo = ({ className }: LogoProps) => {
  return (
    <div className={cn('font-serif font-black tracking-tight text-gray-900', className)}>
      SPARK
    </div>
  );
};

export default Logo;
