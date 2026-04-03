import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Home from '../pages/Home';
import PublicLayout from '../components/PublicLayout';
import NotFound from '../pages/NotFound';
import { adminRouteConfigs } from './routes/adminRoutes';
import { createRouteRenderers, LegacyFashionCollectionRedirect, LegacyFashionLookRedirect } from './routes/routeShell';
import { standaloneRouteConfigs } from './routes/standaloneRoutes';
import { legacyPublicRedirectRoutes, adminRedirectRoutes } from './routes/legacyRoutes';
import { publicRouteConfigs } from './routes/publicRoutes';
import { protectedPublicRouteConfigs } from './routes/protectedPublicRoutes';

export function AppRoutes() {
  const location = useLocation();
  const { wrap, renderLazyPage, renderProtected, renderProtectedLazyPage } = createRouteRenderers(location.pathname);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {standaloneRouteConfigs.map(({ path, Page }) => (
          <Route key={path} path={path} element={renderLazyPage(Page)} />
        ))}

        <Route path="/admin" element={renderProtected(<Navigate to="/admin/dashboard" replace />, true)} />

        {adminRouteConfigs.map(({ path, Page }) => (
          <Route key={path} path={path} element={renderProtectedLazyPage(Page, true)} />
        ))}

        {adminRedirectRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={wrap(element)} />
        ))}

        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="on-stage" element={wrap(<Home />)} />

          {publicRouteConfigs.map(({ path, Page }) => (
            <Route key={path} path={path} element={renderLazyPage(Page)} />
          ))}

          {legacyPublicRedirectRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={wrap(element)} />
          ))}

          <Route path="fashion/look/:lookNumber" element={wrap(<LegacyFashionLookRedirect />)} />
          <Route path="fashion/:collectionSlug" element={wrap(<LegacyFashionCollectionRedirect />)} />

          {protectedPublicRouteConfigs.map(({ path, Page }) => (
            <Route key={path} path={path} element={renderProtectedLazyPage(Page)} />
          ))}

          <Route path="*" element={renderLazyPage(NotFound)} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
