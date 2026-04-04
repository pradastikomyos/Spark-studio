import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./BrandedLoader', () => ({
  default: ({ text }: { text?: string }) => <div>{text ?? 'loading'}</div>,
}));

import { useAuth } from '../contexts/AuthContext';

function LoginStateProbe() {
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;
  return <div>{`${location.pathname}|${state?.returnTo ?? ''}`}</div>;
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login with the current path as returnTo', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      initialized: true,
      sessionStatus: 'expired',
      adminStatus: 'denied',
      isAdmin: false,
      loggingOut: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      validateSession: vi.fn(),
      refreshSession: vi.fn(),
    } as any);

    render(
      <MemoryRouter initialEntries={['/cart?tab=bag']}>
        <Routes>
          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <div>cart</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginStateProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('/login|/cart?tab=bag')).toBeInTheDocument();
  });

  it('shows a recovery loader while admin access is still being restored', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      session: null,
      initialized: true,
      sessionStatus: 'ready',
      adminStatus: 'checking',
      isAdmin: false,
      loggingOut: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      validateSession: vi.fn(),
      refreshSession: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <ProtectedRoute adminOnly={true}>
          <div>admin-content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Restoring admin access...')).toBeInTheDocument();
    expect(screen.queryByText('admin-content')).not.toBeInTheDocument();
  });

  it('keeps admin content mounted while a previously verified admin is revalidating', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      session: null,
      initialized: true,
      sessionStatus: 'recovering',
      adminStatus: 'checking',
      isAdmin: true,
      loggingOut: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      validateSession: vi.fn(),
      refreshSession: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <ProtectedRoute adminOnly={true}>
          <div>admin-content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('admin-content')).toBeInTheDocument();
    expect(screen.queryByText('Restoring admin access...')).not.toBeInTheDocument();
  });
});
