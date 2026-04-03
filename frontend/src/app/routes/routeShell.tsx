import { Suspense, type ElementType, type ReactNode } from 'react';

import { ErrorBoundary } from '../../components/ErrorBoundary';
import ProtectedRoute from '../../components/ProtectedRoute';
import BrandedLoader from '../../components/BrandedLoader';
import { Navigate, useParams } from 'react-router-dom';

export function RouteLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <BrandedLoader size="sm" />
    </div>
  );
}

export function LegacyFashionLookRedirect() {
  const { lookNumber } = useParams<{ lookNumber: string }>();
  return <Navigate to={`/dressing-room/look/${lookNumber ?? ''}`} replace />;
}

export function LegacyFashionCollectionRedirect() {
  const { collectionSlug } = useParams<{ collectionSlug: string }>();
  return <Navigate to={`/dressing-room/${collectionSlug ?? ''}`} replace />;
}

export function shouldWrapWithErrorBoundary(path: string) {
  const isSuccessPage =
    path === '/booking-success' || path.startsWith('/order/product/success/') || path.startsWith('/order/product/pending/');

  return !isSuccessPage && (path.startsWith('/admin') || path === '/shop' || path.startsWith('/shop/'));
}

export function createRouteRenderers(pathname: string) {
  const wrap = (node: ReactNode) =>
    shouldWrapWithErrorBoundary(pathname) ? <ErrorBoundary>{node}</ErrorBoundary> : node;

  const renderLazyPage = (Page: ElementType) =>
    wrap(
      <Suspense fallback={<RouteLoading />}>
        <Page />
      </Suspense>
    );

  const renderProtected = (node: ReactNode, adminOnly = false) => wrap(<ProtectedRoute adminOnly={adminOnly}>{node}</ProtectedRoute>);

  const renderProtectedLazyPage = (Page: ElementType, adminOnly = false) =>
    renderProtected(
      <Suspense fallback={<RouteLoading />}>
        <Page />
      </Suspense>,
      adminOnly
    );

  return {
    wrap,
    renderLazyPage,
    renderProtected,
    renderProtectedLazyPage,
  };
}
