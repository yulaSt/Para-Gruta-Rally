// src/components/common/ParentSelector.jsx
import React from 'react';
import './ParentSelector.css';
import {
    IconUserPlus as UserPlus,
    IconLock as Lock
} from '@tabler/icons-react';

/**
 * Reusable parent selection component with dropdown, manual entry, and grandparents info
 */
const ParentSelector = ({
    // Data
    parents = [],
    selectedParentId = '',
    selectedParentData = null,
    excludeParentIds = [],

    // Form values for manual entry
    parentName = '',
    parentEmail = '',
    parentPhone = '',

    // Grandparents info
    grandparentsNames = '',
    grandparentsPhone = '',

    // Handlers
    onSelectParent,
    onCreateNew,
    onNameChange,
    onEmailChange,
    onPhoneChange,
    onGrandparentsNamesChange,
    onGrandparentsPhoneChange,

    // Validation
    nameError,
    emailError,
    phoneError,
    hasNameError = false,
    hasEmailError = false,
    hasPhoneError = false,

    // Labels (with defaults)
    labels = {},

    // Translation function
    t,

    // Config
    isRequired = false
}) => {
    // Merge provided labels with defaults
    const l = {
        selectLabel: labels.selectLabel || t('addKid.selectParentGuardian', 'Select Parent/Guardian'),
        dropdownPlaceholder: labels.dropdownPlaceholder || t('addKid.chooseParentAccount', 'Choose Parent Account'),
        createNewLabel: labels.createNewLabel || t('addKid.createNewParent', 'Create New Parent'),
        nameLabel: labels.nameLabel || t('addKid.parentGuardianName', 'Parent/Guardian Name'),
        namePlaceholder: labels.namePlaceholder || t('addKid.parentNamePlaceholder', "Racing coach's name"),
        emailLabel: labels.emailLabel || t('addKid.emailAddress', 'Email Address'),
        emailPlaceholder: labels.emailPlaceholder || t('addKid.emailPlaceholder', 'parent@racingfamily.com'),
        phoneLabel: labels.phoneLabel || t('addKid.phoneNumber', 'Phone Number'),
        phonePlaceholder: labels.phonePlaceholder || t('addKid.phonePlaceholder', 'Racing hotline'),
        grandparentsNamesLabel: labels.grandparentsNamesLabel || t('addKid.grandparentsNames', 'Grandparents Names'),
        grandparentsNamesPlaceholder: labels.grandparentsNamesPlaceholder || t('addKid.grandparentsNamesPlaceholder', 'Racing legends in the family'),
        grandparentsPhoneLabel: labels.grandparentsPhoneLabel || t('addKid.grandparentsPhone', 'Grandparents Phone'),
        grandparentsPhonePlaceholder: labels.grandparentsPhonePlaceholder || t('addKid.grandparentsPhonePlaceholder', 'Backup racing support'),
        ...labels
    };

    const handleSelection = (e) => {
        const value = e.target.value;
        if (value === 'create_new') {
            onCreateNew?.();
            return;
        }
        onSelectParent?.(value);
    };

    // Filter out excluded parents from dropdown
    const availableParents = parents.filter(p => !excludeParentIds.includes(p.id));

    return (
        <>
            {/* Parent Selection Dropdown */}
            <div className="form-group full-width">
                <label className="form-label">
                    {l.selectLabel} {isRequired && '*'}
                </label>
                <div className="parent-selection-container">
                    <select
                        value={selectedParentId}
                        onChange={handleSelection}
                        className="form-select"
                    >
                        <option value="">{l.dropdownPlaceholder}</option>
                        {availableParents.map(parent => (
                            <option key={parent.id} value={parent.id}>
                                {parent.displayName || parent.name} ({parent.email})
                            </option>
                        ))}
                        <option value="create_new">{l.createNewLabel}</option>
                    </select>
                    <button
                        type="button"
                        className="btn-create-parent"
                        onClick={onCreateNew}
                    >
                        <UserPlus size={18} />
                        {l.createNewLabel}
                    </button>
                </div>
            </div>

            {/* Locked fields when parent is selected */}
            {selectedParentData && (
                <>
                    <div className="form-group">
                        <label className="form-label">
                            {l.nameLabel} {isRequired && '*'}
                            <Lock size={14} className="lock-icon" />
                        </label>
                        <input
                            type="text"
                            className="form-input locked"
                            value={selectedParentData.name || selectedParentData.displayName || ''}
                            readOnly
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {l.emailLabel} {isRequired && '*'}
                            <Lock size={14} className="lock-icon" />
                        </label>
                        <input
                            type="email"
                            className="form-input locked"
                            value={selectedParentData.email || ''}
                            readOnly
                            disabled
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {l.phoneLabel} {isRequired && '*'}
                            <Lock size={14} className="lock-icon" />
                        </label>
                        <input
                            type="tel"
                            className="form-input locked"
                            value={selectedParentData.phone || ''}
                            readOnly
                            disabled
                        />
                    </div>
                </>
            )}

            {/* Manual entry fields when no parent is selected */}
            {!selectedParentData && (
                <>
                    <div className="form-group">
                        <label className="form-label">
                            {l.nameLabel} {isRequired && '*'}
                        </label>
                        <input
                            type="text"
                            className={`form-input ${hasNameError ? 'error' : ''}`}
                            placeholder={l.namePlaceholder}
                            value={parentName}
                            onChange={(e) => onNameChange?.(e.target.value)}
                        />
                        {nameError && (
                            <span className="error-text">{nameError}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {l.emailLabel} {isRequired && '*'}
                        </label>
                        <input
                            type="email"
                            className={`form-input ${hasEmailError ? 'error' : ''}`}
                            placeholder={l.emailPlaceholder}
                            value={parentEmail}
                            onChange={(e) => onEmailChange?.(e.target.value)}
                        />
                        {emailError && (
                            <span className="error-text">{emailError}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {l.phoneLabel} {isRequired && '*'}
                        </label>
                        <input
                            type="tel"
                            className={`form-input ${hasPhoneError ? 'error' : ''}`}
                            placeholder={l.phonePlaceholder}
                            value={parentPhone}
                            onChange={(e) => onPhoneChange?.(e.target.value)}
                        />
                        {phoneError && (
                            <span className="error-text">{phoneError}</span>
                        )}
                    </div>
                </>
            )}

            {/* Grandparents Info - always editable */}
            <div className="form-group">
                <label className="form-label">{l.grandparentsNamesLabel}</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder={l.grandparentsNamesPlaceholder}
                    value={grandparentsNames}
                    onChange={(e) => onGrandparentsNamesChange?.(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label className="form-label">{l.grandparentsPhoneLabel}</label>
                <input
                    type="tel"
                    className="form-input"
                    placeholder={l.grandparentsPhonePlaceholder}
                    value={grandparentsPhone}
                    onChange={(e) => onGrandparentsPhoneChange?.(e.target.value)}
                />
            </div>
        </>
    );
};

export default ParentSelector;
