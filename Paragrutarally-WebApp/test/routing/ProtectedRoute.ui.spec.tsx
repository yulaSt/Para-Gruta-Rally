import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute, { RequireInstructorOnly } from '@/components/routing/ProtectedRoute';

// Mock useAuth hook
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock usePermissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const mockedUseAuth = vi.mocked(useAuth);
const mockedUsePermissions = vi.mocked(usePermissions);

function mockWindowLocation() {
  const originalLocation = window.location;
  const locationMock = { href: '' };
  Object.defineProperty(window, 'location', {
    value: locationMock,
    writable: true,
    configurable: true,
  });

  return {
    locationMock,
    restore: () => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    },
  };
}

// Helper to render ProtectedRoute with router context
function renderProtectedRoute({
  initialEntries = ['/protected'],
  requiredRole,
  requiredRoles,
  strictRole,
  children = <div>Protected Content</div>,
}: {
  initialEntries?: string[];
  requiredRole?: string;
  requiredRoles?: string[];
  strictRole?: boolean;
  children?: React.ReactNode;
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute
              requiredRole={requiredRole}
              requiredRoles={requiredRoles}
              strictRole={strictRole}
            >
              {children}
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        <Route path="/instructor/dashboard" element={<div>Instructor Dashboard</div>} />
        <Route path="/parent/dashboard" element={<div>Parent Dashboard</div>} />
        <Route path="/host/dashboard" element={<div>Host Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// Helper to render RequireInstructorOnly with router context
function renderRequireInstructorOnly({
  initialEntries = ['/instructor-only'],
  children = <div>Instructor Only Content</div>,
}: {
  initialEntries?: string[];
  children?: React.ReactNode;
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/instructor-only"
          element={<RequireInstructorOnly>{children}</RequireInstructorOnly>}
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        <Route path="/instructor/dashboard" element={<div>Instructor Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loading states', () => {
    test('shows loading UI when auth is loading', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: null,
        userRole: null,
        loading: true,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: null,
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('shows loading UI when permissions are loading', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'user-123' },
        userRole: 'parent',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: null,
        loading: true,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('authentication redirects', () => {
    test('redirects unauthenticated users to /login', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: null,
        userRole: null,
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: null,
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute();

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('authenticated access without role requirement', () => {
    test('allows access when authenticated and no role requirement', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'user-123' },
        userRole: 'parent',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: false },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute();

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('role-based access denial', () => {
    test('denies access when role missing and shows Access Denied', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'user-123' },
        userRole: 'parent',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: false },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute({ requiredRole: 'instructor' });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Your role:/)).toBeInTheDocument();
      expect(screen.getByText('parent', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('instructor', { exact: false })).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('admin can access any role requirement in non-strict mode', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: true },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderProtectedRoute({ requiredRole: 'instructor' });

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('Go to Dashboard button', () => {
    test('navigates to role-based dashboard for parent', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      const { locationMock, restore } = mockWindowLocation();

      try {
        mockedUseAuth.mockReturnValue({
          currentUser: { uid: 'user-123' },
          userRole: 'parent',
          loading: false,
        } as ReturnType<typeof useAuth>);

        mockedUsePermissions.mockReturnValue({
          permissions: { canViewAll: false },
          loading: false,
          error: null,
        } as ReturnType<typeof usePermissions>);

        renderProtectedRoute({ requiredRole: 'admin' });

        const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' });
        await user.click(dashboardButton);

        expect(locationMock.href).toBe('/parent/dashboard');
      } finally {
        restore();
      }
    });

    test('navigates to role-based dashboard for instructor', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      const { locationMock, restore } = mockWindowLocation();

      try {
        mockedUseAuth.mockReturnValue({
          currentUser: { uid: 'user-123' },
          userRole: 'instructor',
          loading: false,
        } as ReturnType<typeof useAuth>);

        mockedUsePermissions.mockReturnValue({
          permissions: { canViewAll: false },
          loading: false,
          error: null,
        } as ReturnType<typeof usePermissions>);

        renderProtectedRoute({ requiredRole: 'admin' });

        const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' });
        await user.click(dashboardButton);

        expect(locationMock.href).toBe('/instructor/dashboard');
      } finally {
        restore();
      }
    });

    test('navigates to /login for unknown role', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      const { locationMock, restore } = mockWindowLocation();

      try {
        mockedUseAuth.mockReturnValue({
          currentUser: { uid: 'user-123' },
          userRole: 'unknown-role',
          loading: false,
        } as ReturnType<typeof useAuth>);

        mockedUsePermissions.mockReturnValue({
          permissions: { canViewAll: false },
          loading: false,
          error: null,
        } as ReturnType<typeof usePermissions>);

        renderProtectedRoute({ requiredRole: 'admin' });

        const dashboardButton = screen.getByRole('button', { name: 'Go to Dashboard' });
        await user.click(dashboardButton);

        expect(locationMock.href).toBe('/login');
      } finally {
        restore();
      }
    });
  });

  describe('strictRole mode (RequireInstructorOnly)', () => {
    test('admin is denied access when strictRole is true', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'admin-123' },
        userRole: 'admin',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: true },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderRequireInstructorOnly();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Instructor Only Content')).not.toBeInTheDocument();
    });

    test('instructor can access when strictRole is true', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'instructor-123' },
        userRole: 'instructor',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: false },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderRequireInstructorOnly();

      expect(screen.getByText('Instructor Only Content')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });

    test('parent is denied access when strictRole is true for instructor', () => {
      mockedUseAuth.mockReturnValue({
        currentUser: { uid: 'parent-123' },
        userRole: 'parent',
        loading: false,
      } as ReturnType<typeof useAuth>);

      mockedUsePermissions.mockReturnValue({
        permissions: { canViewAll: false },
        loading: false,
        error: null,
      } as ReturnType<typeof usePermissions>);

      renderRequireInstructorOnly();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Instructor Only Content')).not.toBeInTheDocument();
    });
  });
});
