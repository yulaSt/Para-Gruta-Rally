// src/components/auth/UserProfile.jsx - Updated with Translation Support
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { updateUserProfile, updateUserPassword, getUserData, validatePassword } from '../../services/userService';
import './UserProfile.css';

const UserProfile = () => {
    const { currentUser } = useAuth();
    const { isDarkMode } = useTheme();
    const { t, isHebrew, isRTL } = useLanguage();

    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // State for profile fields
    const [profileData, setProfileData] = useState({
        displayName: '',
        name: '',
        email: '',
        phone: '',
        role: ''
    });

    // Password change fields
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [passwordErrors, setPasswordErrors] = useState({});

    // Check if user is Google authenticated
    const isGoogleUser = currentUser?.providerData?.some(provider => provider.providerId === 'google.com') || false;

    // Load user data from Firestore
    useEffect(() => {
        const loadUserData = async () => {
            if (currentUser) {
                try {
                    const userData = await getUserData(currentUser.uid);
                    setProfileData({
                        displayName: userData.displayName || '',
                        name: userData.name || '',
                        email: userData.email || '',
                        phone: userData.phone || '',
                        role: userData.role || ''
                    });
                } catch (error) {
                    console.error('Error loading user data:', error);
                    setMessage({ type: 'error', text: t('general.error') });
                }
            }
        };

        loadUserData();
    }, [currentUser, t]);

    // Clear messages after 5 seconds
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Handle profile form changes
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle password form changes
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear errors when user starts typing
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Validate new password in real-time
        if (name === 'newPassword') {
            const validation = validatePassword(value);
            if (!validation.isValid && value.length > 0) {
                setPasswordErrors(prev => ({
                    ...prev,
                    newPassword: validation.message
                }));
            }
        }
    };

    // Handle profile update
    const handleProfileUpdate = async (e) => {
        e.preventDefault();

        if (!profileData.name.trim() || !profileData.phone.trim()) {
            setMessage({ type: 'error', text: t('forms.requiredField') });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await updateUserProfile(currentUser.uid, {
                displayName: profileData.displayName,
                name: profileData.name,
                phone: profileData.phone
            });

            setMessage({ type: 'success', text: t('account.saveChanges') + ' ' + t('general.loading').toLowerCase() + '!' });
            setIsEditing(false);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle password update
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();


        // Clear previous messages
        setMessage({ type: '', text: '' });

        // Validate form
        const newErrors = {};

        if (!passwordData.currentPassword.trim()) {
            newErrors.currentPassword = t('auth.currentPassword') + ' ' + t('forms.requiredField');
        }

        if (!passwordData.newPassword.trim()) {
            newErrors.newPassword = t('auth.newPassword') + ' ' + t('forms.requiredField');
        } else if (passwordData.newPassword.length < 6) {
            newErrors.newPassword = t('auth.passwordMinLength');
        }

        if (!passwordData.confirmPassword.trim()) {
            newErrors.confirmPassword = t('auth.confirmPasswordRequired');
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
        }

        // Check if trying to use the same password
        if (passwordData.currentPassword === passwordData.newPassword) {
            newErrors.newPassword = t('auth.newPasswordDifferent');
        }

        if (Object.keys(newErrors).length > 0) {
            setPasswordErrors(newErrors);
            return;
        }

        setIsPasswordLoading(true);
        setPasswordErrors({});

        try {

            await updateUserPassword(passwordData.currentPassword, passwordData.newPassword);


            setMessage({
                type: 'success',
                text: t('auth.passwordUpdatedSuccess')
            });

            // Reset form
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setPasswordErrors({});

            // Scroll to top to show success message
            document.querySelector('.user-profile')?.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error('❌ Password update failed:', error);

            // Show user-friendly error message
            setMessage({
                type: 'error',
                text: error.message || t('auth.passwordUpdateFailed')
            });

            // If it's an authentication error, clear the current password field
            if (error.message.includes('Current password is incorrect') ||
                error.message.includes('invalid-credential')) {
                setPasswordData(prev => ({
                    ...prev,
                    currentPassword: ''
                }));
                setPasswordErrors({
                    currentPassword: t('auth.reenterCurrentPassword')
                });
            }

            // Scroll to top to show error message
            document.querySelector('.user-profile')?.scrollTo({ top: 0, behavior: 'smooth' });

        } finally {
            setIsPasswordLoading(false);
        }
    };

    return (
        <div className={`user-profile ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="profile-header">
                <div className="profile-avatar">
                    {profileData.displayName.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-info">
                    <h2>{profileData.displayName || t('common.user')}</h2>
                    <p>{profileData.email}</p>
                    {isGoogleUser && (
                        <p className="auth-provider">
                            <span style={{ color: '#4285f4', fontWeight: '500' }}>
                                🔗 {t('login.googleSignIn')}
                            </span>
                        </p>
                    )}
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    {t('account.profile')}
                </button>
                <button
                    className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    {t('account.security')}
                </button>
                <button
                    className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preferences')}
                >
                    {t('account.preferences')}
                </button>
            </div>

            <div className="profile-content">
                {/* Display messages */}
                {message.text && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="profile-section">
                        <div className="section-header">
                            <h3>{t('account.profile')}</h3>
                            {!isEditing && (
                                <button
                                    className="edit-button"
                                    onClick={() => setIsEditing(true)}
                                >
                                    {t('account.editProfile')}
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleProfileUpdate} className="profile-form">
                                <div className="form-group">
                                    <label htmlFor="displayName">{t('users.displayName')}</label>
                                    <input
                                        type="text"
                                        id="displayName"
                                        name="displayName"
                                        value={profileData.displayName}
                                        onChange={handleProfileChange}
                                        disabled={isLoading}
                                        placeholder={t('users.displayNamePlaceholder')}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="email">{t('account.email')}</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={profileData.email}
                                        disabled={true}
                                        style={{
                                            backgroundColor: 'var(--bg-tertiary)',
                                            cursor: 'not-allowed',
                                            opacity: 0.6
                                        }}
                                        placeholder={t('users.emailCannotChange')}
                                    />
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        {t('users.emailLinkedToAuth')}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name">{t('account.fullName')} *</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleProfileChange}
                                        required
                                        disabled={isLoading}
                                        placeholder={t('users.fullNamePlaceholder')}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="phone">{t('account.phone')} *</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleProfileChange}
                                        required
                                        disabled={isLoading}
                                        placeholder={t('users.phoneNumberPlaceholder')}
                                    />
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="submit"
                                        className="save-button"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? t('common.saving') : t('account.saveChanges')}
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={() => setIsEditing(false)}
                                        disabled={isLoading}
                                    >
                                        {t('account.cancel')}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="profile-details">
                                <div className="detail-item">
                                    <span className="detail-label">{t('users.displayName')}:</span>
                                    <span className="detail-value">{profileData.displayName}</span>
                                </div>

                                <div className="detail-item">
                                    <span className="detail-label">{t('users.email')}:</span>
                                    <span className="detail-value">{profileData.email}</span>
                                </div>

                                <div className="detail-item">
                                    <span className="detail-label">{t('users.fullName')}:</span>
                                    <span className="detail-value">{profileData.name}</span>
                                </div>

                                {profileData.phone && (
                                    <div className="detail-item">
                                        <span className="detail-label">{t('users.phone')}:</span>
                                        <span className="detail-value">{profileData.phone}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="security-section">
                        <div className="section-header">
                            <h3>{t('account.security')}</h3>
                        </div>

                        {isGoogleUser ? (
                            <div className="google-auth-notice">
                                <div className="notice-card">
                                    <div className="notice-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4285f4" />
                                        </svg>
                                    </div>
                                    <div className="notice-content">
                                        <h4>{t('auth.googleAccountAuth')}</h4>
                                        <p>
                                            {t('auth.googleAuthDescription')}
                                        </p>
                                        <a
                                            href="https://myaccount.google.com/security"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="google-settings-link"
                                        >
                                            {t('auth.manageGoogleSecurity')}
                                        </a>
                                    </div>
                                </div>

                                <div className="security-benefits">
                                    <h4>{t('auth.securityBenefits')}</h4>
                                    <ul>
                                        <li>✅ {t('auth.twoFactorGoogle')}</li>
                                        <li>✅ {t('auth.advancedThreatProtection')}</li>
                                        <li>✅ {t('auth.automaticSecurityUpdates')}</li>
                                        <li>✅ {t('auth.signInAlerts')}</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="password-change">
                                <h4>{t('auth.changePassword')}</h4>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                                    {t('auth.passwordUpdateDescription')}
                                </p>

                                <form onSubmit={handlePasswordUpdate} className="password-form">
                                    <div className={`form-group ${passwordErrors.currentPassword ? 'error' : ''}`}>
                                        <label htmlFor="currentPassword">{t('auth.currentPassword')} *</label>
                                        <input
                                            type="password"
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={passwordData.currentPassword}
                                            onChange={handlePasswordChange}
                                            disabled={isPasswordLoading}
                                            placeholder={t('login.passwordPlaceholder')}
                                        />
                                        {passwordErrors.currentPassword && (
                                            <div className="error-message">{passwordErrors.currentPassword}</div>
                                        )}
                                    </div>

                                    <div className={`form-group ${passwordErrors.newPassword ? 'error' : ''}`}>
                                        <label htmlFor="newPassword">{t('auth.newPassword')} *</label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            name="newPassword"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            disabled={isPasswordLoading}
                                            placeholder={t('auth.newPassword')}
                                        />
                                        {passwordErrors.newPassword && (
                                            <div className="error-message">{passwordErrors.newPassword}</div>
                                        )}
                                    </div>

                                    <div className={`form-group ${passwordErrors.confirmPassword ? 'error' : ''}`}>
                                        <label htmlFor="confirmPassword">{t('auth.confirmNewPassword')} *</label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            disabled={isPasswordLoading}
                                            placeholder={t('auth.confirmNewPassword')}
                                        />
                                        {passwordErrors.confirmPassword && (
                                            <div className="error-message">{passwordErrors.confirmPassword}</div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="save-button"
                                        disabled={isPasswordLoading}
                                    >
                                        {isPasswordLoading ? t('users.updating') : t('auth.updatePassword')}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'preferences' && (
                    <div className="preferences-section">
                        <div className="section-header">
                            <h3>{t('account.preferences')}</h3>
                        </div>

                        <div className="theme-settings">
                            <h4>{t('settings.displaySettings')}</h4>
                            <div className="preference-group">
                                <label>{t('settings.theme')}</label>
                                <div className="theme-options">
                                    <div className="theme-option">
                                        <input
                                            type="radio"
                                            id="darkTheme"
                                            name="theme"
                                            value="dark"
                                            defaultChecked={isDarkMode}
                                        />
                                        <label htmlFor="darkTheme">{t('settings.darkMode')}</label>
                                    </div>
                                    <div className="theme-option">
                                        <input
                                            type="radio"
                                            id="lightTheme"
                                            name="theme"
                                            value="light"
                                            defaultChecked={!isDarkMode}
                                        />
                                        <label htmlFor="lightTheme">{t('settings.lightMode')}</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="save-button">
                            {t('settings.savePreferences')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;