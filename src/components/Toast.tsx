import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LazyMotion, m, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts(prev => [...prev, { id, type, message }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Get toast background color based on type
  const getToastColor = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'bg-green-500 dark:bg-green-600';
      case 'error':
        return 'bg-red-500 dark:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 dark:bg-yellow-600';
      case 'info':
        return 'bg-blue-500 dark:bg-blue-600';
      default:
        return 'bg-gray-500 dark:bg-gray-600';
    }
  };

  // Get toast icon based on type
  const getToastIcon = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'notifications';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <m.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut'
                }}
                className={`
                  ${getToastColor(toast.type)}
                  px-6 py-4 rounded-lg shadow-lg min-w-[300px] max-w-md
                  text-white pointer-events-auto
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-2xl flex-shrink-0">
                    {getToastIcon(toast.type)}
                  </span>

                  <p className="flex-1 text-sm font-medium leading-relaxed">
                    {toast.message}
                  </p>

                  <button
                    onClick={() => dismissToast(toast.id)}
                    className="ml-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
                    aria-label="Dismiss notification"
                  >
                    <span className="material-symbols-outlined text-xl">
                      close
                    </span>
                  </button>
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      </LazyMotion>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
