import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export type AdminMenuItem = {
  id: string;
  label: string;
  icon: string;
  path?: string;
  filled?: boolean;
};

type AdminLayoutProps = {
  menuItems: AdminMenuItem[];
  defaultActiveMenuId: string;
  title: string;
  subtitle: string;
  headerActions?: ReactNode;
  children: ReactNode;
  onLogout: () => Promise<void> | void;
  logoutRedirectPath?: string;
  mainClassName?: string;
};

const AdminLayout = ({
  menuItems,
  defaultActiveMenuId,
  title,
  subtitle,
  headerActions,
  children,
  onLogout,
  logoutRedirectPath = '/login',
  mainClassName,
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(defaultActiveMenuId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  const handleNavigate = (id: string, path?: string) => {
    setActiveMenu(id);
    setIsSidebarOpen(false);
    if (path) navigate(path);
  };

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await onLogout();
    navigate(logoutRedirectPath);
  };

  const SidebarContent = (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
            <span className="material-symbols-outlined text-2xl">shutter_speed</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white truncate">SPARK</h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase truncate">Photo Studio</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id, item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                activeMenu === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={item.filled && activeMenu === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span
                className={`text-sm ${activeMenu === item.id ? 'font-bold' : 'font-medium'} truncate`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span>Log Out</span>
      </button>
    </>
  );

  return (
    <div className="flex h-[100svh] w-full bg-background-light dark:bg-background-dark overflow-x-hidden">
      <aside className="hidden md:flex w-72 flex-col justify-between border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a0f0f] p-6 shrink-0 transition-all duration-300 overflow-y-auto">
        {SidebarContent}
      </aside>

      {isSidebarOpen ? (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-[#1a0f0f] border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shrink-0">
                  <span className="material-symbols-outlined text-2xl">shutter_speed</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white truncate">SPARK</h1>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase truncate">Photo Studio</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-900 dark:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 mb-6">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id, item.path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    activeMenu === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={item.filled && activeMenu === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-sm ${activeMenu === item.id ? 'font-bold' : 'font-medium'} truncate`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span>Log Out</span>
            </button>
          </aside>
        </div>
      ) : null}

      <main className={`min-w-0 flex-1 flex flex-col h-full overflow-hidden ${mainClassName ?? ''}`.trim()}>
        <header className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-background-light dark:bg-background-dark border-b border-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                aria-label="Buka menu"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-900 dark:text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight truncate sm:whitespace-normal">
                  {title}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-sans text-sm line-clamp-2">{subtitle}</p>
              </div>
            </div>
            {headerActions ? (
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">{headerActions}</div>
            ) : null}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4">
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 sm:gap-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

