import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ParentSelector from '@/components/common/ParentSelector';

describe('ParentSelector', () => {
    const mockParents = [
        { id: 'parent-1', name: 'John Doe', displayName: 'John', email: 'john@test.com', phone: '0501234567' },
        { id: 'parent-2', name: 'Jane Doe', displayName: 'Jane', email: 'jane@test.com', phone: '0521234567' },
        { id: 'parent-3', name: 'Bob Smith', displayName: 'Bob', email: 'bob@test.com', phone: '0531234567' },
    ];

    const mockT = (key: string, defaultText: string) => defaultText || key;

    const defaultProps = {
        parents: mockParents,
        selectedParentId: '',
        selectedParentData: null,
        excludeParentIds: [],
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        onSelectParent: vi.fn(),
        onCreateNew: vi.fn(),
        onNameChange: vi.fn(),
        onEmailChange: vi.fn(),
        onPhoneChange: vi.fn(),
        t: mockT,
        isRequired: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders dropdown with parent options', () => {
            render(<ParentSelector {...defaultProps} />);

            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();

            // Check all parents are in dropdown
            expect(screen.getByText('John (john@test.com)')).toBeInTheDocument();
            expect(screen.getByText('Jane (jane@test.com)')).toBeInTheDocument();
            expect(screen.getByText('Bob (bob@test.com)')).toBeInTheDocument();
        });

        it('renders create new parent button', () => {
            render(<ParentSelector {...defaultProps} />);

            const createButton = screen.getByRole('button', { name: /Create New Parent/i });
            expect(createButton).toBeInTheDocument();
        });

        it('shows manual entry fields when no parent selected', () => {
            render(<ParentSelector {...defaultProps} />);

            expect(screen.getByPlaceholderText(/Racing coach's name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/parent@racingfamily.com/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Racing hotline/i)).toBeInTheDocument();
        });

        it('shows locked fields when parent is selected', () => {
            const selectedParent = mockParents[0];
            render(
                <ParentSelector
                    {...defaultProps}
                    selectedParentId={selectedParent.id}
                    selectedParentData={selectedParent}
                />
            );

            // Should show locked inputs with parent data
            const inputs = screen.getAllByRole('textbox');
            const lockedInputs = inputs.filter(input => input.hasAttribute('disabled'));
            expect(lockedInputs.length).toBeGreaterThan(0);
        });

        it('excludes specified parents from dropdown', () => {
            render(
                <ParentSelector
                    {...defaultProps}
                    excludeParentIds={['parent-1']}
                />
            );

            // parent-1 should not be in dropdown
            expect(screen.queryByText('John (john@test.com)')).not.toBeInTheDocument();
            // Others should still be there
            expect(screen.getByText('Jane (jane@test.com)')).toBeInTheDocument();
            expect(screen.getByText('Bob (bob@test.com)')).toBeInTheDocument();
        });

        it('shows required indicator when isRequired is true', () => {
            render(<ParentSelector {...defaultProps} isRequired={true} />);

            // Labels should contain asterisk
            const labels = screen.getAllByText(/\*/);
            expect(labels.length).toBeGreaterThan(0);
        });
    });

    describe('interactions', () => {
        it('calls onSelectParent when parent is selected', async () => {
            const user = userEvent.setup();
            const onSelectParent = vi.fn();
            render(<ParentSelector {...defaultProps} onSelectParent={onSelectParent} />);

            const select = screen.getByRole('combobox');
            await user.selectOptions(select, 'parent-2');

            expect(onSelectParent).toHaveBeenCalledWith('parent-2');
        });

        it('calls onCreateNew when create button is clicked', async () => {
            const user = userEvent.setup();
            const onCreateNew = vi.fn();
            render(<ParentSelector {...defaultProps} onCreateNew={onCreateNew} />);

            const createButton = screen.getByRole('button', { name: /Create New Parent/i });
            await user.click(createButton);

            expect(onCreateNew).toHaveBeenCalled();
        });

        it('calls onNameChange when name is typed', async () => {
            const user = userEvent.setup();
            const onNameChange = vi.fn();
            render(<ParentSelector {...defaultProps} onNameChange={onNameChange} />);

            const nameInput = screen.getByPlaceholderText(/Racing coach's name/i);
            await user.type(nameInput, 'Test Name');

            expect(onNameChange).toHaveBeenCalled();
        });

        it('calls onEmailChange when email is typed', async () => {
            const user = userEvent.setup();
            const onEmailChange = vi.fn();
            render(<ParentSelector {...defaultProps} onEmailChange={onEmailChange} />);

            const emailInput = screen.getByPlaceholderText(/parent@racingfamily.com/i);
            await user.type(emailInput, 'test@example.com');

            expect(onEmailChange).toHaveBeenCalled();
        });

        it('calls onPhoneChange when phone is typed', async () => {
            const user = userEvent.setup();
            const onPhoneChange = vi.fn();
            render(<ParentSelector {...defaultProps} onPhoneChange={onPhoneChange} />);

            const phoneInput = screen.getByPlaceholderText(/Racing hotline/i);
            await user.type(phoneInput, '0501234567');

            expect(onPhoneChange).toHaveBeenCalled();
        });
    });

    describe('error states', () => {
        it('shows name error when hasNameError is true', () => {
            render(
                <ParentSelector
                    {...defaultProps}
                    hasNameError={true}
                    nameError="Name is required"
                />
            );

            expect(screen.getByText('Name is required')).toBeInTheDocument();
        });

        it('shows email error when hasEmailError is true', () => {
            render(
                <ParentSelector
                    {...defaultProps}
                    hasEmailError={true}
                    emailError="Invalid email"
                />
            );

            expect(screen.getByText('Invalid email')).toBeInTheDocument();
        });

        it('shows phone error when hasPhoneError is true', () => {
            render(
                <ParentSelector
                    {...defaultProps}
                    hasPhoneError={true}
                    phoneError="Invalid phone number"
                />
            );

            expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
        });
    });

    describe('custom labels', () => {
        it('uses custom labels when provided', () => {
            render(
                <ParentSelector
                    {...defaultProps}
                    labels={{
                        selectLabel: 'Choose Guardian',
                        nameLabel: 'Guardian Name',
                        emailLabel: 'Guardian Email',
                        phoneLabel: 'Guardian Phone',
                    }}
                />
            );

            expect(screen.getByText(/Choose Guardian/)).toBeInTheDocument();
            expect(screen.getByText(/Guardian Name/)).toBeInTheDocument();
            expect(screen.getByText(/Guardian Email/)).toBeInTheDocument();
            expect(screen.getByText(/Guardian Phone/)).toBeInTheDocument();
        });
    });
});
