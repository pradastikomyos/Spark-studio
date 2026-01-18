import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const handleLogout = async () => {
    await onLogout();
    navigate(logoutRedirectPath);
  };

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark">
      <aside className="flex w-72 flex-col justify-between border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a0f0f] p-6 shrink-0 transition-all duration-300 overflow-y-auto">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <span className="material-symbols-outlined text-2xl">shutter_speed</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">SPARK</h1>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">Photo Studio</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  if (item.path) navigate(item.path);
                }}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
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
                <span className={`text-sm ${activeMenu === item.id ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Log Out</span>
        </button>
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden ${mainClassName ?? ''}`.trim()}>
        <header className="flex-none px-8 py-6 bg-background-light dark:bg-background-dark border-b border-transparent">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">{title}</h2>
              <p className="text-gray-500 dark:text-gray-400 font-sans text-sm">{subtitle}</p>
            </div>
            {headerActions ? <div className="flex gap-3">{headerActions}</div> : null}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

