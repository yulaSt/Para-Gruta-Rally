// src/pages/admin/AddTeamPage.jsx - Updated with Vehicle Assignment Support
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import Dashboard from '../../components/layout/Dashboard';
import {useTheme} from '../../contexts/ThemeContext';
import {usePermissions} from '../../hooks/usePermissions.jsx';
import {useLanguage} from '../../contexts/LanguageContext';
import {addTeam, getAllInstructors} from '@/services/teamService.js';
import {getAllKids} from '@/services/kidService.js';
import {getAvailableVehicles} from '@/services/vehicleService.js'; // NEW: Import for vehicles
import {createEmptyTeam, validateTeam} from '@/schemas/teamSchema.js';
import { createUserAsAdmin } from '@/services/adminUserService.jsx';
import { deleteUserCompletely } from '@/services/userService.js';
import { validateUser, cleanPhoneNumber } from '@/schemas/userSchema.js';
import {
    IconUsers as UsersGroup,
    IconPlus as Plus,
    IconArrowLeft as ArrowLeft,
    IconArrowRight as ArrowRight,
    IconCheck as Check,
    IconAlertTriangle as AlertTriangle,
    IconUser as User,
    IconUsers as Users,
    IconCar as Car,
    IconUserCircle as Baby,
    IconNotes as FileText,
    IconSparkles as Sparkles,
    IconTrophy as Trophy,
    IconTarget as Target,
    IconSettings as Settings,
    IconUserPlus as UserPlus,
    IconMail as Mail,
    IconPhone as Phone,
    IconKey as Key,
    IconMapPin as MapPin
} from '@tabler/icons-react';
import './AddTeamPage.css';

const AddTeamPage = () => {
    const navigate = useNavigate();
    const {isDarkMode, appliedTheme} = useTheme();
    const {permissions, userRole} = usePermissions();
    const { t, isHebrew, isRTL } = useLanguage();

    // Default to true so the form doesn't flash before the initial data load — otherwise
    // queries that await the form race against the loadInitialData re-render.
    const [isLoading, setIsLoading] = useState(true);
    const [instructors, setInstructors] = useState([]);
    const [availableKids, setAvailableKids] = useState([]);
    const [availableVehicles, setAvailableVehicles] = useState([]); // NEW: Available vehicles
    const [formData, setFormData] = useState(createEmptyTeam());
    const [errors, setErrors] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline instructor state
    const emptyInlineInstructor = {
        name: '',
        location: '',
        email: '',
        password: '',
        phone: '',
        role: 'instructor',
        displayName: '',
        authProvider: 'email'
    };
    const [isAddingInlineInstructor, setIsAddingInlineInstructor] = useState(true);
    const [inlineInstructor, setInlineInstructor] = useState(emptyInlineInstructor);
    const [inlineErrors, setInlineErrors] = useState({});

    const switchToExistingInstructorMode = () => {
        setIsAddingInlineInstructor(false);
        setInlineInstructor(emptyInlineInstructor);
        setInlineErrors({});
    };

    const switchToInlineInstructorMode = () => {
        setIsAddingInlineInstructor(true);
        setFormData(prev => ({
            ...prev,
            instructorIds: [],
            teamLeaderId: ''
        }));
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);

            // Load instructors using the new service function
            const instructorsData = await getAllInstructors();
            setInstructors(instructorsData);

            // Load kids without teams
            const allKids = await getAllKids();
            const kidsWithoutTeams = allKids.filter(kid => !kid.teamId);
            setAvailableKids(kidsWithoutTeams);

            // NEW: Load available vehicles (not assigned to any team)
            const vehiclesData = await getAvailableVehicles();
            setAvailableVehicles(vehiclesData);

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            setErrors({general: t('addTeam.failedToLoadForm', 'Failed to load form data. Please refresh and try again.')});
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear specific error when user starts typing
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({
                ...prev,
                [field]: false
            }));
        }
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    const handleInstructorToggle = (instructorId) => {
        setFormData(prev => {
            const isAlreadySelected = prev.instructorIds.includes(instructorId);
            const newInstructorIds = isAlreadySelected ? [] : [instructorId];
            return {
                ...prev,
                instructorIds: newInstructorIds,
                teamLeaderId: isAlreadySelected ? '' : instructorId
            };
        });
    };

    const handleInlineInputChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;

        if (name === 'phone') {
            processedValue = cleanPhoneNumber(value);
            if (processedValue.length > 10) {
                processedValue = processedValue.slice(0, 10);
            }
        }

        setInlineInstructor(prev => {
            const updated = {
                ...prev,
                [name]: processedValue
            };
            if (name === 'name') {
                updated.displayName = processedValue;
            }
            return updated;
        });

        if (inlineErrors[name]) {
            setInlineErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleKidToggle = (kidId) => {
        setFormData(prev => ({
            ...prev,
            kidIds: prev.kidIds.includes(kidId)
                ? prev.kidIds.filter(id => id !== kidId)
                : [...prev.kidIds, kidId]
        }));
    };

    // NEW: Handle vehicle toggle
    const handleVehicleToggle = (vehicleId) => {
        setFormData(prev => ({
            ...prev,
            vehicleIds: prev.vehicleIds.includes(vehicleId)
                ? prev.vehicleIds.filter(id => id !== vehicleId)
                : [...prev.vehicleIds, vehicleId]
        }));
    };

    const validateForm = () => {
        // Use schema validation
        const validation = validateTeam(formData, false); // false = not an update

        if (!validation.isValid) {
            setErrors(validation.errors);

            // Set field errors for visual indicators
            const newFieldErrors = {};
            Object.keys(validation.errors).forEach(field => {
                newFieldErrors[field] = true;
            });
            setFieldErrors(newFieldErrors);

            return false;
        }

        setErrors({});
        setFieldErrors({});
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let targetInstructorIds = formData.instructorIds;
        let targetTeamLeaderId = formData.teamLeaderId;

        if (isAddingInlineInstructor) {
            // Validate inline instructor form
            const instValidation = validateUser(inlineInstructor, { isUpdate: false }, t);
            if (!inlineInstructor.password) {
                instValidation.isValid = false;
                instValidation.errors.password = t('users.passwordRequired', 'Password is required');
            } else if (inlineInstructor.password.length < 6) {
                instValidation.isValid = false;
                instValidation.errors.password = t('users.passwordTooShort', 'Password must be at least 6 characters');
            }

            if (!instValidation.isValid) {
                setInlineErrors(instValidation.errors);
                const firstError = Object.values(instValidation.errors)[0];
                setErrors({ general: `${t('addTeam.pleaseFixInstructorErrors', 'Please fix instructor errors:')} ${firstError}` });
                return;
            }

            // Temporarily use a mock ID so validateTeam doesn't fail instructor assignments
            targetInstructorIds = ['dummy-instructor-id'];
            targetTeamLeaderId = 'dummy-instructor-id';
        }

        // Validate the team form
        const teamValidation = validateTeam({
            ...formData,
            instructorIds: targetInstructorIds,
            teamLeaderId: targetTeamLeaderId
        }, false);

        if (!teamValidation.isValid) {
            setErrors(teamValidation.errors);
            const newFieldErrors = {};
            Object.keys(teamValidation.errors).forEach(field => {
                newFieldErrors[field] = true;
            });
            setFieldErrors(newFieldErrors);
            return;
        }

        setIsSubmitting(true);
        let createdInstructorUid = null;

        try {
            if (isAddingInlineInstructor) {
                const { password: _instructorPassword, ...instructorWithoutPassword } = inlineInstructor;
                const result = await createUserAsAdmin(instructorWithoutPassword, {
                    password: inlineInstructor.password
                });
                createdInstructorUid = result.uid;
            }

            // Now prepare final team data
            const finalInstructorIds = isAddingInlineInstructor ? [createdInstructorUid] : formData.instructorIds;
            const finalTeamLeaderId = isAddingInlineInstructor ? createdInstructorUid : formData.teamLeaderId;

            const finalTeamData = {
                ...formData,
                instructorIds: finalInstructorIds,
                teamLeaderId: finalTeamLeaderId
            };

            const teamId = await addTeam(finalTeamData);

            // Update kids' team assignments
            if (formData.kidIds && formData.kidIds.length > 0) {
                try {
                    const { updateKidTeamAssignment } = await import('@/services/kidService.js');
                    const kidUpdatePromises = formData.kidIds.map(kidId =>
                        updateKidTeamAssignment(kidId, teamId)
                    );
                    await Promise.all(kidUpdatePromises);
                } catch (kidError) {
                    console.warn('⚠️ Failed to update some kid assignments:', kidError);
                }
            }

            navigate(`/admin/teams/view/${teamId}`, {
                state: {
                    message: t('addTeam.teamCreatedSuccess', 'Team "{teamName}" is ready for action! Let the racing begin! 🏎️', { teamName: formData.name }),
                    type: 'success'
                }
            });

        } catch (error) {
            console.error('❌ Error submitting team:', error);

            // Roll back instructor creation if team save failed afterwards.
            if (createdInstructorUid) {
                try {
                    await deleteUserCompletely(createdInstructorUid);
                } catch (rollbackErr) {
                    console.warn('⚠️ Could not roll back created instructor:', createdInstructorUid, rollbackErr);
                }
            }

            if (error.code === 'auth/email-already-in-use') {
                setInlineErrors(prev => ({ ...prev, email: t('users.emailInUse', 'This email is already registered') }));
                setErrors({ general: t('users.emailInUse', 'This email is already registered') });
            } else {
                setErrors({ general: error.message || t('addTeam.failedToAddTeam', 'Failed to add team. Please try again.') });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/teams');
    };

    // Helper function to get instructor display name
    const getInstructorDisplayName = (instructor) => {
        return instructor.displayName || instructor.name || instructor.email || t('addTeam.unknownInstructor', 'Unknown Instructor');
    };

    // Helper function to get error message for a field
    const getErrorMessage = (fieldPath) => {
        return errors[fieldPath];
    };

    // Check if field has error
    const hasFieldError = (fieldPath) => {
        return fieldErrors[fieldPath] || false;
    };

    // NEW: Helper function to get vehicle display name
    const getVehicleDisplayName = (vehicle) => {
        return `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
    };

    if (isLoading) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`admin-page add-team-page ${appliedTheme}-mode`}>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>{t('addTeam.loadingTeamSetup', 'Loading team setup...')}</p>
                    </div>
                </div>
            </Dashboard>
        );
    }

    return (
        <Dashboard requiredRole={userRole}>
            <div className={`admin-page add-team-page ${appliedTheme}-mode`}>
                {/* Page Title - Outside container */}
                <button
                    onClick={handleCancel}
                    className={`back-button ${appliedTheme}-back-button ${isRTL ? 'rtl' : ''}`}>
                    {isHebrew ? (
                        <>
                            {t('teams.backToTeams', 'Back to Teams')}
                            <ArrowRight className="btn-icon" size={20} />
                        </>
                    ) : (
                        <>
                            <ArrowLeft className="btn-icon" size={20} />
                            {t('teams.backToTeams', 'Back to Teams')}
                        </>
                    )}
                </button>
                <div className="page-header">
                    <div className="title-section">
                        <h1>
                            <UsersGroup size={32} className="page-title-icon"/>
                            {t('addTeam.title', 'Create A Team!')}
                            <Trophy size={24} className="trophy-icon"/>
                        </h1>
                    </div>
                </div>

                {/* Main Container */}
                <div className="admin-container add-team-container">
                    {/* Racing Theme Header */}
                    <div className="racing-header">
                        <div className="header-content">
                            <div className="title-section">
                                <p className="subtitle">{t('addTeam.subtitle', 'Let\'s build the ultimate racing squad! 🏁')}</p>
                            </div>
                        </div>
                    </div>

                    {errors.general && (
                        <div className="alert error-alert">
                            <AlertTriangle size={20}/>
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="add-team-form">
                        {/* Team Info Section */}
                        <div className="form-section team-info-section">
                            <div className="section-header">
                                <Trophy className="section-icon" size={24}/>
                                <h2>🏎️ {t('teams.teamIdentity', 'Team Identity')}</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="name">
                                            <Target className="label-icon" size={16}/>
                                            {t('teams.teamName', 'Team Name')} *
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder={t('teams.teamNamePlaceholder', 'Thunder Racers, Speed Demons, Lightning Bolts...')}
                                            className={`form-input ${hasFieldError('name') ? 'error' : ''}`}
                                        />
                                        {getErrorMessage('name') && <span className="error-text">{getErrorMessage('name')}</span>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="maxCapacity">
                                            <Users className="label-icon" size={16}/>
                                            {t('teams.maxRacers', 'Max Racers')}
                                        </label>
                                        <input
                                            id="maxCapacity"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={formData.maxCapacity}
                                            onChange={(e) => handleInputChange('maxCapacity', parseInt(e.target.value) || 15)}
                                            className={`form-input ${hasFieldError('maxCapacity') ? 'error' : ''}`}
                                        />
                                        {getErrorMessage('maxCapacity') && <span className="error-text">{getErrorMessage('maxCapacity')}</span>}
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="description">
                                            <FileText className="label-icon" size={16}/>
                                            {t('teams.teamDescription', 'Team Description')}
                                        </label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder={t('teams.teamDescriptionPlaceholder', 'What makes this team special? Their racing spirit, teamwork, or special skills...')}
                                            className="form-textarea"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="active">
                                            <Check className="label-icon" size={16}/>
                                            {t('teams.teamStatus', 'Team Status')}
                                        </label>
                                        <select
                                            id="active"
                                            value={formData.active ? 'active' : 'inactive'}
                                            onChange={(e) => handleInputChange('active', e.target.value === 'active')}
                                            className="form-select"
                                        >
                                            <option value="active">✅ {t('teams.activeReady', 'Active & Ready to Race')}</option>
                                            <option value="inactive">⏸️ {t('teams.inactivePrep', 'Inactive (Prep Mode)')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instructors Section */}
                        <div className="form-section instructors-section">
                            <div className="section-header">
                                <User className="section-icon" size={24}/>
                                <h2>👨‍🏫 {t('teams.racingInstructors', 'Racing Instructors')}</h2>
                            </div>

                            <div className="instructor-mode-selector">
                                <button
                                    type="button"
                                    className={`mode-btn ${!isAddingInlineInstructor ? 'active' : ''}`}
                                    onClick={switchToExistingInstructorMode}
                                >
                                    <User size={16} />
                                    {t('teams.selectExistingInstructor', 'Select Existing')}
                                </button>
                                <button
                                    type="button"
                                    className={`mode-btn ${isAddingInlineInstructor ? 'active' : ''}`}
                                    onClick={switchToInlineInstructorMode}
                                >
                                    <UserPlus size={16} />
                                    {t('teams.addNewInstructorInline', 'Create New')}
                                </button>
                            </div>

                            {!isAddingInlineInstructor ? (
                                <>
                                    <div className="instructors-grid">
                                        {instructors.length === 0 ? (
                                            <div className="empty-state">
                                                <User className="empty-icon" size={40}/>
                                                <p>{t('teams.noInstructorsAvailable', 'No instructors available. Add some instructors first!')}</p>
                                            </div>
                                        ) : (
                                            instructors.map(instructor => (
                                                <div
                                                    key={instructor.id}
                                                    className={`instructor-card card selectable ${formData.instructorIds.includes(instructor.id) ? 'selected' : ''}`}
                                                    onClick={() => handleInstructorToggle(instructor.id)}
                                                >
                                                    <div className="card-header">
                                                        <User className="card-icon" size={20}/>
                                                        <span className="instructor-name card-title">
                                                            {getInstructorDisplayName(instructor)}
                                                        </span>
                                                        {formData.instructorIds.includes(instructor.id) && (
                                                            <Check className="selected-icon" size={16}/>
                                                        )}
                                                    </div>
                                                    <div className="instructor-details card-body">
                                                        {instructor.email && (
                                                            <div>📧 {instructor.email}</div>
                                                        )}
                                                        {instructor.phone && (
                                                            <div>📱 {instructor.phone}</div>
                                                        )}
                                                        {instructor.location && (
                                                            <div>📍 {instructor.location}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                </>
                            ) : (
                                <div className="inline-instructor-form">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <div className="field-wrapper">
                                                <label className="form-label" htmlFor="inst-name">
                                                    <User className="label-icon" size={16}/>
                                                    {t('users.fullName', 'Full Name')} *
                                                </label>
                                                <input
                                                    id="inst-name"
                                                    type="text"
                                                    name="name"
                                                    value={inlineInstructor.name}
                                                    onChange={handleInlineInputChange}
                                                    placeholder={t('users.fullNamePlaceholder', 'Enter full name')}
                                                    className={`form-input ${inlineErrors.name ? 'error' : ''}`}
                                                />
                                                {inlineErrors.name && <span className="error-text">{inlineErrors.name}</span>}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <div className="field-wrapper">
                                                <label className="form-label" htmlFor="inst-location">
                                                    <MapPin className="label-icon" size={16}/>
                                                    {t('users.location', 'Location')} *
                                                </label>
                                                <input
                                                    id="inst-location"
                                                    type="text"
                                                    name="location"
                                                    value={inlineInstructor.location}
                                                    onChange={handleInlineInputChange}
                                                    placeholder={t('users.instructorLocationPlaceholder', 'Enter base location / branch')}
                                                    className={`form-input ${inlineErrors.location ? 'error' : ''}`}
                                                />
                                                {inlineErrors.location && <span className="error-text">{inlineErrors.location}</span>}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <div className="field-wrapper">
                                                <label className="form-label" htmlFor="inst-email">
                                                    <Mail className="label-icon" size={16}/>
                                                    {t('users.emailAddress', 'Email Address')} *
                                                </label>
                                                <input
                                                    id="inst-email"
                                                    type="email"
                                                    name="email"
                                                    value={inlineInstructor.email}
                                                    onChange={handleInlineInputChange}
                                                    placeholder={t('users.emailPlaceholder', 'Enter email address')}
                                                    className={`form-input ${inlineErrors.email ? 'error' : ''}`}
                                                />
                                                {inlineErrors.email && <span className="error-text">{inlineErrors.email}</span>}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <div className="field-wrapper">
                                                <label className="form-label" htmlFor="inst-password">
                                                    <Key className="label-icon" size={16}/>
                                                    {t('users.password', 'Password')} *
                                                </label>
                                                <input
                                                    id="inst-password"
                                                    type="password"
                                                    name="password"
                                                    value={inlineInstructor.password}
                                                    onChange={handleInlineInputChange}
                                                    placeholder="••••••"
                                                    className={`form-input ${inlineErrors.password ? 'error' : ''}`}
                                                />
                                                {inlineErrors.password && <span className="error-text">{inlineErrors.password}</span>}
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <div className="field-wrapper">
                                                <label className="form-label" htmlFor="inst-phone">
                                                    <Phone className="label-icon" size={16}/>
                                                    {t('users.phoneNumber', 'Phone Number')} *
                                                </label>
                                                <input
                                                    id="inst-phone"
                                                    type="tel"
                                                    name="phone"
                                                    value={inlineInstructor.phone}
                                                    onChange={handleInlineInputChange}
                                                    placeholder="05XXXXXXXX"
                                                    maxLength="10"
                                                    className={`form-input ${inlineErrors.phone ? 'error' : ''}`}
                                                />
                                                {inlineErrors.phone && <span className="error-text">{inlineErrors.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NEW: Vehicles Assignment Section */}
                        <div className="form-section vehicles-section">
                            <div className="section-header">
                                <Settings className="section-icon" size={24}/>
                                <h2>🏎️ {t('teams.racingVehicles', 'Racing Vehicles')}</h2>
                            </div>

                            <div className="vehicles-grid">
                                {availableVehicles.length === 0 ? (
                                    <div className="empty-state">
                                        <Car className="empty-icon" size={40}/>
                                        <p>{t('teams.noVehiclesAvailable', 'No vehicles available for assignment!')}</p>
                                        <small>{t('addTeam.allVehiclesAssigned', 'All vehicles are already assigned to teams or inactive.')}</small>
                                    </div>
                                ) : (
                                    availableVehicles.map(vehicle => (
                                        <div
                                            key={vehicle.id}
                                            className={`vehicle-card card selectable ${formData.vehicleIds.includes(vehicle.id) ? 'selected' : ''}`}
                                            onClick={() => handleVehicleToggle(vehicle.id)}
                                        >
                                            <div className="card-header">
                                                <Car className="card-icon" size={20}/>
                                                <span className="vehicle-name card-title">
                                                    {vehicle.make} {vehicle.model}
                                                </span>
                                                {formData.vehicleIds.includes(vehicle.id) && (
                                                    <Check className="selected-icon" size={16}/>
                                                )}
                                            </div>
                                            <div className="vehicle-details card-body">
                                                <div>🏁 {vehicle.licensePlate}</div>
                                                {vehicle.driveType && (
                                                    <div>⚙️ {vehicle.driveType}</div>
                                                )}
                                                {vehicle.batteryType && (
                                                    <div>🔋 {vehicle.batteryType}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {formData.vehicleIds.length > 0 && (
                                <div className="selected-vehicles-summary">
                                    <h4>{t('teams.selectedVehicles', 'Selected Vehicles: {count}', { count: formData.vehicleIds.length })}</h4>
                                    <div className="selected-vehicles-list">
                                        {formData.vehicleIds.map(vehicleId => {
                                            const vehicle = availableVehicles.find(v => v.id === vehicleId);
                                            return vehicle ? (
                                                <span key={vehicleId} className="selected-vehicle-tag">
                                                    🏎️ {getVehicleDisplayName(vehicle)}
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Kids Assignment Section */}
                        <div className="form-section kids-section">
                            <div className="section-header">
                                <Baby className="section-icon" size={24}/>
                                <h2>🏎️ {t('teams.teamRacersWithCount', 'Team Racers ({current}/{max})', { current: formData.kidIds.length, max: formData.maxCapacity })}</h2>
                            </div>

                            {getErrorMessage('kidIds') && (
                                <div className="capacity-warning">
                                    <AlertTriangle size={16}/>
                                    {getErrorMessage('kidIds')}
                                </div>
                            )}

                            <div className="kids-grid">
                                {availableKids.length === 0 ? (
                                    <div className="empty-state">
                                        <Baby className="empty-icon" size={40}/>
                                        <p>{t('teams.allKidsAssigned', 'All kids are already assigned to teams! 🎉')}</p>
                                        <small>{t('addTeam.addMoreKidsHint', 'Add more kids or check existing team assignments.')}</small>
                                    </div>
                                ) : (
                                    availableKids.map(kid => (
                                        <div
                                            key={kid.id}
                                            className={`kid-card card selectable ${formData.kidIds.includes(kid.id) ? 'selected' : ''}`}
                                            onClick={() => handleKidToggle(kid.id)}
                                        >
                                            <div className="card-header">
                                                <Baby className="card-icon" size={20}/>
                                                <span className="kid-name card-title">
                                                    {kid.personalInfo?.firstName || t('addTeam.unknown', 'Unknown')} {kid.personalInfo?.lastName || ''}
                                                </span>
                                                {formData.kidIds.includes(kid.id) && (
                                                    <Check className="selected-icon" size={16}/>
                                                )}
                                            </div>
                                            <div className="kid-details card-body">
                                                <div>🏁 #{kid.participantNumber}</div>
                                                {kid.parentInfo?.name && (
                                                    <div>👨‍👩‍👧‍👦 {kid.parentInfo.name}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Additional Notes */}
                        <div className="form-section notes-section">
                            <div className="section-header">
                                <FileText className="section-icon" size={24}/>
                                <h2>📝 {t('teams.teamNotes', 'Team Notes')}</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <div className="field-wrapper">
                                        <label className="form-label">
                                            <Sparkles className="label-icon" size={16}/>
                                            {t('teams.specialNotesStrategy', 'Special Notes & Strategy')}
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder={t('teams.notesPlaceholder', 'Team strategy, special requirements, or any other important notes...')}
                                            className="form-textarea"
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Racing Action Buttons */}
                        <div className="racing-actions">
                            <button type="button" onClick={handleCancel} className="btn btn-cancel">
                                {t('general.cancel', 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-submit racing-submit"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="loading-spinner-mini"></div>
                                        {t('addTeam.creatingTeam', 'Creating Team...')}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="btn-icon" size={18}/>
                                        {t('addTeam.createRacingTeam', 'Create Racing Team! 🏁')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Dashboard>
    );
};

export default AddTeamPage;
