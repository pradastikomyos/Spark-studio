import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export type AdminMenuSection = {
  id: string;
  label: string;
  items: AdminMenuItem[];
};

export type AdminMenuItem = {
  id: string;
  label: string;
  icon: string;
  path?: string;
  filled?: boolean;
  badge?: number;
  highlight?: boolean;
};

type AdminLayoutProps = {
  menuItems: AdminMenuItem[];
  menuSections?: AdminMenuSection[];
  defaultActiveMenuId: string;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  onLogout: () => Promise<void> | void;
  logoutRedirectPath?: string;
  mainClassName?: string;
};

const AdminLayout = ({
  menuItems,
  menuSections = [],
  defaultActiveMenuId,
  title,
  children,
  onLogout,
  logoutRedirectPath = '/login',
  mainClassName,
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeMenu, setActiveMenu] = useState(defaultActiveMenuId);
  const [expandedSections, setExpandedSections] = useState<string[]>(['tickets', 'store']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close sidebar on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeMenu]);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-click
    
    try {
      setIsLoggingOut(true);
      await onLogout();
      navigate(logoutRedirectPath);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getUserInitials = () => {
    if (!user?.email) return 'A';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Drawer on mobile, fixed on desktop */}
      <aside className={`
        fixed md:relative
        inset-y-0 left-0
        z-50 md:z-auto
        flex w-72 flex-col justify-between 
        border-r border-white/5 bg-surface-darker 
        p-4 shrink-0 overflow-y-auto
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 md:hidden text-gray-400 hover:text-white"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-white shadow-lg shadow-red-900/20">
              <span className="material-symbols-outlined text-xl">shutter_speed</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white font-display truncate">SPARK</h1>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (item.path) navigate(item.path);
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors min-w-0 ${
                  activeMenu === item.id
                    ? 'bg-white/5 text-white border border-white/5'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl flex-shrink-0 ${activeMenu === item.id ? 'text-primary' : ''}`}
                  style={item.filled && activeMenu === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium truncate">{item.label}</span>
              </button>
            ))}

            {menuSections.map((section) => (
              <div key={section.id}>
                <div className="mt-4 px-3 mb-1 flex items-center justify-between min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate">
                    {section.label}
                  </span>
                  <button onClick={() => toggleSection(section.id)} className="flex-shrink-0">
                    <span className="material-symbols-outlined text-base text-gray-600">
                      {expandedSections.includes(section.id) ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
                {expandedSections.includes(section.id) && (
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveMenu(item.id);
                          if (item.path) navigate(item.path);
                        }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors min-w-0 ${
                          activeMenu === item.id
                            ? 'text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        } ${item.highlight ? 'text-white' : ''}`}
                      >
                        <span className={`material-symbols-outlined text-xl flex-shrink-0 ${item.highlight ? 'text-white' : ''}`}>
                          {item.icon}
                        </span>
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-gray-300 flex-shrink-0 ml-2">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`flex w-full items-center gap-3 rounded-lg p-2 hover:bg-white/5 transition-colors text-left group min-w-0 ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="h-8 w-8 rounded bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="truncate text-sm font-medium text-white">{isLoggingOut ? 'Logging out...' : 'Admin User'}</p>
              <p className="truncate text-xs text-gray-500">{user?.email || 'admin@spark.com'}</p>
            </div>
            <span className={`material-symbols-outlined text-gray-500 group-hover:text-white flex-shrink-0 ${isLoggingOut ? 'animate-spin' : ''}`}>
              {isLoggingOut ? 'progress_activity' : 'logout'}
            </span>
          </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden bg-background-dark relative ${mainClassName ?? ''}`.trim()}>
        <header className="flex-none px-4 md:px-8 py-4 flex justify-between items-center gap-4 border-b border-white/5 bg-surface-darker/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Hamburger menu - mobile only */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white flex-shrink-0"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <h2 className="text-lg md:text-xl font-bold text-white font-display truncate">{title}</h2>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              search
            </span>
            <input
              className="w-full bg-surface-dark border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-300 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600"
              placeholder="Search..."
              type="text"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
