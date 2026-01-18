import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

type PublicLayoutProps = {
  isDark: boolean;
  onToggleDarkMode: () => void;
};

export default function PublicLayout({ isDark, onToggleDarkMode }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isDark={isDark} onToggleDarkMode={onToggleDarkMode} />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

