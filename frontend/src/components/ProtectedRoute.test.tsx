import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./BrandedLoader', () => ({
  default: ({ text }: { text?: string }) => <div>{text ?? 'loading'}</div>,
}));

import { useAuth } from '../contexts/AuthContext';

describe('ProtectedRoute', () => {
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
