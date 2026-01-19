import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRedirectHandler from '@/components/routing/RoleRedirectHandler';

// Mock useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

const mockedUseAuth = vi.mocked(useAuth);

// Helper to render RoleRedirectHandler with router context
function renderRoleRedirectHandler({
  initialEntries = ['/login'],
  children = <div>Protected Content</div>,
}: {
  initialEntries?: string[];
  children?: React.ReactNode;
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/*"
          element={
            <RoleRedirectHandler>
              <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/" element={<div>Home Page</div>} />
                <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
                <Route path="/instructor/dashboard" element={<div>Instructor Dashboard</div>} />
                <Route path="/parent/dashboard" element={<div>Parent Dashboard</div>} />
                <Route path="/host/dashboard" element={<div>Host Dashboard</div>} />
                <Route path="/my-account" element={<div>My Account</div>} />
                <Route path="/gallery" element={<div>Gallery</div>} />
                <Route path="*" element={children} />
              </Routes>
            </RoleRedirectHandler>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleRedirectHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  // Keep fake timers scoped to this file to avoid leaking across the suite
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('redirects to correct dashboard for each role', () => {
    test('admin user on /login redirects to /admin/dashboard', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        authInitialized: true,
        shouldRedirect: '/admin/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    test('instructor user on /login redirects to /instructor/dashboard', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'instructor-123' },
        userRole: 'instructor',
        authInitialized: true,
        shouldRedirect: '/instructor/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
    });

    test('parent user on /login redirects to /parent/dashboard', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'parent-123' },
        userRole: 'parent',
        authInitialized: true,
        shouldRedirect: '/parent/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();
    });

    test('host user on /login redirects to /host/dashboard', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'host-123' },
        userRole: 'host',
        authInitialized: true,
        shouldRedirect: '/host/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByText('Host Dashboard')).toBeInTheDocument();
    });

    test('user on root / redirects to role dashboard', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        authInitialized: true,
        shouldRedirect: '/admin/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/'] });

      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('handles missing/unknown role safely', () => {
    test('does not redirect when userRole is null', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'user-123' },
        userRole: null,
        authInitialized: true,
        shouldRedirect: null,
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      // Should stay on login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    test('does not redirect when currentUser is null', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: null,
        userRole: null,
        authInitialized: true,
        shouldRedirect: null,
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      // Should stay on login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    test('does not redirect when authInitialized is false', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        authInitialized: false,
        shouldRedirect: '/admin/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      // Should stay on login page until auth is initialized
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    test('does not redirect when shouldRedirect is null', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'user-123' },
        userRole: 'admin',
        authInitialized: true,
        shouldRedirect: null,
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/login'] });

      // Should stay on login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('shared pages are not redirected', () => {
    test('does not redirect from /my-account page', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        authInitialized: true,
        shouldRedirect: '/admin/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/my-account'] });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    test('does not redirect from /gallery page', async () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'parent-123' },
        userRole: 'parent',
        authInitialized: true,
        shouldRedirect: '/parent/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/gallery'] });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByText('Gallery')).toBeInTheDocument();
    });
  });

  describe('stays on correct area pages', () => {
    test('admin user already on admin page stays there', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        authInitialized: true,
        shouldRedirect: '/admin/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/admin/dashboard'] });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    test('instructor user already on instructor page stays there', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'instructor-123' },
        userRole: 'instructor',
        authInitialized: true,
        shouldRedirect: '/instructor/dashboard',
      } as ReturnType<typeof useAuth>);

      renderRoleRedirectHandler({ initialEntries: ['/instructor/dashboard'] });

      expect(screen.getByText('Instructor Dashboard')).toBeInTheDocument();
    });
  });
});
