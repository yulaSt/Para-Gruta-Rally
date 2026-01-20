import { describe, vi, beforeEach, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstructorFormsPage from '@/pages/instructor/InstructorFormsPage';
import { runInstructorFormsPageTests, TestData } from './InstructorFormsPage.tests';
import { usePermissions } from '@/hooks/usePermissions';
import { getFormSubmissions, getActiveForms, incrementFormViewCount } from '@/services/formService.js';

// Mock Services
vi.mock('@/services/formService.js', () => ({
    getFormSubmissions: vi.fn(),
    getActiveForms: vi.fn(),
    incrementFormViewCount: vi.fn(),
}));

// Mock Hooks
vi.mock('@/hooks/usePermissions', () => ({
    usePermissions: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: vi.fn(() => ({
        t: (key: string, fallback: string) => fallback,
        currentLanguage: 'en',
        isRTL: false,
    })),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: vi.fn(() => ({
        appliedTheme: 'light',
    })),
}));

// Mock Components
vi.mock('@/components/layout/Dashboard', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dashboard">{children}</div>
    ),
}));

vi.mock('@/components/modals/FormSubmissionModal', () => ({
    default: ({ isOpen, onClose, form }: { isOpen: boolean; onClose: () => void; form: unknown }) =>
        isOpen ? (
            <div data-testid="form-submission-modal">
                <button onClick={onClose}>Close</button>
                <div data-testid="modal-form-title">{(form as { title?: string })?.title}</div>
            </div>
        ) : null,
}));

vi.mock('@/components/modals/FormViewModal', () => ({
    default: ({ isOpen, onClose, form }: { isOpen: boolean; onClose: () => void; form: unknown }) =>
        isOpen ? (
            <div data-testid="form-view-modal">
                <button onClick={onClose}>Close</button>
                <div data-testid="view-modal-form-title">{(form as { title?: string })?.title}</div>
            </div>
        ) : null,
}));

vi.mock('@/components/modals/ViewSubmissionModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="view-submission-modal" /> : null,
}));


describe('InstructorFormsPage (Unit)', () => {
    const mockedUsePermissions = vi.mocked(usePermissions);
    const mockedGetFormSubmissions = vi.mocked(getFormSubmissions);
    const mockedGetActiveForms = vi.mocked(getActiveForms);
    const mockedIncrementFormViewCount = vi.mocked(incrementFormViewCount);

    beforeEach(() => {
        vi.clearAllMocks();

        mockedUsePermissions.mockReturnValue({
            permissions: {
                canViewField: () => true,
                canEditField: () => true,
            },
            userRole: 'instructor',
            userData: { displayName: 'Instructor User' },
            user: { uid: 'instructor-123', displayName: 'Instructor User' },
            loading: false,
            error: null,
        } as unknown as ReturnType<typeof usePermissions>);

        mockedIncrementFormViewCount.mockResolvedValue(undefined);
    });

    const setupUnit = async (data?: TestData) => {
        if (!data) return;

        mockedGetActiveForms.mockResolvedValue(data.forms);
        mockedGetFormSubmissions.mockResolvedValue(data.submissions);

        render(
            <MemoryRouter>
                <InstructorFormsPage />
            </MemoryRouter>
        );
    };

    runInstructorFormsPageTests(setupUnit, {
        afterViewIncremented: (formId) => {
            expect(mockedIncrementFormViewCount).toHaveBeenCalledWith(formId);
        }
    });

    // Unit-only tests
    test('shows loading state while forms are being fetched', async () => {
        // Return a pending promise to simulate loading
        mockedGetFormSubmissions.mockImplementation(() => new Promise(() => { }));
        mockedGetActiveForms.mockImplementation(() => new Promise(() => { }));

        render(
            <MemoryRouter>
                <InstructorFormsPage />
            </MemoryRouter>
        );

        const loadingTexts = screen.getAllByText('Loading forms...');
        expect(loadingTexts.length).toBeGreaterThan(0);
    });
});
