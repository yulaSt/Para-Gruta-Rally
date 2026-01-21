// src/pages/admin/EditTeamPage.jsx - Updated with Vehicle Assignment Support
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Dashboard from '../../components/layout/Dashboard';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions.jsx';
import { getTeamById, updateTeam, getAllInstructors, getAllTeams } from '@/services/teamService.js';
import { getAllKids } from '@/services/kidService.js';
import { getAllVehicles, getAvailableVehicles } from '@/services/vehicleService.js'; // NEW: Import vehicles
import { validateTeam } from '@/schemas/teamSchema.js';
import {
    IconUsers as UsersGroup,
    IconDeviceFloppy as Save,
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
    IconEdit as Edit,
    IconSettings as Settings // NEW: Import for vehicle section
} from '@tabler/icons-react';
import './EditTeamPage.css';

const EditTeamPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const {  appliedTheme } = useTheme();
    const { t, isHebrew, isRTL } = useLanguage();
    const {  userRole } = usePermissions();

    const [isLoading, setIsLoading] = useState(true);
    const [instructors, setInstructors] = useState([]);
    const [allKids, setAllKids] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [allVehicles, setAllVehicles] = useState([]); // NEW: All vehicles
    const [availableVehicles, setAvailableVehicles] = useState([]); // NEW: Available vehicles
    const [originalData, setOriginalData] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        maxCapacity: 15,
        active: true,
        instructorIds: [],
        kidIds: [],
        vehicleIds: [], // NEW: Vehicle IDs
        notes: ''
    });
    const [errors, setErrors] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusInstructor, setFocusInstructor] = useState(false);
    const [focusKids, setFocusKids] = useState(false);
    const [focusVehicles, setFocusVehicles] = useState(false); // NEW: Focus state for vehicles
    const [focusVehicleAssignment, setFocusVehicleAssignment] = useState(false);

    useEffect(() => {
        // Check if we should focus on specific sections
        if (location.state?.focusInstructor) {
            setFocusInstructor(true);
        }
        if (location.state?.focusKids) {
            setFocusKids(true);
        }
        if (location.state?.focusVehicles) { // NEW: Focus vehicles
            setFocusVehicles(true);
        }
        if (location.state?.focusVehicleAssignment) {
            setFocusVehicleAssignment(true);
        }
        loadTeamData();
    }, [id]);

    const getAvailableInstructors = () => {
        return instructors.filter(instructor => {
            // Check if instructor is assigned to any other team
            const isAssignedToOtherTeam = allTeams.some(team =>
                team.id !== id && // Exclude current team
                team.instructorIds &&
                team.instructorIds.includes(instructor.id)
            );

            // Include instructor if:
            // 1. Not assigned to other teams, OR
            // 2. Already assigned to current team
            return !isAssignedToOtherTeam || formData.instructorIds.includes(instructor.id);
        });
    };

    // NEW: Get available vehicles (not assigned to other teams)
    const getAvailableVehiclesForTeam = () => {
        return allVehicles.filter(vehicle => {
            // Include vehicle if:
            // 1. Not assigned to any team (available), OR
            // 2. Already assigned to current team
            return !vehicle.teamId || vehicle.teamId === id;
        });
    };

    const loadTeamData = async () => {
        try {
            setIsLoading(true);

            // Load team data
            const teamData = await getTeamById(id);
            if (!teamData) {
                setErrors({ general: t('teams.teamNotFound', 'Team not found!') });
                return;
            }

            setOriginalData(teamData);
            setFormData(teamData);

            // Load supporting data including all teams and vehicles
            const [instructorsData, allKidsData, allTeamsData, allVehiclesData] = await Promise.all([
                getAllInstructors(),
                getAllKids(),
                getAllTeams(),
                getAllVehicles() // NEW: Load all vehicles
            ]);

            setInstructors(instructorsData);
            setAllKids(allKidsData);
            setAllTeams(allTeamsData);
            setAllVehicles(allVehiclesData); // NEW: Store all vehicles

            // NEW: Set available vehicles
            const availableVehiclesForTeam = allVehiclesData.filter(vehicle =>
                !vehicle.teamId || vehicle.teamId === id
            );
            setAvailableVehicles(availableVehiclesForTeam);

        } catch (error) {
            console.error('❌ Error loading team data:', error);
            setErrors({ general: t('teams.loadDataError', 'Failed to load team data. Please try again.') });
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
        setFormData(prev => ({
            ...prev,
            instructorIds: prev.instructorIds.includes(instructorId)
                ? prev.instructorIds.filter(id => id !== instructorId)
                : [...prev.instructorIds, instructorId]
        }));
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

// Handle individual kid vehicle assignment
    const handleKidVehicleAssignment = async (kidId, vehicleId) => {
        try {
            // Get current kid data first
            const { getKidById } = await import('@/services/kidService.js');
            const currentKid = await getKidById(kidId);

            if (!currentKid) {
                throw new Error('Kid not found');
            }

            // Update only the vehicleId while preserving all other data
            const { updateKid } = await import('@/services/kidService.js');
            await updateKid(kidId, {
                ...currentKid,
                vehicleId: vehicleId || null
            });

            // Update local state to reflect the change
            setAllKids(prev => prev.map(kid =>
                kid.id === kidId
                    ? { ...kid, vehicleId: vehicleId || null }
                    : kid
            ));

            console.log(`✅ Vehicle assignment updated: Kid ${kidId} → Vehicle ${vehicleId}`);

        } catch (error) {
            console.error('❌ Failed to assign vehicle:', error);
            setErrors(prev => ({
                ...prev,
                vehicleAssignment: t('teams.vehicleAssignmentError', 'Failed to assign vehicle. Please try again.')
            }));
        }
    };

    const validateForm = () => {
        // Use schema validation
        const validation = validateTeam(formData, true); // true = is an update

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

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await updateTeam(id, formData);
            // Update kids' team assignments to maintain a bidirectional relationship
            if (formData.kidIds && formData.kidIds.length > 0) {
                try {
                    const { updateKidTeamAssignment } = await import('@/services/kidService.js');

                    // Update each selected kid's teamId
                    const kidUpdatePromises = formData.kidIds.map(kidId =>
                        updateKidTeamAssignment(kidId, id)
                    );

                    await Promise.all(kidUpdatePromises);

                    // Also handle kids that were removed from the team
                    const originalKidIds = originalData?.kidIds || [];
                    const removedKidIds = originalKidIds.filter(kidId => !formData.kidIds.includes(kidId));

                    if (removedKidIds.length > 0) {
                        const removePromises = removedKidIds.map(kidId =>
                            updateKidTeamAssignment(kidId, null)
                        );
                        await Promise.all(removePromises);
                    }
                } catch (kidError) {
                    console.warn('⚠️ Failed to update some kid assignments:', kidError);
                    // Don't fail the entire operation
                }
            }
            // Navigate back with a success message
            navigate(`/admin/teams/view/${id}`, {
                state: {
                    message: t('teams.updateSuccess', '🏁 Team "{teamName}" has been updated successfully! 🏎️', { teamName: formData.name }),
                    type: 'success'
                }
            });
        } catch (error) {
            console.error('❌ Error updating team:', error);
            setErrors({ general: error.message || t('teams.updateError', 'Failed to update team. Please try again.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/teams');
    };

    const hasChanges = () => {
        return JSON.stringify(formData) !== JSON.stringify(originalData);
    };

    // Get available kids (not in other teams, or already in this team)
    const getAvailableKids = () => {
        return allKids.filter(kid =>
            !kid.teamId || kid.teamId === id
        );
    };

    // Helper function to get instructor display name
    const getInstructorDisplayName = (instructor) => {
        return instructor.displayName || instructor.name || instructor.email || 'Unknown Instructor';
    };

    // NEW: Helper function to get vehicle display name
    const getVehicleDisplayName = (vehicle) => {
        return `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
    };

    // Helper function to get error message for a field
    const getErrorMessage = (fieldPath) => {
        return errors[fieldPath];
    };

    // Check if field has error
    const hasFieldError = (fieldPath) => {
        return fieldErrors[fieldPath] || false;
    };

    if (isLoading) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`add-team-page ${appliedTheme}-mode`}>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>{t('teams.loadingTeamData', 'Loading team data...')}</p>
                    </div>
                </div>
            </Dashboard>
        );
    }

    if (errors.general && !originalData) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`add-team-page ${appliedTheme}-mode`}>
                    <div className="error-container">
                        <h3>{t('common.error', 'Error')}</h3>
                        <p>{errors.general}</p>
                        <button onClick={() => navigate('/admin/teams')} className={`btn-primary ${isRTL ? 'rtl' : ''}`}>
                            {isHebrew ? (
                                <>
                                    {t('teams.backToTeams', 'Back to Teams')}
                                    <ArrowRight className="btn-icon" size={18} />
                                </>
                            ) : (
                                <>
                                    <ArrowLeft className="btn-icon" size={18} />
                                    {t('teams.backToTeams', 'Back to Teams')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Dashboard>
        );
    }

    const availableKids = getAvailableKids();
    const availableVehiclesForTeam = getAvailableVehiclesForTeam(); // NEW: Get available vehicles
    const currentCount = formData.kidIds?.length || 0;
    const maxCount = formData.maxCapacity || 15;

    return (
        <Dashboard requiredRole={userRole}>
            <div className={`add-team-page ${appliedTheme}-mode`}>
                {/* Racing Theme Header */}
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
                <div className="header-content">
                    <div className="title-section">
                        <h1>
                            <Edit size={32} className="page-title-icon" />
                            {t('teams.updateRacingTeam', 'Update Racing Team!')}
                            <Trophy size={24} className="trophy-icon" />
                        </h1>
                    </div>
                </div>

                <div className="add-team-container">
                    {errors.general && (
                        <div className="error-alert">
                            <AlertTriangle size={20} />
                            {errors.general}
                        </div>
                    )}

                    {!hasChanges() && (
                        <div className="alert info-alert">
                            <Check size={20} />
                            {t('teams.viewingCurrentInfo', 'You\'re viewing Team {teamName}\'s current information. Make changes below to update! 🏎️', { teamName: formData.name })}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="add-team-form">
                        {/* Team Info Section */}
                        <div className="form-section team-info-section">
                            <div className="section-header">
                                <Trophy className="section-icon" size={24} />
                                <h2>{t('teams.teamIdentity', '🏎️ Team Identity')}</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="name">
                                            <Target className="label-icon" size={16} />
                                            {t('teams.teamName', 'Team Name')} *
                                        </label>
                                        <input
                                            id="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder={t('teams.teamNamePlaceholder', 'Thunder Racers, Speed Demons, Lightning Bolts...')}
                                            className={`form-input racing-input ${hasFieldError('name') ? 'error' : ''}`}
                                        />
                                        {getErrorMessage('name') && <span className="error-text">{getErrorMessage('name')}</span>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="maxCapacity">
                                            <Users className="label-icon" size={16} />
                                            {t('teams.maxRacers', 'Max Racers')}
                                        </label>
                                        <input
                                            id="maxCapacity"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={formData.maxCapacity}
                                            onChange={(e) => handleInputChange('maxCapacity', parseInt(e.target.value) || 15)}
                                            className={`form-input racing-input ${hasFieldError('maxCapacity') ? 'error' : ''}`}
                                        />
                                        {getErrorMessage('maxCapacity') && <span className="error-text">{getErrorMessage('maxCapacity')}</span>}
                                    </div>
                                </div>

                                <div className="form-group full-width">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="description">
                                            <FileText className="label-icon" size={16} />
                                            {t('teams.teamDescription', 'Team Description')}
                                        </label>
                                        <textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder={t('teams.teamDescriptionPlaceholder', 'What makes this team special? Their racing spirit, teamwork, or special skills...')}
                                            className="form-textarea racing-textarea"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="field-wrapper">
                                        <label className="form-label" htmlFor="active">
                                            <Check className="label-icon" size={16} />
                                            {t('teams.teamStatus', 'Team Status')}
                                        </label>
                                        <select
                                            id="active"
                                            value={formData.active ? 'active' : 'inactive'}
                                            onChange={(e) => handleInputChange('active', e.target.value === 'active')}
                                            className="form-select racing-select"
                                        >
                                            <option value="active">{t('teams.activeReady', '✅ Active & Ready to Race')}</option>
                                            <option value="inactive">{t('teams.inactivePrep', '⏸️ Inactive (Prep Mode)')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instructors Section - Highlighted if focusInstructor */}
                        <div className={`form-section instructors-section ${focusInstructor ? 'highlight-section' : ''}`}>
                            <div className="section-header">
                                <User className="section-icon" size={24} />
                                <h2>
                                    {t('teams.racingInstructors', '👨‍🏫 Racing Instructors')}
                                    {focusInstructor && <span className="focus-indicator">{t('teams.focusIndicator', '← Update Here!')}</span>}
                                </h2>
                            </div>
                            <div className="instructors-grid">
                                {(() => {
                                    const availableInstructors = getAvailableInstructors();

                                    if (availableInstructors.length === 0) {
                                        return (
                                            <div className="empty-state">
                                                <User className="empty-icon" size={40} />
                                                <p>{t('teams.noInstructorsAvailable', 'No instructors available. All instructors are already assigned to other teams!')}</p>
                                                {instructors.length > availableInstructors.length && (
                                                    <small>{t('teams.someInstructorsAssigned', `${instructors.length - availableInstructors.length} instructor(s) are assigned to other teams.`)}</small>
                                                )}
                                            </div>
                                        );
                                    }

                                    return availableInstructors.map(instructor => (
                                        <div
                                            key={instructor.id}
                                            className={`instructor-card ${formData.instructorIds.includes(instructor.id) ? 'selected' : ''} ${focusInstructor ? 'focus-card' : ''}`}
                                            onClick={() => handleInstructorToggle(instructor.id)}
                                        >
                                            <div className="card-header">
                                                <User className="card-icon" size={20} />
                                                <span className="instructor-name">{getInstructorDisplayName(instructor)}</span>
                                                {formData.instructorIds.includes(instructor.id) && (
                                                    <Check className="selected-icon" size={16} />
                                                )}
                                            </div>
                                            <div className="instructor-details">
                                                {instructor.email && (
                                                    <div>📧 {instructor.email}</div>
                                                )}
                                                {instructor.phone && (
                                                    <div>📱 {instructor.phone}</div>
                                                )}
                                                {/* Show if instructor was previously in current team */}
                                                {originalData?.instructorIds?.includes(instructor.id) && !formData.instructorIds.includes(instructor.id) && (
                                                    <div className="status-indicator removed">
                                                        🚫 {t('teams.removedFromTeam', 'Being removed from team')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* NEW: Vehicles Assignment Section - Highlighted if focusVehicles */}
                        <div className={`form-section vehicles-section ${focusVehicles ? 'highlight-section' : ''}`}>
                            <div className="section-header">
                                <Settings className="section-icon" size={24} />
                                <h2>
                                    {t('teams.racingVehicles', '🏎️ Racing Vehicles')}
                                    {focusVehicles && <span className="focus-indicator">{t('teams.focusIndicator', '← Update Here!')}</span>}
                                </h2>
                            </div>

                            <div className="vehicles-grid">
                                {availableVehiclesForTeam.length === 0 ? (
                                    <div className="empty-state">
                                        <Car className="empty-icon" size={40} />
                                        <p>{t('teams.noVehiclesAvailable', 'No vehicles available for assignment!')}</p>
                                        <small>{t('teams.allVehiclesAssigned', 'All vehicles are already assigned to other teams or inactive.')}</small>
                                    </div>
                                ) : (
                                    availableVehiclesForTeam.map(vehicle => (
                                        <div
                                            key={vehicle.id}
                                            className={`vehicle-card ${formData.vehicleIds.includes(vehicle.id) ? 'selected' : ''} ${focusVehicles ? 'focus-card' : ''}`}
                                            onClick={() => handleVehicleToggle(vehicle.id)}
                                        >
                                            <div className="card-header">
                                                <Car className="card-icon" size={20} />
                                                <span className="vehicle-name">{vehicle.make} {vehicle.model}</span>
                                                {formData.vehicleIds.includes(vehicle.id) && (
                                                    <Check className="selected-icon" size={16} />
                                                )}
                                            </div>
                                            <div className="vehicle-details">
                                                <div>🏁 {vehicle.licensePlate}</div>
                                                {vehicle.driveType && (
                                                    <div>⚙️ {vehicle.driveType}</div>
                                                )}
                                                {vehicle.batteryType && (
                                                    <div>🔋 {vehicle.batteryType}</div>
                                                )}
                                                {vehicle.currentKidIds && vehicle.currentKidIds.length > 0 && (
                                                    <div className="current-users">👥 {vehicle.currentKidIds.length} kid(s) using</div>
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
                                            const vehicle = availableVehiclesForTeam.find(v => v.id === vehicleId);
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

                        {/* Kids Assignment Section - Highlighted if focusKids */}
                        <div className={`form-section kids-section ${focusKids ? 'highlight-section' : ''}`}>
                            <div className="section-header">
                                <Baby className="section-icon" size={24} />
                                <h2>
                                    {t('teams.teamRacers', '🏎️ Team Racers ({current}/{max})', {
                                        current: currentCount,
                                        max: maxCount
                                    })}
                                    {focusKids && <span className="focus-indicator">{t('teams.focusIndicator', '← Update Here!')}</span>}
                                </h2>
                            </div>

                            {getErrorMessage('kidIds') && (
                                <div className="capacity-warning">
                                    <AlertTriangle size={16} />
                                    {getErrorMessage('kidIds')}
                                </div>
                            )}

                            <div className="kids-grid">
                                {availableKids.length === 0 ? (
                                    <div className="empty-state">
                                        <Baby className="empty-icon" size={40} />
                                        <p>{t('teams.noKidsAvailable', 'No kids available for assignment! 🎉')}</p>
                                        <small>{t('teams.allKidsAssigned', 'All kids are already assigned to teams.')}</small>
                                    </div>
                                ) : (
                                    availableKids.map(kid => (
                                        <div
                                            key={kid.id}
                                            className={`kid-card ${formData.kidIds.includes(kid.id) ? 'selected' : ''} ${focusKids ? 'focus-card' : ''}`}
                                            onClick={() => handleKidToggle(kid.id)}
                                        >
                                            <div className="card-header">
                                                <Baby className="card-icon" size={20} />
                                                <span className="kid-name">
                                                    {kid.personalInfo?.firstName || 'Unknown'} {kid.personalInfo?.lastName || ''}
                                                </span>
                                                {formData.kidIds.includes(kid.id) && (
                                                    <Check className="selected-icon" size={16} />
                                                )}
                                            </div>
                                            <div className="kid-details">
                                                <div>🏁 #{kid.participantNumber}</div>
                                                {kid.parentInfo?.name && (
                                                    <div>👨‍👩‍👧‍👦 {kid.parentInfo.name}</div>
                                                )}
                                                {kid.teamId && kid.teamId !== id && (
                                                    <div className="current-team">{t('teams.currentlyInOtherTeam', '📍 Currently in other team')}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Vehicle Assignment Section */}
                        {formData.kidIds.length > 0 && formData.vehicleIds.length > 0 && (
                            <div className={`form-section vehicle-assignment-section ${focusVehicleAssignment ? 'highlight-section' : ''}`}>
                                <div className="section-header">
                                    <Car className="section-icon" size={24} />
                                    <h2>
                                        {t('teams.vehicleAssignment', '🏎️ Vehicle Assignment')}
                                        <span className="assignment-count">
                    ({formData.kidIds.filter(kidId => {
                                            const kid = allKids.find(k => k.id === kidId);
                                            return kid?.vehicleId;
                                        }).length}/{formData.kidIds.length})
                </span>
                                    </h2>
                                </div>

                                <div className="vehicle-assignment-grid">
                                    {formData.kidIds.map(kidId => {
                                        const kid = allKids.find(k => k.id === kidId);
                                        if (!kid) return null;

                                        const kidName = `${kid.personalInfo?.firstName || 'Unknown'} ${kid.personalInfo?.lastName || ''}`;
                                        const assignedVehicle = formData.vehicleIds.find(vId => {
                                            const vehicle = allVehicles.find(v => v.id === vId);
                                            return vehicle && kid.vehicleId === vId;
                                        });

                                        return (
                                            <div key={kidId} className="kid-vehicle-assignment">
                                                <div className="kid-info">
                                                    <Baby className="kid-icon" size={18} />
                                                    <span className="kid-name">{kidName}</span>
                                                    <span className="participant-number">#{kid.participantNumber}</span>
                                                </div>

                                                <div className="vehicle-selector">
                                                    <select
                                                        value={kid.vehicleId || ''}
                                                        onChange={(e) => handleKidVehicleAssignment(kidId, e.target.value)}
                                                        className="vehicle-select"
                                                    >
                                                        <option value="">{t('teams.noVehicleAssigned', '🚫 No Vehicle Assigned')}</option>
                                                        {formData.vehicleIds.map(vehicleId => {
                                                            const vehicle = allVehicles.find(v => v.id === vehicleId);
                                                            if (!vehicle) return null;

                                                            // Check if vehicle is already assigned to another kid in this team
                                                            const isAssignedToOther = formData.kidIds.some(otherKidId => {
                                                                if (otherKidId === kidId) return false;
                                                                const otherKid = allKids.find(k => k.id === otherKidId);
                                                                return otherKid?.vehicleId === vehicleId;
                                                            });

                                                            return (
                                                                <option
                                                                    key={vehicleId}
                                                                    value={vehicleId}
                                                                    disabled={isAssignedToOther}
                                                                >
                                                                    {isAssignedToOther ? '🚫 ' : '🏎️ '}
                                                                    {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
                                                                    {isAssignedToOther ? ' - Assigned' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>

                                                {assignedVehicle && (
                                                    <div className="assignment-status assigned">
                                                        <Check size={16} />
                                                        {t('teams.vehicleAssigned', 'Assigned')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {formData.kidIds.some(kidId => {
                                    const kid = allKids.find(k => k.id === kidId);
                                    return !kid?.vehicleId;
                                }) && (
                                    <div className="assignment-warning">
                                        <AlertTriangle size={16} />
                                        {t('teams.someKidsNeedVehicles', 'Some kids still need vehicle assignments!')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Additional Notes */}
                        <div className="form-section notes-section">
                            <div className="section-header">
                                <FileText className="section-icon" size={24} />
                                <h2>{t('teams.teamNotes', '📝 Team Notes')}</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <div className="field-wrapper">
                                        <label className="form-label">
                                            <Sparkles className="label-icon" size={16} />
                                            {t('teams.specialNotesStrategy', '📝 Special Notes & Strategy')}
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder={t('teams.notesPlaceholder', 'Team strategy, special requirements, or any other important notes...')}
                                            className="form-textarea racing-textarea"
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Racing Action Buttons */}
                        <div className="form-actions racing-actions">
                            <button
                                type="submit"
                                disabled={isSubmitting || !hasChanges()}
                                className="btn-submit racing-submit"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="loading-spinner-mini"></div>
                                        {t('teams.updatingTeam', 'Updating Team...')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="btn-icon" size={18} />
                                        {hasChanges() ? t('teams.saveUpdates', 'Save Updates! 🏁') : t('teams.noChangesToSave', 'No Changes to Save')}
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

export default EditTeamPage;