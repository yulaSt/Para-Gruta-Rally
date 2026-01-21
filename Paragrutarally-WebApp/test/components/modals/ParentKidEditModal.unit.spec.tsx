import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ParentKidEditModal from '@/components/modals/ParentKidEditModal';

// Define mocks using vi.hoisted to avoid TDZ issues
const mocks = vi.hoisted(() => ({
    updateKid: vi.fn(),
    uploadKidPhoto: vi.fn(),
    deleteKidPhoto: vi.fn(),
    getKidPhotoInfo: vi.fn(),
    validateKid: vi.fn(),
    getKidFullName: vi.fn(),
    t: vi.fn((key, fallback) => fallback),
}));

vi.mock('@/services/kidService.js', () => ({
    updateKid: mocks.updateKid,
}));

vi.mock('@/services/kidPhotoService.js', () => ({
    uploadKidPhoto: mocks.uploadKidPhoto,
    deleteKidPhoto: mocks.deleteKidPhoto,
    getKidPhotoInfo: mocks.getKidPhotoInfo,
}));

vi.mock('@/schemas/kidSchema.js', () => ({
    validateKid: mocks.validateKid,
    getKidFullName: mocks.getKidFullName,
}));

vi.mock('@/contexts/LanguageContext', () => ({
    useLanguage: () => ({
        t: mocks.t,
        isRTL: false,
    }),
}));

describe('ParentKidEditModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const mockKid = {
        id: 'kid-123',
        participantNumber: '001',
        personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            announcersNotes: 'Likes dinosaurs',
            address: '123 Main St',
            photo: 'photo-url.jpg',
        },
        parentInfo: {
            name: 'Jane Doe',
            phone: '0501234567',
            grandparentsInfo: {
                names: 'Grandma',
                phone: '0521234567',
            },
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset implementations to default success state
        mocks.updateKid.mockResolvedValue({});
        mocks.uploadKidPhoto.mockResolvedValue('new-photo-url.jpg');
        mocks.deleteKidPhoto.mockResolvedValue(undefined);
        mocks.getKidPhotoInfo.mockReturnValue({ hasPhoto: true, url: 'photo-url.jpg' });
        mocks.validateKid.mockReturnValue({ isValid: true, errors: {} });
        mocks.getKidFullName.mockReturnValue('John Doe');
    });

    it('renders nothing when not open', () => {
        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={false}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.queryByTestId('parent-kid-edit-modal')).not.toBeInTheDocument();
    });

    it('renders correctly when open', () => {
        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );
        expect(screen.getByTestId('parent-kid-edit-modal')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('validates fields on change', async () => {
        const user = userEvent.setup();
        // Mock validation error
        mocks.validateKid.mockReturnValue({
            isValid: false,
            errors: { 'personalInfo.firstName': 'First Name is required' }
        });

        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        const firstNameInput = screen.getByDisplayValue('John');
        await user.clear(firstNameInput);

        // Wait for error to appear
        // The component uses the error from validation.errors which we mocked.
        // It displays it inside a span with class "error-text" or similar
        // Look at component: {error && <span className="error-text">...{error}</span>}
        await waitFor(() => {
             expect(screen.getByText('First Name is required')).toBeInTheDocument();
        });
        
        expect(mocks.validateKid).toHaveBeenCalled();
    });

    it('handles form submission successfully', async () => {
        const user = userEvent.setup();
        mocks.validateKid.mockReturnValue({ isValid: true, errors: {} });

        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByText('Save Changes');
        await user.click(submitButton);

        expect(mocks.updateKid).toHaveBeenCalledWith('kid-123', expect.any(Object), expect.any(Function));
        await waitFor(() => {
             expect(mockOnSuccess).toHaveBeenCalled();
             expect(mockOnClose).toHaveBeenCalled();
        });
    });
    
    it('handles photo removal', async () => {
        const user = userEvent.setup();
        
        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        const removeButton = screen.getByText('Remove');
        await user.click(removeButton);

        expect(mocks.deleteKidPhoto).toHaveBeenCalledWith('kid-123', 'photo-url.jpg');
    });

    it('displays error message on submission failure', async () => {
        const user = userEvent.setup();
        mocks.updateKid.mockRejectedValue(new Error('Update failed'));
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );

        const submitButton = screen.getByText('Save Changes');
        await user.click(submitButton);

        await waitFor(() => {
             expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Failed to update information'));
        });
        
        alertMock.mockRestore();
        consoleError.mockRestore();
    });

    it('validates phone number format in component logic', async () => {
         const user = userEvent.setup();
         
         render(
            <ParentKidEditModal
                kid={mockKid}
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
            />
        );
        
        const phoneInput = screen.getByDisplayValue('0501234567');
        await user.clear(phoneInput);
        await user.type(phoneInput, '1234567890'); // Invalid prefix
        
        // Component logic adds warnings.
        await waitFor(() => {
            // "Phone number must start with 050..." text comes from fallback of mockT
            // In component: t('parentKidEdit.phoneValidation.mustStartWith05', 'Phone number must start with 05')
            // Since we mocked t to return fallback, we look for that.
            // Actually, for prefix, it checks: if (!digitsOnly.startsWith('05')) ...
            // And if starts with 05 but not valid prefix...
            // 1234567890 does not start with 05.
            expect(screen.getByText(/Phone number must start with 05/i)).toBeInTheDocument();
        });
    });
});
