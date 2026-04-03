import { Navigate } from 'react-router-dom';

export const adminRedirectRoutes = [
  { path: '/admin/fashion', element: <Navigate to="/admin/dressing-room" replace /> },
  { path: '/admin/beauty-posters', element: <Navigate to="/admin/glam-page" replace /> },
];

export const legacyPublicRedirectRoutes = [
  { path: 'fashion', element: <Navigate to="/dressing-room" replace /> },
  { path: 'beauty', element: <Navigate to="/glam" replace /> },
  { path: 'beauty/:posterSlug', element: <Navigate to="/glam" replace /> },
  { path: 'chamr-bar', element: <Navigate to="/charm-bar" replace /> },
];
