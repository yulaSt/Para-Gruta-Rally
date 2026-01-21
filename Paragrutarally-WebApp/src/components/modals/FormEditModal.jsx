// src/components/modals/FormEditModal.jsx - Fixed Version with Date Translation and Color Fixes
import React, { useState, useEffect } from 'react';
import { updateForm } from '@/services/formService.js';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
    IconX as X,
    IconPlus as Plus,
    IconTrash as Trash2,
    IconCalendar as Calendar,
    IconUsers as Users,
    IconFileText as FileText,
    IconClock as Clock,
    IconDeviceFloppy as Save
} from '@tabler/icons-react';
import './FormCreationModal.css'; // Reuse the same styles

const FormEditModal = ({
    isOpen,
    form,
    onClose,
    onSuccess
}) => {
    const { t, isRTL } = useLanguage();
    const { user } = usePermissions();

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'event_registration',
        status: 'draft',
        targetUsers: ['parent'],
        eventDate: '',
        startTime: '',
        endTime: '',
        location: '',
        googleMapsLink: '',
        wazeLink: '',
        notes: '',
        paymentLink: '',
        closingNotes: '',
        contactInfo: ['']
    });

    // Load form data when form prop changes
    useEffect(() => {
        if (form) {
            // Parse existing date and time if available
            let eventDate = '';
            let startTime = '';
            let endTime = '';

            if (form.eventDetails?.eventDate) {
                eventDate = form.eventDetails.eventDate;
            }
            if (form.eventDetails?.startTime) {
                startTime = form.eventDetails.startTime;
            }
            if (form.eventDetails?.endTime) {
                endTime = form.eventDetails.endTime;
            }

            setFormData({
                title: form.title || '',
                description: form.description || '',
                type: form.type || 'event_registration',
                status: form.status || 'draft',
                targetUsers: form.targetUsers || ['parent'],
                eventDate: eventDate,
                startTime: startTime,
                endTime: endTime,
                location: form.eventDetails?.location || '',
                googleMapsLink: form.eventDetails?.googleMapsLink || '',
                wazeLink: form.eventDetails?.wazeLink || '',
                notes: form.eventDetails?.notes || '',
                paymentLink: form.eventDetails?.paymentLink || '',
                closingNotes: form.eventDetails?.closingNotes || '',
                contactInfo: form.eventDetails?.contactInfo?.length > 0 ? form.eventDetails.contactInfo : ['']
            });
        }
    }, [form]);

    // Handle form data change
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle target users change
    const handleTargetUsersChange = (userType) => {
        setFormData(prev => ({
            ...prev,
            targetUsers: prev.targetUsers.includes(userType)
                ? prev.targetUsers.filter(u => u !== userType)
                : [...prev.targetUsers, userType]
        }));
    };

    // Handle contact info changes
    const updateContactInfo = (index, value) => {
        setFormData(prev => ({
            ...prev,
            contactInfo: prev.contactInfo.map((contact, i) =>
                i === index ? value : contact
            )
        }));
    };

    const addContactInfo = () => {
        setFormData(prev => ({
            ...prev,
            contactInfo: [...prev.contactInfo, '']
        }));
    };

    const removeContactInfo = (index) => {
        if (formData.contactInfo.length > 1) {
            setFormData(prev => ({
                ...prev,
                contactInfo: prev.contactInfo.filter((_, i) => i !== index)
            }));
        }
    };

    // Enhanced date formatting with proper translation support
    const formatDateTime = () => {
        if (!formData.eventDate) return '';

        const date = new Date(formData.eventDate);
        const locale = isRTL ? 'he-IL' : 'en-US';

        const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
        const dateStr = date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let timeStr = '';
        if (formData.startTime) {
            timeStr = formData.startTime;
            if (formData.endTime) {
                timeStr += ` - ${formData.endTime}`;
            }
        }

        // Format based on language direction
        return `${dayName}, ${dateStr}${timeStr ? ` (${timeStr})` : ''}`;
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            alert(t('forms.titleRequired', 'Form title is required'));
            return;
        }

        setIsSubmitting(true);
        try {
            // Clean up contact info
            const cleanContactInfo = formData.contactInfo.filter(contact => contact.trim());

            // Prepare form data
            const formToUpdate = {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                status: formData.status,
                targetUsers: formData.targetUsers,

                // Event details for registration forms
                eventDetails: {
                    dayAndDate: formatDateTime(),
                    eventDate: formData.eventDate,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    location: formData.location,
                    googleMapsLink: formData.googleMapsLink,
                    wazeLink: formData.wazeLink,
                    notes: formData.notes,
                    paymentLink: formData.paymentLink,
                    closingNotes: formData.closingNotes,
                    contactInfo: cleanContactInfo
                }
            };

            // Update the form
            await updateForm(form.id, formToUpdate);

            if (onSuccess) {
                onSuccess();
            }

            alert(t('forms.formUpdatedSuccess', 'Form updated successfully!'));
            onClose();
        } catch (error) {
            console.error('Error updating form:', error);
            alert(t('forms.formUpdateError', 'Error updating form. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !form) {
        return null;
    }

    return (
        <div className="form-creation-modal-overlay">
            <div
                className="form-creation-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="form-edit-modal-title"
            >
                <div className="form-creation-modal-header">
                    <h3 id="form-edit-modal-title">
                        <FileText size={24} />
                        {t('forms.editForm', 'Edit Form')}
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

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('forms.formTitle', 'Form Title')} *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder={t('forms.titlePlaceholder', 'Enter form title...')}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.formType', 'Form Type')}</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="event_registration">
                                        {t('forms.types.eventRegistration', 'Event Registration')}
                                    </option>
                                    <option value="training_registration">
                                        {t('forms.types.trainingRegistration', 'Training Registration')}
                                    </option>
                                    <option value="feedback">
                                        {t('forms.types.feedback', 'Feedback')}
                                    </option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label>{t('forms.description', 'Description')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder={t('forms.descriptionPlaceholder', 'Describe what this form is for...')}
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.status', 'Status')}</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="draft">{t('forms.status.draft', 'Draft')}</option>
                                    <option value="active">{t('forms.status.active', 'Active')}</option>
                                    <option value="archived">{t('forms.status.archived', 'Archived')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Target Users */}
                    <div className="form-section">
                        <h4>
                            <Users size={18} />
                            {t('forms.targetUsers', 'Target Users')}
                        </h4>

                        <div className="target-users-grid">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.targetUsers.includes('parent')}
                                    onChange={() => handleTargetUsersChange('parent')}
                                />
                                {t('forms.parents', 'Parents')}
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.targetUsers.includes('instructor')}
                                    onChange={() => handleTargetUsersChange('instructor')}
                                />
                                {t('forms.instructors', 'Instructors')}
                            </label>
                        </div>
                    </div>

                    {/* Event Details */}
                    <div className="form-section">
                        <h4>
                            <Calendar size={18} />
                            {t('forms.eventDetails', 'Event Details')}
                        </h4>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('forms.eventDate', 'Event Date')}</label>
                                <input
                                    type="date"
                                    value={formData.eventDate}
                                    onChange={(e) => handleInputChange('eventDate', e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.startTime', 'Start Time')}</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.endTime', 'End Time')}</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>{t('forms.location', 'Location')}</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    placeholder="Enter event location"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.googleMapsLink', 'Google Maps Link')}</label>
                                <input
                                    type="url"
                                    value={formData.googleMapsLink}
                                    onChange={(e) => handleInputChange('googleMapsLink', e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('forms.wazeLink', 'Waze Link')}</label>
                                <input
                                    type="url"
                                    value={formData.wazeLink}
                                    onChange={(e) => handleInputChange('wazeLink', e.target.value)}
                                    placeholder="https://waze.com/..."
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>{t('forms.paymentLink', 'Payment Link (Optional)')}</label>
                                <input
                                    type="url"
                                    value={formData.paymentLink}
                                    onChange={(e) => handleInputChange('paymentLink', e.target.value)}
                                    placeholder="https://bit.ly/payment-link"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        {/* Date/Time Preview */}
                        {formData.eventDate && (
                            <div className="datetime-preview">
                                <label>{t('forms.eventDateTime', 'Event Date & Time Preview')}:</label>
                                <div className="preview-text">
                                    {formatDateTime()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="form-section">
                        <h4>{t('forms.additionalInformation', 'Additional Information')}</h4>

                        <div className="form-group">
                            <label>{t('forms.notes', 'Event Notes')}</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                placeholder="Additional information about the event..."
                                className="form-textarea"
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('forms.closingNotes', 'Closing Notes')}</label>
                            <textarea
                                value={formData.closingNotes}
                                onChange={(e) => handleInputChange('closingNotes', e.target.value)}
                                placeholder="Closing message for the form..."
                                className="form-textarea"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="form-section">
                        <h4>
                            {t('forms.contactInformation', 'Contact Information')}
                        </h4>

                        <div className="contact-info-section">
                            {formData.contactInfo.map((contact, index) => (
                                <div key={index} className="contact-item">
                                    <input
                                        type="text"
                                        value={contact}
                                        onChange={(e) => updateContactInfo(index, e.target.value)}
                                        placeholder="Enter contact information..."
                                        className="form-input"
                                    />
                                    {formData.contactInfo.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeContactInfo(index)}
                                            className="remove-contact-btn"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addContactInfo}
                                className="add-contact-btn"
                            >
                                <Plus size={16} />
                                {t('forms.addContact', 'Add Contact Info')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="form-creation-modal-footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.title.trim()}
                        className="btn btn-primary"
                    >
                        {isSubmitting ? (
                            <>
                                <Clock className="loading-spinner" size={16} />
                                {t('forms.updating', 'Updating...')}
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {t('forms.updateForm', 'Update Form')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormEditModal;