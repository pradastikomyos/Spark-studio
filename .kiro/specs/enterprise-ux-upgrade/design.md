# Design Document: Enterprise UX Upgrade

## Overview

This design outlines the migration of Spark Stage from basic React patterns to enterprise-grade UX patterns. The upgrade replaces raw useEffect-based data fetching with SWR (Stale-While-Revalidate), implements skeleton screens for loading states, adds smooth animations with Framer Motion, and introduces optimistic UI updates. The design maintains backward compatibility with existing Supabase integration while significantly improving perceived and actual performance.

### Key Design Decisions

1. **SWR over React Query**: SWR is lighter (11KB vs 40KB), has simpler API, and integrates seamlessly with existing fetch patterns
2. **Framer Motion over React Spring**: Better TypeScript support, layout animations, and more intuitive API for page transitions
3. **Phased Migration**: Three-phase rollout (Customer → Admin → Supporting) allows incremental validation and reduces risk
4. **Coexistence Strategy**: SWR and useEffect can coexist during migration, enabling gradual adoption without breaking changes
5. **Skeleton over Spinner**: Skeleton screens provide better perceived performance and set user expectations for content structure

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SWRConfig (Global Provider)               │ │
│  │  - Default fetcher configuration                       │ │
│  │  - Error handling middleware                           │ │
│  │  - Cache TTL settings                                  │ │
│  │  - Retry and revalidation policies                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────────────┴────────────────────────────┐   │
│  │                                                       │   │
│  ▼                         ▼                            ▼   │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │   Customer   │  │    Admin     │  │  Supporting  │      │
│ │    Pages     │  │    Pages     │  │  Components  │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
│        │                  │                  │              │
│        └──────────────────┴──────────────────┘              │
│                           │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              useSWR Hooks Layer                        │ │
│  │  - useProducts()                                       │ │
│  │  - useTickets()                                        │ │
│  │  - useBookings()                                       │ │
│  │  - useOrders()                                         │ │
│  │  - useDashboardStats()                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Fetcher Functions Layer                   │ │
│  │  - supabaseFetcher<T>(query)                          │ │
│  │  - supabaseListFetcher<T>(table, filters)            │ │
│  │  - supabaseSingleFetcher<T>(table, id)               │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Supabase Backend      │
              │  - PostgreSQL Database  │
              │  - Auth Service         │
              │  - Edge Functions       │
              └─────────────────────────┘
```

### Data Flow

**Traditional useEffect Pattern (Before)**:
```
Component Mount → useEffect → setState(loading) → Fetch → setState(data) → Render
                                                    ↓
                                                  Error → setState(error) → Render
```

**SWR Pattern (After)**:
```
Component Mount → useSWR → Return cached data (if exists) → Render immediately
                    ↓
                  Revalidate in background → Update cache → Re-render with fresh data
                    ↓
                  On error → Retry with exponential backoff → Update error state
```

### Animation Flow

**Page Transitions**:
```
Route Change → AnimatePresence detects exit → Exit animation → Unmount old page
                                                ↓
                                              Mount new page → Enter animation
```

**Optimistic Updates**:
```
User Action → Immediate UI update (optimistic) → API call → Success: merge response
                                                              ↓
                                                            Failure: rollback + toast
```

## Components and Interfaces

### 1. SWR Configuration (`src/lib/swr.ts`)

**Purpose**: Centralized SWR configuration with Supabase-specific settings.

```typescript
import { SWRConfiguration } from 'swr';
import { supabase } from './supabase';

export const swrConfig: SWRConfiguration = {
  // Default fetcher uses Supabase client
  fetcher: (query: string) => supabase.from(query).select(),
  
  // Revalidation settings
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2 seconds
  
  // Cache settings
  focusThrottleInterval: 5000, // 5 seconds
  
  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000, // 5 seconds
  
  // Custom retry logic with exponential backoff
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Don't retry on 404
    if (error.status === 404) return;
    
    // Don't retry after 3 attempts
    if (retryCount >= 3) return;
    
    // Exponential backoff: 1s, 2s, 4s
    setTimeout(() => revalidate({ retryCount }), 1000 * Math.pow(2, retryCount));
  },
  
  // Global error handler
  onError: (error, key) => {
    console.error(`SWR Error [${key}]:`, error);
    // Integration point for toast notifications
    if (error.status !== 404) {
      // Will be handled by component-level error boundaries
    }
  }
};
```

### 2. Fetcher Functions (`src/lib/fetchers.ts`)

**Purpose**: Reusable Supabase query functions that work with SWR.

```typescript
import { supabase } from './supabase';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Generic Supabase fetcher for SWR
 * @param query - Supabase query builder
 * @returns Promise with data or throws error
 */
export async function supabaseFetcher<T>(
  query: PostgrestFilterBuilder<any, any, T[]>
): Promise<T[]> {
  const { data, error } = await query;
  
  if (error) {
    const err = new Error(error.message);
    (err as any).status = error.code === 'PGRST116' ? 404 : 500;
    (err as any).info = error;
    throw err;
  }
  
  return data || [];
}

/**
 * Fetcher for list queries with filters
 * @param table - Table name
 * @param select - Columns to select
 * @param filters - Optional filter function
 */
export async function supabaseListFetcher<T>(
  table: string,
  select: string = '*',
  filters?: (query: any) => any
): Promise<T[]> {
  let query = supabase.from(table).select(select);
  
  if (filters) {
    query = filters(query);
  }
  
  return supabaseFetcher<T>(query);
}

/**
 * Fetcher for single record by ID
 * @param table - Table name
 * @param id - Record ID
 * @param select - Columns to select
 */
export async function supabaseSingleFetcher<T>(
  table: string,
  id: string | number,
  select: string = '*'
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    const err = new Error(error.message);
    (err as any).status = 500;
    (err as any).info = error;
    throw err;
  }
  
  return data;
}

/**
 * Fetcher for authenticated user data
 * Automatically includes auth token
 */
export async function supabaseAuthFetcher<T>(
  query: PostgrestFilterBuilder<any, any, T[]>
): Promise<T[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }
  
  return supabaseFetcher<T>(query);
}
```

### 3. Custom SWR Hooks (`src/hooks/`)

**Purpose**: Domain-specific hooks that encapsulate data fetching logic.

```typescript
// src/hooks/useProducts.ts
import useSWR from 'swr';
import { supabaseListFetcher } from '../lib/fetchers';
import { Product } from '../types';

export function useProducts(categoryId?: string) {
  const key = categoryId 
    ? ['products', 'category', categoryId]
    : ['products'];
  
  return useSWR<Product[]>(
    key,
    () => supabaseListFetcher<Product>(
      'products',
      '*',
      (query) => {
        let q = query.eq('is_active', true);
        if (categoryId) {
          q = q.eq('category_id', categoryId);
        }
        return q.order('created_at', { ascending: false });
      }
    ),
    {
      // Product data is relatively static
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

// src/hooks/useTickets.ts
import useSWR from 'swr';
import { supabaseListFetcher } from '../lib/fetchers';
import { Ticket } from '../types';

export function useTickets(date?: string) {
  const key = date 
    ? ['tickets', 'date', date]
    : ['tickets'];
  
  return useSWR<Ticket[]>(
    key,
    () => supabaseListFetcher<Ticket>(
      'tickets',
      '*, ticket_type:ticket_types(*)',
      (query) => {
        let q = query.eq('is_active', true);
        if (date) {
          q = q.eq('date', date);
        }
        return q.order('date', { ascending: true });
      }
    ),
    {
      // Ticket availability changes frequently
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: true
    }
  );
}

// src/hooks/useMyTickets.ts
import useSWR from 'swr';
import { supabaseAuthFetcher } from '../lib/fetchers';
import { supabase } from '../lib/supabase';
import { BookingWithDetails } from '../types';

export function useMyTickets() {
  return useSWR<BookingWithDetails[]>(
    'my-tickets',
    async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const query = supabase
        .from('bookings')
        .select(`
          *,
          ticket:tickets(*, ticket_type:ticket_types(*)),
          payment:payments(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      return supabaseAuthFetcher<BookingWithDetails>(query);
    },
    {
      // User's tickets should refresh on focus
      revalidateOnFocus: true,
      dedupingInterval: 5000
    }
  );
}
```

### 4. Skeleton Components (`src/components/skeletons/`)

**Purpose**: Placeholder UI that mimics content structure during loading.

```typescript
// src/components/skeletons/ProductCardSkeleton.tsx
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-64 bg-gray-300 dark:bg-gray-700" />
      
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
        </div>
        
        {/* Price skeleton */}
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
        
        {/* Button skeleton */}
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// src/components/skeletons/TicketCardSkeleton.tsx
export function TicketCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md animate-pulse">
      <div className="space-y-4">
        {/* Date skeleton */}
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
        
        {/* Title skeleton */}
        <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded w-2/3" />
        
        {/* Details skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
        </div>
        
        {/* Price and button skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// src/components/skeletons/TableRowSkeleton.tsx
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
        </td>
      ))}
    </tr>
  );
}

// src/components/skeletons/DashboardStatSkeleton.tsx
export function DashboardStatSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md animate-pulse">
      <div className="space-y-3">
        {/* Icon skeleton */}
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
        
        {/* Value skeleton */}
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
        
        {/* Label skeleton */}
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
      </div>
    </div>
  );
}
```

### 5. Toast Notification System (`src/components/Toast.tsx`)

**Purpose**: Non-blocking notifications for errors and success messages.

```typescript
import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);
  
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`
                px-6 py-4 rounded-lg shadow-lg min-w-[300px] max-w-md
                ${toast.type === 'success' ? 'bg-green-500' : ''}
                ${toast.type === 'error' ? 'bg-red-500' : ''}
                ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
                ${toast.type === 'info' ? 'bg-blue-500' : ''}
                text-white
              `}
            >
              <div className="flex justify-between items-start">
                <p className="flex-1">{toast.message}</p>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="ml-4 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
```

### 6. Error Boundary (`src/components/ErrorBoundary.tsx`)

**Purpose**: Catch and handle component errors gracefully.

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  
  retry = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.state.error.message}
            </p>
            <button
              onClick={this.retry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### 7. Page Transition Wrapper (`src/components/PageTransition.tsx`)

**Purpose**: Smooth animations for route changes.

```typescript
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}
```

## Data Models

### SWR Cache Key Structure

SWR uses cache keys to identify and deduplicate requests. Our key structure follows these patterns:

```typescript
// Simple keys for global data
'products'
'tickets'
'categories'

// Compound keys for filtered data
['products', 'category', categoryId]
['tickets', 'date', date]
['bookings', 'user', userId]

// Nested keys for related data
['product', productId, 'reviews']
['ticket', ticketId, 'availability']
```

### TypeScript Types for SWR Responses

```typescript
// Generic SWR response type
interface SWRResponse<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T, shouldRevalidate?: boolean) => Promise<T | undefined>;
}

// Error type with status code
interface APIError extends Error {
  status: number;
  info?: any;
}

// Optimistic update options
interface OptimisticOptions<T> {
  optimisticData: T;
  rollbackOnError: boolean;
  populateCache: boolean;
  revalidate: boolean;
}
```

### Migration State Tracking

During the phased migration, we'll track which components have been migrated:

```typescript
// Migration status enum
enum MigrationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  VERIFIED = 'verified'
}

// Component migration tracking
interface ComponentMigration {
  path: string;
  phase: 1 | 2 | 3;
  status: MigrationStatus;
  usesEffect: boolean; // Still has useEffect for data fetching
  usesSWR: boolean;    // Uses SWR hooks
  hasSkeleton: boolean; // Has skeleton loading state
  hasAnimation: boolean; // Has Framer Motion animations
  hasOptimistic: boolean; // Has optimistic updates
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SWR Hook Usage for Data Fetching

*For any* component that fetches data from Supabase, the component should use useSWR hooks instead of raw useEffect with fetch logic.

**Validates: Requirements 1.1**

### Property 2: Request Deduplication

*For any* data that is requested by multiple components simultaneously, only one network request should be made and the cached response should be shared across all requesting components.

**Validates: Requirements 1.2**

### Property 3: Automatic Retry with Exponential Backoff

*For any* network request that fails, the system should automatically retry the request with exponentially increasing delays (1s, 2s, 4s) up to a maximum of 3 attempts.

**Validates: Requirements 1.3**

### Property 4: Background Revalidation

*For any* cached data that becomes stale, the system should serve the stale data immediately while fetching fresh data in the background, then update the UI when fresh data arrives.

**Validates: Requirements 1.4**

### Property 5: Cache Persistence Across Remounts

*For any* component that unmounts and then remounts, the component should immediately display cached data (if available) while revalidating in the background.

**Validates: Requirements 1.5**

### Property 6: Skeleton Screens During Loading

*For any* component that displays a list or collection of items (products, tickets, table rows, stats, forms), the component should display skeleton screens that match the structure and dimensions of the actual content during loading states.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

### Property 7: Toast Notifications for Errors

*For any* data fetch that fails, the system should display a toast notification containing the error message.

**Validates: Requirements 3.1, 11.1**

### Property 8: Retry Button on Network Errors

*For any* network error that occurs, the system should provide a retry button in the error state that allows users to retry the failed request.

**Validates: Requirements 3.2**

### Property 9: Optimistic Update Rollback

*For any* optimistic UI update that fails server-side, the system should rollback the UI to the previous state and display a toast notification to the user.

**Validates: Requirements 3.4, 5.4**

### Property 10: Error Type Differentiation

*For any* error that occurs (network, server, validation), the system should display user feedback that clearly distinguishes the error type through different messages or visual indicators.

**Validates: Requirements 3.5**

### Property 11: Toast Notification Queuing

*For any* scenario where multiple errors occur simultaneously, the system should queue toast notifications and display them stacked vertically without overlap.

**Validates: Requirements 3.6, 11.3**

### Property 12: Page Transition Animations

*For any* navigation between pages, the system should animate the transition with fade or slide effects using Framer Motion.

**Validates: Requirements 4.1**

### Property 13: Hover Animation Feedback

*For any* interactive element (button, card, link), the system should provide visual feedback with smooth animations when the user hovers over the element.

**Validates: Requirements 4.2**

### Property 14: Button Click Micro-Interactions

*For any* button click, the system should display micro-interactions such as scale, ripple, or color change animations.

**Validates: Requirements 4.3**

### Property 15: Staggered Card Entrance Animations

*For any* list of cards that appears on screen, the system should stagger the entrance animations with a delay between each card.

**Validates: Requirements 4.4**

### Property 16: 60fps Animation Performance

*For any* animation that runs in the application, the system should maintain 60 frames per second performance without dropping frames.

**Validates: Requirements 4.5, 9.4**

### Property 17: Cart Optimistic Updates

*For any* cart operation (add or remove item), the system should immediately update the cart UI before receiving server confirmation.

**Validates: Requirements 5.1, 5.2**

### Property 18: Booking Optimistic Feedback

*For any* ticket booking action, the system should immediately show a "booking in progress" state before receiving server confirmation.

**Validates: Requirements 5.3**

### Property 19: Optimistic Update Merging

*For any* optimistic update that succeeds, the system should merge the server response with the optimistic state to ensure data consistency.

**Validates: Requirements 5.5**

### Property 20: Optimistic vs Confirmed Visual Indicators

*For any* optimistic update, the system should provide visual indicators (such as opacity, loading spinner, or badge) to distinguish optimistic updates from confirmed updates.

**Validates: Requirements 5.6**

### Property 21: Supabase Auth Token Integration

*For any* SWR request that requires authentication, the system should automatically include the Supabase authentication token in the request headers.

**Validates: Requirements 6.2**

### Property 22: Fetcher Authentication Handling

*For any* fetcher function, the system should properly handle Supabase authentication by checking for valid sessions and throwing appropriate errors for unauthorized requests.

**Validates: Requirements 7.3**

### Property 23: Fetcher Error Handling

*For any* fetcher function that encounters an error, the system should properly handle the error by creating an Error object with status code and error details.

**Validates: Requirements 7.4**

### Property 24: Success Toast Notifications

*For any* action that completes successfully (booking, purchase, update), the system should display a success toast notification.

**Validates: Requirements 11.2**

### Property 25: Toast Auto-Dismiss Timing

*For any* toast notification that is displayed, the system should automatically dismiss it after exactly 5 seconds.

**Validates: Requirements 11.4**

### Property 26: Toast Manual Dismiss

*For any* toast notification that is displayed, the system should provide a dismiss button that allows users to manually close the toast before auto-dismiss.

**Validates: Requirements 11.5**

### Property 27: Toast Type Variety

*For any* toast notification, the system should support and correctly render different types (error, success, warning, info) with appropriate colors and icons.

**Validates: Requirements 11.6**

### Property 28: Error Boundary Catching

*For any* component that throws an error during rendering, the system should catch the error with an Error Boundary and prevent the entire application from crashing.

**Validates: Requirements 12.1**

### Property 29: Error Boundary Fallback UI

*For any* error caught by an Error Boundary, the system should display a fallback UI that includes error details and a "Try Again" button.

**Validates: Requirements 12.2, 12.4**

### Property 30: Error Boundary Logging

*For any* error caught by an Error Boundary, the system should log the error to the console with full error details and component stack trace.

**Validates: Requirements 12.3**

### Property 31: Error Isolation

*For any* component that fails within an Error Boundary, the rest of the application should continue functioning normally without being affected by the failed component.

**Validates: Requirements 12.6**

## Error Handling

### Error Categories

The system handles three categories of errors:

1. **Network Errors**: Connection failures, timeouts, DNS issues
   - Display: "Unable to connect. Please check your internet connection."
   - Action: Automatic retry with exponential backoff
   - UI: Retry button + connection status indicator

2. **Server Errors**: 500, 503, database errors
   - Display: "Something went wrong on our end. Please try again."
   - Action: Automatic retry (up to 3 attempts)
   - UI: Retry button + error toast

3. **Validation Errors**: 400, 422, business logic errors
   - Display: Specific validation message from server
   - Action: No automatic retry (user must fix input)
   - UI: Inline error messages + error toast

### Error Handling Flow

```
Error Occurs
    ↓
Categorize Error (Network/Server/Validation)
    ↓
┌─────────────┬─────────────┬─────────────┐
│   Network   │   Server    │ Validation  │
└─────────────┴─────────────┴─────────────┘
    ↓              ↓              ↓
Auto Retry     Auto Retry     No Retry
    ↓              ↓              ↓
Show Toast     Show Toast     Show Inline
    ↓              ↓              ↓
Retry Button   Retry Button   Fix Input
```

### SWR Error Handling

SWR provides built-in error handling through the `error` return value:

```typescript
const { data, error, isLoading } = useSWR(key, fetcher);

if (error) {
  // Error is automatically typed as APIError
  if (error.status === 404) {
    return <NotFound />;
  }
  if (error.status === 401) {
    return <Unauthorized />;
  }
  // Network or server error
  return <ErrorState error={error} onRetry={() => mutate()} />;
}
```

### Optimistic Update Error Handling

When optimistic updates fail, the system must:

1. **Rollback**: Revert UI to previous state
2. **Notify**: Show error toast with specific message
3. **Log**: Log error for debugging
4. **Preserve**: Keep user input if applicable (e.g., form data)

```typescript
const { mutate } = useSWR('/api/cart');

async function addToCart(item) {
  try {
    // Optimistic update
    await mutate(
      async (currentCart) => {
        // Call API
        const response = await supabase
          .from('cart_items')
          .insert(item);
        
        if (response.error) throw response.error;
        
        return [...currentCart, response.data];
      },
      {
        optimisticData: (currentCart) => [...currentCart, item],
        rollbackOnError: true, // Auto-rollback on error
        revalidate: false
      }
    );
    
    showToast('success', 'Item added to cart');
  } catch (error) {
    showToast('error', `Failed to add item: ${error.message}`);
  }
}
```

### Error Boundary Strategy

Error Boundaries are placed at strategic levels:

1. **App Level**: Catches catastrophic errors, shows full-page error
2. **Page Level**: Catches page-specific errors, shows page error state
3. **Component Level**: Catches component errors, shows component error state

```typescript
// App.tsx
<ErrorBoundary fallback={(error, retry) => <AppError error={error} retry={retry} />}>
  <Router>
    <Routes>
      <Route path="/shop" element={
        <ErrorBoundary fallback={(error, retry) => <PageError error={error} retry={retry} />}>
          <ShopPage />
        </ErrorBoundary>
      } />
    </Routes>
  </Router>
</ErrorBoundary>
```

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Specific component rendering scenarios
- Integration points between SWR and Supabase
- Error boundary behavior with specific errors
- Toast notification display and dismissal
- Animation trigger conditions

**Property-Based Tests**: Verify universal properties across all inputs
- SWR caching behavior with random data
- Request deduplication with concurrent requests
- Retry logic with various failure scenarios
- Skeleton screen rendering for different content types
- Optimistic update rollback with random operations

### Property-Based Testing Configuration

**Library**: We'll use `@fast-check/vitest` for property-based testing in Vitest.

**Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Property tests run 100 iterations minimum
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
});
```

**Test Structure**:
```typescript
import { fc, test } from '@fast-check/vitest';
import { render, waitFor } from '@testing-library/react';

// Feature: enterprise-ux-upgrade, Property 2: Request Deduplication
test.prop([fc.string(), fc.array(fc.integer({ min: 1, max: 10 }))])(
  'multiple components requesting same data should deduplicate requests',
  async (key, componentCounts) => {
    // Test implementation
  },
  { numRuns: 100 }
);
```

### Test Coverage Requirements

**Minimum Coverage**:
- Unit test coverage: 80% of new code
- Property test coverage: All 31 correctness properties
- Integration test coverage: All migration phases

**Critical Paths to Test**:
1. SWR configuration and fetcher functions
2. Skeleton screen rendering for all content types
3. Toast notification system (display, queue, dismiss)
4. Error boundary catching and fallback
5. Optimistic updates (success and failure paths)
6. Page transitions and animations
7. Request deduplication and caching

### Testing Migration Phases

Each migration phase must be tested independently:

**Phase 1 (Customer Pages)**:
- Test Shop page with SWR
- Test ProductDetailPage with SWR
- Test BookingPage with SWR
- Test MyTicketsPage with SWR
- Verify skeleton screens on all pages
- Verify page transitions work

**Phase 2 (Admin Pages)**:
- Test Dashboard with SWR
- Test StoreInventory with SWR
- Test all admin pages with SWR
- Verify admin-specific error handling
- Verify admin page transitions

**Phase 3 (Supporting Components)**:
- Test TicketSection with SWR
- Test success pages with SWR
- Test scan page with SWR
- Verify all components work together

### Performance Testing

**Metrics to Track**:
- Bundle size (must not exceed +300KB)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Animation frame rate (must maintain 60fps)
- SWR cache hit rate
- Network request count (should decrease with deduplication)

**Performance Test Tools**:
- Lighthouse for TTI and FCP
- Chrome DevTools Performance tab for frame rate
- Webpack Bundle Analyzer for bundle size
- React DevTools Profiler for re-render tracking

### Test Execution Strategy

**During Development**:
```bash
npm run test:watch  # Run tests in watch mode
npm run test:coverage  # Check coverage
```

**Before Committing**:
```bash
npm run test  # Run all tests
npm run lint  # Check code quality
npm run build  # Verify build succeeds
```

**CI/CD Pipeline**:
1. Run all unit tests
2. Run all property-based tests (100 iterations each)
3. Run integration tests
4. Check test coverage (must be ≥80%)
5. Run Lighthouse performance tests
6. Verify bundle size (must be ≤300KB increase)

### Rollback Testing

Each phase must have rollback tests:

**Rollback Scenario**:
1. Revert migration commits
2. Run full test suite
3. Verify all tests pass
4. Verify application works correctly
5. Verify no data loss or corruption

**Rollback Criteria**:
- Any test failure in new code
- Performance regression >10%
- Bundle size increase >300KB
- Critical bug in production
- User-reported issues >5 in 24 hours

