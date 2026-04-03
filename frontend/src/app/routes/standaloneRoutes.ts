import { lazy } from 'react';

import type { AppRouteConfig } from './routeTypes';

const Login = lazy(() => import('../../pages/Login'));
const SignUp = lazy(() => import('../../pages/SignUp'));
const AuthCallback = lazy(() => import('../../pages/AuthCallback'));
const CheckoutPage = lazy(() => import('../../pages/CheckoutPage'));
const StageScanPage = lazy(() => import('../../pages/StageScanPage'));
const StageDetailPage = lazy(() => import('../../pages/StageDetailPage'));

export const standaloneRouteConfigs: AppRouteConfig[] = [
  { path: '/login', Page: Login },
  { path: '/signup', Page: SignUp },
  { path: '/auth/callback', Page: AuthCallback },
  { path: '/checkout', Page: CheckoutPage },
  { path: '/scan/:stageCode', Page: StageScanPage },
  { path: '/stage/:stageCode', Page: StageDetailPage },
];
