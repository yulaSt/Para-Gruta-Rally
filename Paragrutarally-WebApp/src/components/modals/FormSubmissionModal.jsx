// src/components/modals/FormSubmissionModal.jsx - Fixed UI Issues
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import { createFormSubmission, uploadDeclarationFile } from '../../services/formService';
import { getUserData, getUserKids } from '../../services/userService';
import { getKidsByParent } from '../../services/kidService';
import ViewSubmissionModal from './ViewSubmissionModal';
import EditSubmissionModal from './EditSubmissionModal';
import {
    IconX as X,
    IconUser as User,
    IconUsers as Users,
    IconShirt as Shirt,
    IconHeart as Heart,
    IconUpload as Upload,
    IconAlertTriangle as AlertTriangle,
    IconFileText as FileText,
    IconPhone as Phone,
    IconCalendar as Calendar,
    IconMapPin as MapPin,
    IconClock as Clock,
    IconCheck as Check,
    IconExternalLink as ExternalLink
} from '@tabler/icons-react';
import './FormSubmissionModal.css';

const FormSubmissionModal = ({
                                 isOpen,
                                 onClose,
                                 form,
                                 userType = 'parent',
                                 onSubmit
                             }) => {
    const { t } = useLanguage();
    const { user } = usePermissions();

    // Form state
    const [formData, setFormData] = useState({
        confirmationStatus: 'needs to decide',
        attendeesCount: 1,
        kidIds: [],
        extraAttendees: [],
        shirts: ['', '', '', '', ''],
        extraShirts: ['', '', '', '', ''],
        declarationFile: null,
        motoForLife: ''
    });

    const [userKids, setUserKids] = useState([]);
    const [completeUserData, setCompleteUserData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);
    const [kidsWithoutDeclaration, setKidsWithoutDeclaration] = useState([]);
    const [showDeclarationWarning, setShowDeclarationWarning] = useState(false);

    // Shirt size options
    const shirtSizes = ['2', '4', '6', '8', '10', '12', '14', '16', '18', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

    // Load user's complete data and kids if parent
    useEffect(() => {
        if (isOpen && user?.uid) {
            loadCompleteUserData();
        }
    }, [isOpen, user]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                confirmationStatus: 'needs to decide',
                attendeesCount: 1,
                kidIds: [],
                extraAttendees: [],
                shirts: ['', '', '', '', ''],
                extraShirts: ['', '', '', '', ''],
                declarationFile: null,
                motoForLife: ''
            });
        }
    }, [isOpen]);

    // Check for declaration requirements when kids are selected
    useEffect(() => {
        if (userType === 'parent') {
            checkDeclarationRequirements();
        }
    }, [formData.kidIds, userKids, userType]);

    // Update extra attendees based on count
    useEffect(() => {
        if (formData.confirmationStatus === 'attending') {
            const baseCount = 1 + formData.kidIds.length; // Parent + selected kids
            const extraCount = Math.max(0, formData.attendeesCount - baseCount);

            setFormData(prev => ({
                ...prev,
                extraAttendees: Array(extraCount).fill('').map((_, index) => {
                    // Preserve existing data if available
                    const existing = prev.extraAttendees[index] || '';
                    return existing;
                })
            }));
        }
    }, [formData.attendeesCount, formData.kidIds, formData.confirmationStatus]);

    const loadCompleteUserData = async () => {
        setIsLoadingUserData(true);
        try {
            // Get complete user data from Firestore
            const userData = await getUserData(user.uid);
            setCompleteUserData(userData);

            // If this is a parent, also load their kids using the userService
            if (userType === 'parent') {
                try {
                    const kids = await getUserKids(user.uid);
                    setUserKids(kids || []);
                } catch (kidsError) {
                    console.warn('⚠️ Failed to load kids from userService, trying fallback method');
                    // Fallback to the original kidService method if needed
                    try {
                        const kids = await getKidsByParent(user.uid);
                        setUserKids(kids || []);
                    } catch (fallbackError) {
                        console.error('❌ Both kids loading methods failed:', fallbackError);
                        setUserKids([]);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading complete user data:', error);
            setCompleteUserData(null);
            setUserKids([]);
        } finally {
            setIsLoadingUserData(false);
        }
    };

    const checkDeclarationRequirements = () => {
        if (!userKids.length || formData.kidIds.length === 0) {
            setKidsWithoutDeclaration([]);
            setShowDeclarationWarning(false);
            return;
        }

        const selectedKids = userKids.filter(kid => formData.kidIds.includes(kid.id));
        const kidsNeedingDeclaration = selectedKids.filter(kid => !kid.signedDeclaration);

        setKidsWithoutDeclaration(kidsNeedingDeclaration);
        setShowDeclarationWarning(kidsNeedingDeclaration.length > 0);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleKidSelection = (kidId, selected) => {
        setFormData(prev => {
            const newKidIds = selected
                ? [...prev.kidIds, kidId]
                : prev.kidIds.filter(id => id !== kidId);

            // Auto-adjust attendee count when kids are selected/deselected
            const newAttendeeCount = Math.max(prev.attendeesCount, 1 + newKidIds.length);

            return {
                ...prev,
                kidIds: newKidIds,
                attendeesCount: newAttendeeCount
            };
        });
    };

    const handleExtraAttendeeChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            extraAttendees: prev.extraAttendees.map((attendee, i) => {
                if (i === index) {
                    const parts = (attendee || '').split('|');
                    const firstName = parts[0] || '';
                    const lastName = parts[1] || '';
                    const phone = parts[2] || '';

                    switch (field) {
                        case 'firstName':
                            return `${value}|${lastName}|${phone}`;
                        case 'lastName':
                            return `${firstName}|${value}|${phone}`;
                        case 'phone':
                            return `${firstName}|${lastName}|${value}`;
                        default:
                            return attendee;
                    }
                }
                return attendee;
            })
        }));
    };

    const handleShirtChange = (index, value, isExtra = false) => {
        const field = isExtra ? 'extraShirts' : 'shirts';
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map((shirt, i) =>
                i === index ? value : shirt
            )
        }));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                declarationFile: file
            }));
        }
    };

    const validateForm = () => {
        if (formData.confirmationStatus === 'attending') {
            if (formData.attendeesCount < 1) {
                alert(t('forms.validation.attendeesRequired', 'Please specify number of attendees'));
                return false;
            }

            if (showDeclarationWarning && !formData.declarationFile) {
                alert(t('forms.validation.declarationRequired', 'Please upload the parent declaration'));
                return false;
            }

            // Validate extra attendees
            const requiredExtraAttendees = Math.max(0, formData.attendeesCount - 1 - formData.kidIds.length);
            for (let i = 0; i < requiredExtraAttendees; i++) {
                const attendee = formData.extraAttendees[i] || '';
                const parts = attendee.split('|');
                if (!parts[0] || !parts[1] || parts[0].trim() === '' || parts[1].trim() === '') {
                    alert(t('forms.validation.extraAttendeesRequired', 'Please fill in all extra attendee details'));
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            let declarationUrl = null;

            // Upload declaration file if provided
            if (formData.declarationFile) {
                declarationUrl = await uploadDeclarationFile(
                    formData.declarationFile,
                    user.uid,
                    form.id
                );
            }

            // Prepare submission data (without timestamp fields)
            const submissionData = {
                formId: form.id,
                confirmationStatus: formData.confirmationStatus,
                submitterId: user.uid,
                attendeesCount: formData.attendeesCount,
                formType: userType
            };

            // Add optional fields based on form data
            if (formData.kidIds.length > 0) {
                submissionData.kidIds = formData.kidIds;
            }

            if (formData.extraAttendees.some(a => a && a.trim())) {
                submissionData.extraAttendees = formData.extraAttendees.filter(a => a && a.trim());
            }

            if (formData.shirts.some(s => s)) {
                submissionData.shirts = formData.shirts.filter(s => s);
            }

            if (formData.extraShirts.some(s => s)) {
                submissionData.extraShirts = formData.extraShirts.filter(s => s);
            }

            if (declarationUrl) {
                submissionData.declarationUploaded = declarationUrl;
            }

            if (formData.motoForLife.trim()) {
                submissionData.motoForLife = formData.motoForLife.trim();
            }

// Submit to database
            const submissionId = await createFormSubmission(submissionData);
            console.log('✅ Form submitted successfully:', submissionId);

// Show success message
            alert(t('forms.success.submitted', 'Form submitted successfully!'));

// Call success callback
            if (onSubmit && typeof onSubmit === 'function') {
                try {
                    onSubmit(submissionData);
                } catch (callbackError) {
                    console.warn('⚠️ Callback error (submission succeeded):', callbackError);
                }
            }

// Close modal
            onClose();

            // Call success callback after closing - wrapped in setTimeout to avoid blocking
            setTimeout(() => {
                try {
                    if (onSubmit && typeof onSubmit === 'function') {
                        onSubmit(submissionData);
                    }
                } catch (callbackError) {
                    console.warn('⚠️ Callback error (submission succeeded):', callbackError);
                }
            }, 100);

        } catch (error) {
            console.error('❌ Error submitting form:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                fullError: error
            });
            alert(t('forms.error.submissionFailed', 'Failed to submit form. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !form) {
        return null;
    }

    const formatEventDate = () => {
        if (form.eventDetails?.dayAndDate) {
            return form.eventDetails.dayAndDate;
        }

        if (form.eventDetails?.eventDate) {
            const date = new Date(form.eventDetails.eventDate);
            return date.toLocaleDateString();
        }

        return '';
    };

    // Calculate required extra attendees
    const requiredExtraAttendees = Math.max(0, formData.attendeesCount - 1 - formData.kidIds.length);

    return (
        <div className="form-submission-modal-overlay" role="dialog" aria-modal="true" data-testid="form-submission-modal">
            <div className="form-submission-modal-content">
                <div className="form-submission-modal-header">
                    <h3 data-testid="modal-form-title">
                        <FileText size={24} />
                        {form.title}
                    </h3>
                    <button className="form-submission-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="form-submission-modal-body">
                    {/* Event Information */}
                    <div className="form-section">
                        <h4>
                            <Calendar size={18} />
                            {t('forms.eventDetails', 'Event Details')}
                        </h4>

                        <div className="event-info-display">
                            {formatEventDate() && (
                                <div className="event-info-item">
                                    <Calendar size={16} />
                                    <span>{formatEventDate()}</span>
                                </div>
                            )}

                            {form.eventDetails?.hours && (
                                <div className="event-info-item">
                                    <Clock size={16} />
                                    <span>{form.eventDetails.hours}</span>
                                </div>
                            )}

                            {form.eventDetails?.location && (
                                <div className="event-info-item">
                                    <MapPin size={16} />
                                    <span>{form.eventDetails.location}</span>
                                </div>
                            )}

                            {form.eventDetails?.googleMapsLink && (
                                <div className="event-info-item">
                                    <a
                                        href={form.eventDetails.googleMapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="link-button"
                                    >
                                        <MapPin size={16} />
                                        {t('forms.googleMaps', 'Google Maps')}
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}

                            {form.eventDetails?.wazeLink && (
                                <div className="event-info-item">
                                    <a
                                        href={form.eventDetails.wazeLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="link-button"
                                    >
                                        <MapPin size={16} />
                                        {t('forms.waze', 'Waze')}
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                        </div>

                        {form.eventDetails?.notes && (
                            <div className="event-notes">
                                <p>{form.eventDetails.notes}</p>
                            </div>
                        )}

                        {form.eventDetails?.paymentLink && (
                            <div className="payment-section">
                                <a
                                    href={form.eventDetails.paymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="payment-button"
                                >
                                    {t('forms.paymentLink', 'Payment Link')}
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        )}

                        {form.eventDetails?.closingNotes && (
                            <div className="closing-notes">
                                <p>{form.eventDetails.closingNotes}</p>
                            </div>
                        )}
                    </div>

                    {/* Attendance Confirmation */}
                    <div className="form-section">
                        <h4>
                            <Check size={18} />
                            {t('forms.attendanceConfirmation', 'Attendance Confirmation')}
                        </h4>

                        <div className="attendance-options">
                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="attendance"
                                    value="attending"
                                    checked={formData.confirmationStatus === 'attending'}
                                    onChange={(e) => handleInputChange('confirmationStatus', e.target.value)}
                                />
                                <span className="radio-label attending">
                                    <Check size={16} />
                                    {t('forms.attending', 'Attending')}
                                </span>
                            </label>

                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="attendance"
                                    value="not attending"
                                    checked={formData.confirmationStatus === 'not attending'}
                                    onChange={(e) => handleInputChange('confirmationStatus', e.target.value)}
                                />
                                <span className="radio-label not-attending">
                                    <X size={16} />
                                    {t('forms.notAttending', 'Not Attending')}
                                </span>
                            </label>

                            <label className="radio-option">
                                <input
                                    type="radio"
                                    name="attendance"
                                    value="needs to decide"
                                    checked={formData.confirmationStatus === 'needs to decide'}
                                    onChange={(e) => handleInputChange('confirmationStatus', e.target.value)}
                                />
                                <span className="radio-label needs-decision">
                                    <AlertTriangle size={16} />
                                    {t('forms.needsToDecide', 'Needs to Decide')}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Attendee Details - Only if attending */}
                    {formData.confirmationStatus === 'attending' && (
                        <>
                            {/* Parent Information */}
                            <div className="form-section">
                                <h4>
                                    <User size={18} />
                                    {t('forms.parentInformation', 'Parent Information')}
                                </h4>

                                <div className="user-info-display">
                                    <div className="info-item">
                                        <label>{t('forms.name', 'Name')}</label>
                                        <span>
                                            {isLoadingUserData ? 'Loading...' :
                                                completeUserData?.displayName ||
                                                completeUserData?.name ||
                                                `${completeUserData?.firstName || ''} ${completeUserData?.lastName || ''}`.trim() ||
                                                'N/A'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <label>{t('forms.phoneNumber', 'Phone Number')}</label>
                                        <span>
                                            {isLoadingUserData ? 'Loading...' :
                                                completeUserData?.phone ||
                                                completeUserData?.phoneNumber ||
                                                'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Kids Selection - Only for parents */}
                            {userType === 'parent' && (
                                <div className="form-section">
                                    <h4>
                                        <Users size={18} />
                                        {t('forms.selectKids', 'Select Kids to Attend')}
                                    </h4>

                                    <div className="kids-selection">
                                        {isLoadingUserData ? (
                                            <div className="loading-kids">
                                                <Clock size={16} />
                                                <span>Loading kids...</span>
                                            </div>
                                        ) : userKids.length > 0 ? (
                                            userKids.map(kid => {
                                                // Extract firstName from the kid data
                                                const kidFirstName = kid.personalInfo?.firstName ||
                                                    kid.firstName ||
                                                    kid.name?.split(' ')[0] ||
                                                    `Kid ${kid.participantNumber || kid.id?.slice(-4)}`;

                                                return (
                                                    <label key={kid.id} className="checkbox-option">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.kidIds.includes(kid.id)}
                                                            onChange={(e) => handleKidSelection(kid.id, e.target.checked)}
                                                        />
                                                        <span className="checkbox-label">
                                                            <Users size={14} />
                                                            {kidFirstName}
                                                            {!kid.signedDeclaration && (
                                                                <AlertTriangle size={14} className="warning-icon" />
                                                            )}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        ) : (
                                            <div className="no-kids-message">
                                                <Users size={20} />
                                                <span>No kids found for this parent</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Attendee Count */}
                            <div className="form-section">
                                <h4>
                                    <Users size={18} />
                                    {t('forms.attendeeCount', 'Total Attendee Count')}
                                </h4>

                                <div className="attendee-count-input">
                                    <label>{t('forms.totalPeopleAttending', 'Total people attending (including yourself)')}</label>
                                    <input
                                        type="number"
                                        min={1 + formData.kidIds.length}
                                        value={formData.attendeesCount}
                                        onChange={(e) => handleInputChange('attendeesCount', Math.max(parseInt(e.target.value) || 1, 1 + formData.kidIds.length))}
                                        className="number-input"
                                    />
                                    <small className="helper-text">
                                        {t('forms.minimumAttendees', 'Minimum')}: {1 + formData.kidIds.length}
                                        ({t('forms.youPlusKids', 'You + selected kids')})
                                    </small>
                                </div>
                            </div>

                            {/* Extra Attendees */}
                            {requiredExtraAttendees > 0 && (
                                <div className="form-section">
                                    <h4>
                                        <Users size={18} />
                                        {t('forms.extraAttendees', 'Additional Attendee Details')}
                                    </h4>

                                    <div className="extra-attendees-table">
                                        <div className="table-header">
                                            <span>{t('forms.firstName', 'First Name')}</span>
                                            <span>{t('forms.lastName', 'Last Name')}</span>
                                            <span>{t('forms.phoneNumber', 'Phone Number')}</span>
                                        </div>

                                        {Array(requiredExtraAttendees).fill(null).map((_, index) => {
                                            const attendee = formData.extraAttendees[index] || '';
                                            const [firstName, lastName, phone] = attendee.split('|');

                                            return (
                                                <div key={index} className="table-row">
                                                    <input
                                                        type="text"
                                                        placeholder={t('forms.firstName', 'First Name')}
                                                        value={firstName || ''}
                                                        onChange={(e) => handleExtraAttendeeChange(index, 'firstName', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={t('forms.lastName', 'Last Name')}
                                                        value={lastName || ''}
                                                        onChange={(e) => handleExtraAttendeeChange(index, 'lastName', e.target.value)}
                                                    />
                                                    <input
                                                        type="tel"
                                                        placeholder={t('forms.phoneNumber', 'Phone Number')}
                                                        value={phone || ''}
                                                        onChange={(e) => handleExtraAttendeeChange(index, 'phone', e.target.value)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Shirt Sizes */}
                            <div className="form-section">
                                <h4>
                                    <Shirt size={18} />
                                    {t('forms.shirtSizes', 'Shirt Sizes')}
                                </h4>

                                <div className="shirts-selection">
                                    <div className="shirts-group">
                                        <h5>{t('forms.requiredShirts', 'Required Shirts')}</h5>
                                        <div className="shirts-grid">
                                            {formData.shirts.map((shirt, index) => (
                                                <div key={index} className="shirt-input">
                                                    <label>{t('forms.shirt', 'Shirt')} #{index + 1}</label>
                                                    <select
                                                        value={shirt}
                                                        onChange={(e) => handleShirtChange(index, e.target.value)}
                                                    >
                                                        <option value="">{t('forms.selectSize', 'Select Size')}</option>
                                                        {shirtSizes.map(size => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="shirts-group">
                                        <h5>{t('forms.extraShirts', 'Extra Shirts (Optional)')}</h5>
                                        <div className="shirts-grid">
                                            {formData.extraShirts.map((shirt, index) => (
                                                <div key={index} className="shirt-input">
                                                    <label>{t('forms.extraShirt', 'Extra Shirt')} #{index + 1}</label>
                                                    <select
                                                        value={shirt}
                                                        onChange={(e) => handleShirtChange(index, e.target.value, true)}
                                                    >
                                                        <option value="">{t('forms.selectSize', 'Select Size')}</option>
                                                        {shirtSizes.map(size => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructor Motto */}
                            {userType === 'instructor' && (
                                <div className="form-section">
                                    <h4>
                                        <Heart size={18} />
                                        {t('forms.motoForLife', 'My Motto for Life')}
                                    </h4>

                                    <textarea
                                        value={formData.motoForLife}
                                        onChange={(e) => handleInputChange('motoForLife', e.target.value)}
                                        placeholder={t('forms.motoPlaceholder', 'Share your life motto...')}
                                        className="motto-textarea"
                                        rows="3"
                                    />
                                </div>
                            )}

                            {/* Declaration Upload */}
                            {showDeclarationWarning && (
                                <div className="form-section declaration-section">
                                    <h4>
                                        <AlertTriangle size={18} />
                                        {t('forms.parentDeclaration', 'Parent Declaration Required')}
                                    </h4>

                                    <div className="declaration-warning">
                                        <div className="warning-content">
                                            <AlertTriangle size={24} className="warning-icon" />
                                            <div>
                                                <p>{t('forms.declarationWarning', 'Please attach parent declaration')}</p>
                                                <p className="warning-details">
                                                    {t('forms.declarationDetails', 'The following kids need a signed declaration:')}
                                                </p>
                                                <ul>
                                                    {kidsWithoutDeclaration.map(kid => (
                                                        <li key={kid.id}>
                                                            {kid.personalInfo?.firstName || kid.firstName || `Kid ${kid.participantNumber}`}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="file-upload">
                                            <input
                                                type="file"
                                                id="declaration-file"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="declaration-file" className="upload-button">
                                                <Upload size={16} />
                                                {formData.declarationFile
                                                    ? formData.declarationFile.name
                                                    : t('forms.uploadDeclaration', 'Upload Declaration')
                                                }
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="form-submission-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Clock size={16} className="spinning" />
                                {t('forms.submitting', 'Submitting...')}
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                {t('forms.submitForm', 'Submit Form')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormSubmissionModal;