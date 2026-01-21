// src/components/modals/FormViewModal.jsx - Fixed Version (Hide Stats for Parents)
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
    IconX as X,
    IconCalendar as Calendar,
    IconUsers as Users,
    IconFileText as FileText,
    IconMapPin as MapPin,
    IconClock as Clock,
    IconExternalLink as ExternalLink,
    IconMail as Mail,
    IconPhone as Phone
} from '@tabler/icons-react';
import './FormCreationModal.css'; // Reuse the same styles

const FormViewModal = ({
                           isOpen,
                           form,
                           onClose
                       }) => {
    const { t, isRTL } = useLanguage();
    const { userData } = usePermissions();

    if (!isOpen || !form) {
        return null;
    }

    // Check if user is admin/instructor to show statistics
    const showStatistics = userData?.role === 'admin' || userData?.role === 'instructor';

    // Enhanced date formatting with proper translation support
    const formatDateTime = () => {
        if (form.eventDetails?.dayAndDate) {
            // If dayAndDate is already a formatted string, try to parse and reformat it
            const dateMatch = form.eventDetails.dayAndDate.match(/(\w+),\s*(\w+)\s+(\d+),\s*(\d+)/);
            if (dateMatch) {
                try {
                    const [, , month, day, year] = dateMatch;
                    const date = new Date(`${month} ${day}, ${year}`);
                    return formatLocalizedDate(date);
                } catch (error) {
                    // If parsing fails, return the original string
                    return form.eventDetails.dayAndDate;
                }
            }
            return form.eventDetails.dayAndDate;
        }

        if (!form.eventDetails?.eventDate) return '';

        const date = new Date(form.eventDetails.eventDate);
        return formatLocalizedDate(date);
    };

    // Helper function to format date with proper localization
    const formatLocalizedDate = (date) => {
        const locale = isRTL ? 'he-IL' : 'en-US';

        const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
        const dateStr = date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let timeStr = '';
        if (form.eventDetails?.startTime) {
            timeStr = form.eventDetails.startTime;
            if (form.eventDetails.endTime) {
                timeStr += ` - ${form.eventDetails.endTime}`;
            }
        }

        // Format based on language direction
        if (isRTL) {
            return `${dayName}, ${dateStr}${timeStr ? ` (${timeStr})` : ''}`;
        } else {
            return `${dayName}, ${dateStr}${timeStr ? ` (${timeStr})` : ''}`;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return t('forms.status.active', 'Active');
            case 'draft':
                return t('forms.status.draft', 'Draft');
            case 'archived':
                return t('forms.status.archived', 'Archived');
            default:
                return status;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'event_registration':
                return t('forms.types.eventRegistration', 'Event Registration');
            case 'training_registration':
                return t('forms.types.trainingRegistration', 'Training Registration');
            case 'feedback':
                return t('forms.types.feedback', 'Feedback');
            default:
                return type;
        }
    };

    return (
        <div className="form-creation-modal-overlay" role="dialog" aria-modal="true" data-testid="form-view-modal">
            <div className="form-creation-modal-content">
                <div className="form-creation-modal-header">
                    <h3 data-testid="view-modal-form-title">
                        <FileText size={24} />
                        {t('forms.viewForm', 'View Form')} - {form.title}
                    </h3>
                    <button className="form-creation-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="form-creation-modal-body">
                    {/* Basic Form Information */}
                    <div className="form-section">
                        <h4>
                            <FileText size={18} />
                            {t('forms.basicInformation', 'Basic Information')}
                        </h4>

                        <div className="form-view-grid">
                            <div className="view-item">
                                <label>{t('forms.formTitle', 'Form Title')}</label>
                                <div className="view-value">{form.title}</div>
                            </div>

                            <div className="view-item">
                                <label>{t('forms.formType', 'Form Type')}</label>
                                <div className="view-value">{getTypeLabel(form.type)}</div>
                            </div>

                            {showStatistics && (
                                <div className="view-item">
                                    <label>{t('forms.status', 'Status')}</label>
                                    <div className="view-value">
                                        <span className={`status-badge ${form.status}`}>
                                            {getStatusLabel(form.status)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {showStatistics && (
                                <div className="view-item">
                                    <label>{t('forms.created', 'Created')}</label>
                                    <div className="view-value">
                                        {form.createdAt?.toLocaleDateString(isRTL ? 'he-IL' : 'en-US') || 'Unknown'}
                                    </div>
                                </div>
                            )}

                            {form.description && (
                                <div className="view-item full-width">
                                    <label>{t('forms.description', 'Description')}</label>
                                    <div className="view-value">{form.description}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Target Users - Only show for admins/instructors */}
                    {showStatistics && (
                        <div className="form-section">
                            <h4>
                                <Users size={18} />
                                {t('forms.targetUsers', 'Target Users')}
                            </h4>

                            <div className="target-users-display">
                                {form.targetUsers?.map(userType => (
                                    <span key={userType} className="user-type-badge">
                                        {userType === 'parent' ? t('forms.parents', 'Parents') : t('forms.instructors', 'Instructors')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Event Details */}
                    {form.eventDetails && (
                        <div className="form-section">
                            <h4>
                                <Calendar size={18} />
                                {t('forms.eventDetails', 'Event Details')}
                            </h4>

                            <div className="form-view-grid">
                                {formatDateTime() && (
                                    <div className="view-item full-width">
                                        <label>
                                            <Clock size={16} />
                                            {t('forms.eventDateTime', 'Event Date & Time')}
                                        </label>
                                        <div className="view-value datetime-display">
                                            {formatDateTime()}
                                        </div>
                                    </div>
                                )}

                                {form.eventDetails.location && (
                                    <div className="view-item full-width">
                                        <label>
                                            <MapPin size={16} />
                                            {t('forms.location', 'Location')}
                                        </label>
                                        <div className="view-value">{form.eventDetails.location}</div>
                                    </div>
                                )}

                                {form.eventDetails.googleMapsLink && (
                                    <div className="view-item">
                                        <label>{t('forms.googleMapsLink', 'Google Maps')}</label>
                                        <div className="view-value">
                                            <a
                                                href={form.eventDetails.googleMapsLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-button"
                                            >
                                                <MapPin size={16} />
                                                {t('forms.openInMaps', 'Open in Maps')}
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {form.eventDetails.wazeLink && (
                                    <div className="view-item">
                                        <label>{t('forms.wazeLink', 'Waze')}</label>
                                        <div className="view-value">
                                            <a
                                                href={form.eventDetails.wazeLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-button"
                                            >
                                                <MapPin size={16} />
                                                {t('forms.openInWaze', 'Open in Waze')}
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {form.eventDetails.paymentLink && (
                                    <div className="view-item full-width">
                                        <label>{t('forms.paymentLink', 'Payment Link')}</label>
                                        <div className="view-value">
                                            <a
                                                href={form.eventDetails.paymentLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-button payment-link"
                                            >
                                                {t('forms.makePayment', 'Make Payment')}
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {(form.eventDetails?.notes || form.eventDetails?.closingNotes) && (
                        <div className="form-section">
                            <h4>{t('forms.additionalInformation', 'Additional Information')}</h4>

                            {form.eventDetails.notes && (
                                <div className="view-item">
                                    <label>{t('forms.notes', 'Event Notes')}</label>
                                    <div className="view-value notes-text">
                                        {form.eventDetails.notes}
                                    </div>
                                </div>
                            )}

                            {form.eventDetails.closingNotes && (
                                <div className="view-item">
                                    <label>{t('forms.closingNotes', 'Closing Notes')}</label>
                                    <div className="view-value notes-text">
                                        {form.eventDetails.closingNotes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Contact Information */}
                    {form.eventDetails?.contactInfo?.length > 0 && (
                        <div className="form-section">
                            <h4>{t('forms.contactInformation', 'Contact Information')}</h4>

                            <div className="contact-display">
                                {form.eventDetails.contactInfo.map((contact, index) => (
                                    <div key={index} className="contact-display-item">
                                        {contact.includes('@') ? (
                                            <div className="contact-email">
                                                <Mail size={16} />
                                                <a href={`mailto:${contact}`}>{contact}</a>
                                            </div>
                                        ) : contact.match(/^\d/) ? (
                                            <div className="contact-phone">
                                                <Phone size={16} />
                                                <a href={`tel:${contact}`}>{contact}</a>
                                            </div>
                                        ) : (
                                            <div className="contact-text">
                                                {contact}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Statistics - Only show for admins/instructors */}
                    {showStatistics && (
                        <div className="form-section">
                            <h4>{t('forms.formStatistics', 'Form Statistics')}</h4>

                            <div className="stats-display">
                                <div className="stat-item">
                                    <label>{t('forms.views', 'Views')}</label>
                                    <div className="stat-value">{form.viewCount || 0}</div>
                                </div>
                                <div className="stat-item">
                                    <label>{t('forms.submissions', 'Submissions')}</label>
                                    <div className="stat-value">{form.submissionCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-creation-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        {t('common.close', 'Close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormViewModal;