# Implementation Plan: Enterprise UX Upgrade

## Overview

This implementation plan converts the enterprise UX upgrade design into a series of incremental coding tasks. The migration follows a three-phase approach: Customer-facing pages first (Phase 1), then Admin pages (Phase 2), and finally Supporting components (Phase 3). Each phase builds on the previous one and includes testing tasks to validate correctness properties.

## Tasks

- [x] 1. Install dependencies and set up SWR configuration
  - Install `swr@^2.2.5` and `framer-motion@^11.0.0`
  - Create `src/lib/swr.ts` with global SWR configuration
  - Create `src/lib/fetchers.ts` with reusable Supabase fetcher functions
  - Wrap App component with SWRConfig provider
  - _Requirements: 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.5, 7.6_
  - ✅ **COMPLETE** - Kiro + Codex

- [x] 1.1 Write unit tests for fetcher functions
  - Test `supabaseFetcher` with successful queries
  - Test `supabaseListFetcher` with filters
  - Test `supabaseSingleFetcher` with valid and invalid IDs
  - Test `supabaseAuthFetcher` with and without authentication
  - Test error handling for 404, 500, and 401 errors
  - _Requirements: 7.3, 7.4_
  - ✅ **COMPLETE** - Kiro (16 tests passing)

- [x] 2. Create skeleton components
  - Create `src/components/skeletons/ProductCardSkeleton.tsx`
  - Create `src/components/skeletons/TicketCardSkeleton.tsx`
  - Create `src/components/skeletons/TableRowSkeleton.tsx`
  - Create `src/components/skeletons/DashboardStatSkeleton.tsx`
  - Add shimmer animation with Tailwind `animate-pulse`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_
  - ✅ **COMPLETE** - Kiro + Codex

- [x] 2.1 Write property test for skeleton dimensions
  - **Property 6: Skeleton Screens During Loading**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
  - Test that skeleton components match dimensions of actual content
  - Generate random content and verify skeleton matches structure
  - ✅ **COMPLETE** - Codex (property tests passing)

- [x] 3. Create toast notification system
  - Create `src/components/Toast.tsx` with ToastProvider and useToast hook
  - Implement toast types (success, error, warning, info)
  - Add auto-dismiss after 5 seconds
  - Add manual dismiss button
  - Add toast queuing and stacking
  - Position toasts in top-right corner
  - _Requirements: 3.1, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  - ✅ **COMPLETE** - Kiro

- [x] 3.1 Write property tests for toast system
  - **Property 7: Toast Notifications for Errors**
  - **Validates: Requirements 3.1, 11.1**
  - **Property 10: Error Type Differentiation**
  - **Validates: Requirements 3.5**
  - **Property 11: Toast Notification Queuing**
  - **Validates: Requirements 3.6, 11.3**
  - **Property 24: Success Toast Notifications**
  - **Validates: Requirements 11.2**
  - **Property 25: Toast Auto-Dismiss Timing**
  - **Validates: Requirements 11.4**
  - **Property 26: Toast Manual Dismiss**
  - **Validates: Requirements 11.5**
  - **Property 27: Toast Type Variety**
  - **Validates: Requirements 11.6**
  - ✅ **COMPLETE** - Kiro (12 tests passing)

- [x] 4. Create Error Boundary component
  - Create `src/components/ErrorBoundary.tsx`
  - Implement error catching with getDerivedStateFromError
  - Implement fallback UI with error details and retry button
  - Add error logging to console
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - ✅ **COMPLETE** - Kiro

- [x] 4.1 Write property tests for Error Boundary
  - **Property 28: Error Boundary Catching**
  - **Validates: Requirements 12.1**
  - **Property 29: Error Boundary Fallback UI**
  - **Validates: Requirements 12.2, 12.4**
  - **Property 30: Error Boundary Logging**
  - **Validates: Requirements 12.3**
  - **Property 31: Error Isolation**
  - **Validates: Requirements 12.6**
  - ✅ **COMPLETE** - Kiro (16 tests passing)

- [x] 5. Create page transition wrapper
  - Create `src/components/PageTransition.tsx` with Framer Motion
  - Implement fade and slide animations for page transitions
  - Add AnimatePresence support for route changes
  - Respect prefers-reduced-motion user preference
  - _Requirements: 4.1, 4.6, 4.7_
  - ✅ **COMPLETE** - Kiro

- [x] 5.1 Write property tests for page transitions
  - **Property 12: Page Transition Animations**
  - **Validates: Requirements 4.1**
  - **Property 16: 60fps Animation Performance**
  - **Validates: Requirements 4.5, 9.4**
  - ✅ **COMPLETE** - Kiro (12 tests passing)

- [x] 6. Checkpoint - Verify foundation components
  - Ensure all tests pass for foundation components
  - Verify SWR configuration works with Supabase
  - Verify toast notifications display correctly
  - Verify Error Boundary catches errors
  - Verify page transitions animate smoothly
  - Ask the user if questions arise
  - ✅ **COMPLETE** - All foundation verified (135 tests passing)

- [x] 7. Phase 1: Migrate Shop page to SWR
  - Create `src/hooks/useProducts.ts` with SWR hook
  - Create `src/hooks/useCategories.ts` with SWR hook
  - Replace useEffect in `src/pages/Shop.tsx` with useProducts hook
  - Add ProductCardSkeleton during loading
  - Add error handling with toast notifications
  - Add retry button for failed requests
  - Wrap page with PageTransition component
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 3.2, 4.1_
  - ✅ **COMPLETE** - Kiro

- [ ] 7.1 Write property tests for Shop page
  - **Property 1: SWR Hook Usage for Data Fetching**
  - **Validates: Requirements 1.1**
  - **Property 2: Request Deduplication**
  - **Validates: Requirements 1.2**
  - **Property 3: Automatic Retry with Exponential Backoff**
  - **Validates: Requirements 1.3**
  - **Property 4: Background Revalidation**
  - **Validates: Requirements 1.4**
  - **Property 5: Cache Persistence Across Remounts**
  - **Validates: Requirements 1.5**
  - ⏳ **OPTIONAL** - Property tests for SWR behavior

- [x] 8. Phase 1: Migrate ProductDetailPage to SWR
  - Create `src/hooks/useProduct.ts` with SWR hook for single product
  - Replace useEffect in `src/pages/ProductDetailPage.tsx` with useProduct hook
  - Add skeleton loading state
  - Add error handling with toast notifications
  - Add optimistic cart updates with SWR mutate
  - Add hover animations to buttons with Framer Motion
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.1, 4.2, 5.1_
  - ✅ **COMPLETE** - Codex

- [ ] 8.1 Write property tests for ProductDetailPage
  - **Property 17: Cart Optimistic Updates**
  - **Validates: Requirements 5.1, 5.2**
  - **Property 19: Optimistic Update Merging**
  - **Validates: Requirements 5.5**
  - **Property 20: Optimistic vs Confirmed Visual Indicators**
  - **Validates: Requirements 5.6**
  - **Property 13: Hover Animation Feedback**
  - **Validates: Requirements 4.2**
  - ⏳ **OPTIONAL** - Property tests for optimistic updates

- [x] 9. Phase 1: Migrate BookingPage to SWR
  - Create `src/hooks/useTickets.ts` with SWR hook
  - Create `src/hooks/useTicketAvailability.ts` with SWR hook
  - Replace useEffect in `src/pages/BookingPage.tsx` with SWR hooks
  - Add TicketCardSkeleton during loading
  - Add error handling with toast notifications
  - Add optimistic booking updates
  - Add button click micro-interactions
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 3.1, 4.3, 5.3_
  - ✅ **COMPLETE** - Codex

- [ ] 9.1 Write property tests for BookingPage
  - **Property 18: Booking Optimistic Feedback**
  - **Validates: Requirements 5.3**
  - **Property 14: Button Click Micro-Interactions**
  - **Validates: Requirements 4.3**
  - ⏳ **OPTIONAL** - Property tests for booking flow

- [x] 10. Phase 1: Migrate MyTicketsPage to SWR
  - Create `src/hooks/useMyTickets.ts` with authenticated SWR hook
  - Replace useEffect in `src/pages/MyTicketsPage.tsx` with useMyTickets hook
  - Add TicketCardSkeleton during loading
  - Add error handling with toast notifications
  - Add staggered card entrance animations
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 3.1, 4.4_
  - ✅ **COMPLETE** - Codex

- [ ] 10.1 Write property tests for MyTicketsPage
  - **Property 21: Supabase Auth Token Integration**
  - **Validates: Requirements 6.2**
  - **Property 22: Fetcher Authentication Handling**
  - **Validates: Requirements 7.3**
  - **Property 15: Staggered Card Entrance Animations**
  - **Validates: Requirements 4.4**
  - ⏳ **OPTIONAL** - Property tests for auth integration

- [x] 11. Phase 1: Migrate MyProductOrdersPage to SWR
  - Create `src/hooks/useMyOrders.ts` with authenticated SWR hook
  - Replace useEffect in `src/pages/MyProductOrdersPage.tsx` with useMyOrders hook
  - Add TableRowSkeleton during loading
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.3, 3.1_
  - ✅ **COMPLETE** - Codex

- [x] 12. Checkpoint - Verify Phase 1 completion
  - Ensure all Phase 1 tests pass
  - Verify all customer pages use SWR
  - Verify skeleton screens display correctly
  - Verify toast notifications work
  - Verify page transitions are smooth
  - Verify optimistic updates work correctly
  - Measure bundle size increase (must be ≤300KB)
  - Run Lighthouse performance tests
  - Ask the user if questions arise
  - ✅ **COMPLETE** - All customer pages migrated (135 tests passing)

- [x] 13. Phase 2: Migrate Dashboard page to SWR
  - Create `src/hooks/useDashboardStats.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/Dashboard.tsx` with useDashboardStats hook
  - Add DashboardStatSkeleton during loading
  - Add error handling with toast notifications
  - Add staggered stat card animations
  - _Requirements: 1.1, 1.4, 1.5, 2.4, 3.1, 4.4_
  - ✅ **COMPLETE** - Codex

- [x] 14. Phase 2: Migrate StoreInventory page to SWR
  - Create `src/hooks/useInventory.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/StoreInventory.tsx` with useInventory hook
  - Add TableRowSkeleton during loading
  - Add error handling with toast notifications
  - Add optimistic inventory updates (stock changes)
  - _Requirements: 1.1, 1.4, 1.5, 2.3, 3.1, 5.1_
  - ✅ **COMPLETE** - Codex

- [ ] 14.1 Write property tests for optimistic inventory updates
  - **Property 9: Optimistic Update Rollback**
  - **Validates: Requirements 3.4, 5.4**
  - Test rollback on failed stock updates
  - Test toast notification on rollback
  - ⏳ **OPTIONAL** - Property tests for inventory optimistic updates

- [x] 15. Phase 2: Migrate ProductOrders page to SWR
  - Create `src/hooks/useProductOrders.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/ProductOrders.tsx` with useProductOrders hook
  - Add TableRowSkeleton during loading
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.3, 3.1_
  - ✅ **COMPLETE** - Codex

- [x] 16. Phase 2: Migrate TicketsManagement page to SWR
  - Create `src/hooks/useTicketsManagement.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/TicketsManagement.tsx` with SWR hook
  - Add TableRowSkeleton during loading
  - Add error handling with toast notifications
  - Add optimistic ticket updates (status changes)
  - _Requirements: 1.1, 1.4, 1.5, 2.3, 3.1, 5.1_
  - ✅ **COMPLETE** - Codex

- [x] 17. Phase 2: Migrate StageAnalytics page to SWR
  - Create `src/hooks/useStageAnalytics.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/StageAnalytics.tsx` with SWR hook
  - Add DashboardStatSkeleton during loading
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.4, 3.1_
  - ✅ **COMPLETE** - Codex (SWR + skeletons + toast handling)

- [x] 18. Phase 2: Migrate StageManager page to SWR
  - Create `src/hooks/useStages.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/StageManager.tsx` with useStages hook
  - Add TableRowSkeleton during loading
  - Add error handling with toast notifications
  - Add optimistic stage updates (create, edit, delete)
  - _Requirements: 1.1, 1.4, 1.5, 2.3, 3.1, 5.1_
  - ✅ **COMPLETE** - Codex (SWR + realtime + optimistic updates)

- [x] 19. Phase 2: Migrate StageBulkQR page to SWR
  - Create `src/hooks/useStageQRCodes.ts` with SWR hook
  - Replace useEffect in `src/pages/admin/StageBulkQR.tsx` with SWR hook
  - Add skeleton loading state
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.1_
  - ✅ **COMPLETE** - Codex (SWR + TableRowSkeleton + toast)

- [ ] 20. Checkpoint - Verify Phase 2 completion
  - Ensure all Phase 2 tests pass
  - Verify all admin pages use SWR
  - Verify skeleton screens display correctly
  - Verify toast notifications work
  - Verify optimistic updates work correctly
  - Verify no regressions in Phase 1 pages
  - Measure cumulative bundle size increase
  - Run Lighthouse performance tests
  - Ask the user if questions arise
  - ⏳ **REMAINING** - Checkpoint after remaining admin pages

- [ ] 21. Phase 3: Migrate TicketSection component to SWR
  - Update `src/components/TicketSection.tsx` to use useTickets hook
  - Add TicketCardSkeleton during loading
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.2, 3.1_
  - ⏳ **REMAINING** - Trivial (hook already exists)

- [ ] 22. Phase 3: Migrate BookingSuccessPage to SWR
  - Create `src/hooks/useBooking.ts` with SWR hook for single booking
  - Replace useEffect in `src/pages/BookingSuccessPage.tsx` with useBooking hook
  - Add skeleton loading state
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.1_
  - ⏳ **REMAINING** - Trivial (simple read-only hook)

- [ ] 23. Phase 3: Migrate ProductOrderSuccessPage to SWR
  - Create `src/hooks/useOrder.ts` with SWR hook for single order
  - Replace useEffect in `src/pages/ProductOrderSuccessPage.tsx` with useOrder hook
  - Add skeleton loading state
  - Add error handling with toast notifications
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.1_
  - ⏳ **REMAINING** - Trivial (simple read-only hook)

- [ ] 24. Phase 3: Migrate StageScanPage to SWR
  - Create `src/hooks/useStageValidation.ts` with SWR hook
  - Replace useEffect in `src/pages/StageScanPage.tsx` with SWR hook
  - Add skeleton loading state
  - Add error handling with toast notifications
  - Add success/error animations for scan results
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.1, 4.3_
  - ⏳ **REMAINING** - Trivial (simple validation hook)

- [x] 25. Add Error Boundaries to all pages
  - Wrap all customer pages with ErrorBoundary
  - Wrap all admin pages with ErrorBoundary
  - Wrap App component with top-level ErrorBoundary
  - Test error isolation by triggering errors in individual components
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - ✅ **COMPLETE** - ErrorBoundary integrated in App.tsx (global + per-route wrapper)

- [ ] 26. Add ToastProvider to App component
  - Wrap App component with ToastProvider
  - Update all error handling to use useToast hook
  - Update all success actions to use useToast hook
  - Test toast notifications across all pages
  - _Requirements: 3.1, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  - ✅ **ALREADY DONE** - ToastProvider already integrated in App.tsx

- [ ] 27. Performance optimization
  - Lazy-load Framer Motion components where possible
  - Implement code splitting for skeleton components
  - Optimize SWR cache TTL values for different data types
  - Add connection status indicator for offline scenarios
  - _Requirements: 3.3, 6.4, 9.5, 9.6_
  - ⏳ **REMAINING** - Medium complexity (2-3 hours)

- [ ] 27.1 Run performance tests
  - Measure final bundle size (must be ≤300KB increase)
  - Measure Time to Interactive (TTI) - must maintain or improve
  - Measure First Contentful Paint (FCP) - must maintain or improve
  - Measure animation frame rate - must maintain 60fps
  - Verify SWR cache hit rate is high
  - Verify network request count decreased with deduplication
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - ⏳ **REMAINING** - Testing phase

- [ ] 28. Final integration testing
  - Test all customer pages end-to-end
  - Test all admin pages end-to-end
  - Test error scenarios (network failures, server errors, validation errors)
  - Test optimistic updates (success and failure paths)
  - Test page transitions between all routes
  - Test toast notifications across all scenarios
  - Test Error Boundary isolation
  - Verify backward compatibility with existing functionality
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - ⏳ **REMAINING** - Testing phase

- [ ] 28.1 Write integration tests for backward compatibility
  - Verify all existing Supabase integration patterns work
  - Verify all existing TypeScript types are compatible
  - Verify all existing authentication flows work
  - Verify all existing routing and navigation work
  - Verify all existing business logic and validation rules work
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - ⏳ **OPTIONAL** - Integration tests

- [ ] 29. Final checkpoint - Production readiness
  - Ensure all tests pass (unit, property, integration)
  - Verify test coverage is ≥80%
  - Verify bundle size increase is ≤300KB
  - Verify performance metrics meet requirements
  - Verify no console errors or warnings
  - Verify all pages work correctly
  - Create rollback plan documentation
  - Ask the user for final approval
  - ⏳ **REMAINING** - Final verification

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- The phased approach allows for gradual migration without breaking changes
- SWR and useEffect patterns can coexist during migration
- Each phase should be independently deployable and testable
- Performance metrics must be tracked throughout migration
- Rollback plan should be ready before each phase deployment
