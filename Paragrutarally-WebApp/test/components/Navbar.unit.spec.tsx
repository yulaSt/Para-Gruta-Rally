
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../src/components/layout/Navbar';
import * as AuthContext from '../../src/contexts/AuthContext';
import * as ThemeContext from '../../src/contexts/ThemeContext';
import * as LanguageContext from '../../src/contexts/LanguageContext';

// Mock contexts
vi.mock('../../src/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../src/contexts/ThemeContext', () => ({
    useTheme: vi.fn(),
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    }
}));

vi.mock('../../src/contexts/LanguageContext', () => ({
    useLanguage: vi.fn(),
    LANGUAGES: {
        ENGLISH: 'en',
        HEBREW: 'he'
    }
}));

describe('Navbar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementations
        ThemeContext.useTheme.mockReturnValue({ isDarkMode: false });
        LanguageContext.useLanguage.mockReturnValue({
            t: (key, defaultValue) => defaultValue,
            isRTL: false
        });
    });

    it('displays user display name when logged in', () => {
        AuthContext.useAuth.mockReturnValue({
            currentUser: {
                uid: '123',
                email: 'test@example.com',
                displayName: 'Test User'
            },
            signOut: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar userRole="host" />
            </MemoryRouter>
        );

        // This expectation will fail until we implement the feature
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('displays user email when display name is missing', () => {
        AuthContext.useAuth.mockReturnValue({
            currentUser: {
                uid: '123',
                email: 'test@example.com'
            },
            signOut: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar userRole="host" />
            </MemoryRouter>
        );

        // This expectation will fail until we implement the feature
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('does not display user info when not logged in', () => {
        AuthContext.useAuth.mockReturnValue({
            currentUser: null,
            signOut: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Navbar userRole="guest" />
            </MemoryRouter>
        );

        expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });
});
