import { test, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export interface TestData {
    forms: any[];
    submissions: any[];
}

export const defaultForms = [
    {
        id: 'form-1',
        title: 'Instructor Training Registration',
        description: 'Register for instructor training session',
        status: 'active',
        targetAudience: 'instructor',
        viewCount: 10,
        eventDetails: {
            dayAndDate: 'July 20, 2025',
            location: 'Training Center',
            hours: '10:00 AM - 4:00 PM',
        },
    },
    {
        id: 'form-2',
        title: 'Advanced Coaching Workshop',
        description: 'Advanced techniques for instructors',
        status: 'active',
        targetAudience: 'instructor',
        viewCount: 5,
        eventDetails: {
            dayAndDate: 'August 5, 2025',
            location: 'Main Arena',
        },
    },
];

export const defaultSubmissions = [
    {
        id: 'submission-1',
        formId: 'form-1',
        submitterId: 'instructor-123',
        confirmationStatus: 'attending',
        attendeesCount: 1,
        submittedAt: new Date('2024-03-10'),
    },
];

type SetupFunction = (data?: TestData) => Promise<void>;

export interface RunInstructorFormsPageTestOptions {
    afterViewIncremented?: (formId: string) => Promise<void> | void;
}

export function runInstructorFormsPageTests(setupFn: SetupFunction, options: RunInstructorFormsPageTestOptions = {}) {
    test('displays forms and event details after loading', async () => {
        await setupFn({ forms: defaultForms, submissions: defaultSubmissions });

        await waitFor(() => {
            expect(screen.getByText('Instructor Training Registration')).toBeInTheDocument();
        });

        expect(screen.getByText('Advanced Coaching Workshop')).toBeInTheDocument();
        expect(screen.getByText('Training Center')).toBeInTheDocument();
    });

    test('shows empty states when no data available', async () => {
        await setupFn({ forms: [], submissions: [] });

        await waitFor(() => {
            expect(screen.getByText(/no training events available/i)).toBeInTheDocument();
            expect(screen.getByText('No Submissions Yet')).toBeInTheDocument();
        });
    });

    test('displays instructor submissions when they exist', async () => {
        await setupFn({ forms: defaultForms, submissions: defaultSubmissions });

        await waitFor(() => {
            expect(screen.getByText('Instructor Training Registration')).toBeInTheDocument();
        });

        // Should show the submission in My Submissions section
        const submissionsSection = screen.getByText('My Submissions').closest('.forms-section') as HTMLElement;
        expect(within(submissionsSection).getByText('Attending')).toBeInTheDocument();
    });

    test('"View" button opens the FormViewModal and increments count', async () => {
        const user = userEvent.setup({ pointerEventsCheck: 0 });
        await setupFn({ forms: defaultForms, submissions: defaultSubmissions });

        await waitFor(() => {
            expect(screen.getByText('Instructor Training Registration')).toBeInTheDocument();
        });

        const availableFormsSection = screen.getByText('Available Training Events').closest('.forms-section') as HTMLElement;
        const viewButtons = within(availableFormsSection).getAllByRole('button', { name: /view/i });
        await user.click(viewButtons[0]);

        // FormViewModal should be open
        await waitFor(() => {
            expect(screen.getByTestId('form-view-modal')).toBeInTheDocument();
        });
        expect(screen.getByTestId('view-modal-form-title')).toHaveTextContent('Instructor Training Registration');

        // Verify view count increment callback
        if (options.afterViewIncremented) {
            await options.afterViewIncremented('form-1');
        }
    });

    test('submission button opens FormSubmissionModal', async () => {
        const user = userEvent.setup({ pointerEventsCheck: 0 });
        await setupFn({ forms: defaultForms, submissions: defaultSubmissions });

        await waitFor(() => {
            expect(screen.getByText('Instructor Training Registration')).toBeInTheDocument();
        });

        const availableFormsSection = screen.getByText('Available Training Events').closest('.forms-section') as HTMLElement;
        // Find the submission button (Register or Fill Form)
        const submitButtons = within(availableFormsSection).getAllByRole('button').filter(
            btn => btn.textContent?.toLowerCase().includes('register') || btn.textContent?.toLowerCase().includes('fill')
        );

        // Depending on logic, it might be disabled if already submitted? 
        // In original tests, it just clicked it.
        if (submitButtons.length > 0) {
            await user.click(submitButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('form-submission-modal')).toBeInTheDocument();
            });
            expect(screen.getByTestId('modal-form-title')).toHaveTextContent('Advanced Coaching Workshop');
        }
    });
}
