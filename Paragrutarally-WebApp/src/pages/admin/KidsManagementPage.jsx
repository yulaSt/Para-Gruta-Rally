// src/pages/admin/KidsManagementPage.jsx - OPTIMIZED VERSION with single-row stats
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../../components/layout/Dashboard';
import TeamChangeModal from '../../components/modals/TeamChangeModal.jsx';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions, canUserAccessKid } from '../../hooks/usePermissions.jsx';
import ExportKidsModal from '../../components/modals/ExportKidsModal';
import {
    getAllKids,
    getKidsByInstructor,
    getKidsByParent,
    deleteKid
} from '@/services/kidService.js';
import { getAllTeams } from '@/services/teamService.js';
import { getKidPhotoInfo } from '@/services/kidPhotoService.js';
import {
    IconUserCircle as Baby,
    IconPlus as Plus,
    IconRefresh as RefreshCw,
    IconDownload as Download,
    IconUsers as Users,
    IconCheck as Check,
    IconAlertTriangle as AlertTriangle,
    IconCar as Car,
    IconSearch as Search,
    IconTag as Tag,
    IconChartBar as BarChart3,
    IconEraser as Eraser,
    IconFile as FileSpreadsheet,
    IconX as X,
    IconEye as Eye,
    IconEdit as Edit,
    IconTrash as Trash2,
    IconClock as Clock,
    IconCircleX as XCircle,
    IconCamera as Camera
} from '@tabler/icons-react';
import './KidsManagementPage.css';

const KidsManagementPage = () => {
    const navigate = useNavigate();
    const { appliedTheme } = useTheme();
    const { t } = useLanguage();
    const { permissions, userRole, userData, user, loading: permissionsLoading, error: permissionsError } = usePermissions();

    const [kids, setKids] = useState([]);
    const [teams, setTeams] = useState([]);
    const [filteredKids, setFilteredKids] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamFilter, setTeamFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showingKidsWithoutTeams, setShowingKidsWithoutTeams] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [activeCardFilter, setActiveCardFilter] = useState('total'); // NEW: Track active card

    // TEAM CHANGE MODAL STATE
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [selectedKidForTeamChange, setSelectedKidForTeamChange] = useState(null);

    // Load teams and kids
    useEffect(() => {
        if (!permissionsLoading && permissions) {
            loadTeamsAndKids();
        }
    }, [userRole, userData, permissions, permissionsLoading]);

    // Filter kids when search term or filters change
    useEffect(() => {
        filterKids();
    }, [kids, searchTerm, teamFilter, statusFilter]);

    // Helper function to get team name by ID
    const getTeamNameById = (teamId) => {
        if (!teamId) return t('kids.noTeam', 'No Team');
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : `Team ${teamId.slice(0, 8)}...`;
    };

    // Helper function to get kid's display name based on role
    const getKidDisplayName = (kid) => {
        switch (userRole) {
            case 'admin':
                {
                    const firstName = kid.personalInfo?.firstName || '';
                    const lastName = kid.personalInfo?.lastName || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    return fullName || `${t('kids.participantNumber', 'Participant #')}${kid.participantNumber}`;
                }
            case 'instructor':
            case 'parent':
                {
                    const instFirstName = kid.personalInfo?.firstName || '';
                    const instLastName = kid.personalInfo?.lastName || '';
                    const instFullName = `${instFirstName} ${instLastName}`.trim();
                    return instFullName || `${t('kids.participantNumber', 'Participant #')}${kid.participantNumber}`;
                }
            default:
                return 'Restricted';
        }
    };

    // Helper function to get initials for photo placeholder
    const getKidInitials = (kid) => {
        const firstName = kid.personalInfo?.firstName || '';
        const lastName = kid.personalInfo?.lastName || '';
        const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        return initials || kid.participantNumber?.charAt(0) || '?';
    };

    const loadTeamsAndKids = async () => {
        if (!permissions) return;

        setIsLoading(true);
        setError(null);

        try {
            // Load teams first
            const teamsData = await getAllTeams();
            setTeams(teamsData);

            // Load kids based on role
            let kidsData = [];

            switch (userRole) {
                case 'admin':
                    kidsData = await getAllKids();
                    break;
                case 'instructor':
                    if (userData?.instructorId) {
                        kidsData = await getKidsByInstructor(userData.instructorId);
                    }
                    break;
                case 'parent':
                    if (user?.uid) {
                        kidsData = await getKidsByParent(user.uid);
                    }
                    break;
                case 'guest':
                    kidsData = [];
                    break;
                default:
                    kidsData = [];
            }


            // Filter and transform based on role-based access
            const accessibleKids = kidsData
                .filter(kid => canUserAccessKid(userRole, kid, userData, user))
                .map(kid => {
                    const photoInfo = getKidPhotoInfo(kid);

                    // Lookup team name from local teamsData to avoid stale state
                    let teamName = t('kids.noTeam', 'No Team');
                    if (kid.teamId) {
                        const team = teamsData.find(t => t.id === kid.teamId);
                        teamName = team ? team.name : `Team ${kid.teamId.slice(0, 8)}...`;
                    }

                    return {
                        id: kid.id,
                        name: getKidDisplayName(kid),
                        parentName: userRole === 'admin' || userRole === 'instructor'
                            ? kid.parentInfo?.name || 'N/A'
                            : userRole === 'parent'
                                ? 'You'
                                : 'Restricted',
                        age: kid.personalInfo?.dateOfBirth ? calculateAge(kid.personalInfo.dateOfBirth) : 'N/A',
                        team: teamName,
                        teamId: kid.teamId,
                        status: kid.signedFormStatus?.toLowerCase() || 'pending',
                        participantNumber: kid.participantNumber,
                        // Add photo information
                        photoUrl: photoInfo.url,
                        hasPhoto: photoInfo.hasPhoto,
                        initials: getKidInitials(kid),
                        originalData: kid
                    };
                });

            setKids(accessibleKids);

        } catch (err) {
            console.error('💥 Error loading teams and kids:', err);
            setError(`Failed to load data: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateAge = (dateOfBirth) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age.toString();
    };

    const filterKids = () => {
        let filtered = kids.filter(kid => {
            const matchesSearch = kid.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kid.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                kid.participantNumber?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTeam = teamFilter === 'all' ||
                (teamFilter === 'no-team' && kid.team === t('kids.noTeam', 'No Team')) ||
                (teamFilter === 'with-team' && kid.team !== t('kids.noTeam', 'No Team'));

            // FIXED: Active kids should check for 'completed' status
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && kid.status === 'completed') ||
                (statusFilter !== 'active' && kid.status === statusFilter);

            return matchesSearch && matchesTeam && matchesStatus;
        });
        setFilteredKids(filtered);
    };

    // Handle stat card clicks to filter kids - FIXED WITH VEHICLE PATTERN
    const handleStatCardClick = (filterType) => {
        setActiveCardFilter(filterType); // NEW: Set active card

        switch (filterType) {
            case 'total':
                setTeamFilter('all');
                setStatusFilter('all');
                setShowingKidsWithoutTeams(false);
                break;
            case 'without-teams':
                setTeamFilter('no-team');
                setStatusFilter('all');
                setShowingKidsWithoutTeams(true);
                break;
            case 'active':
                setTeamFilter('all');
                setStatusFilter('active'); // This will filter for 'completed' status
                setShowingKidsWithoutTeams(false);
                break;
            case 'with-teams':
                setTeamFilter('with-team');
                setStatusFilter('all');
                setShowingKidsWithoutTeams(false);
                break;
            default:
                break;
        }
        setSearchTerm('');
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setTeamFilter('all');
        setStatusFilter('all');
        setShowingKidsWithoutTeams(false);
        setActiveCardFilter('total'); // NEW: Reset to total
    };

    const handleDeleteKid = async (kid) => {
        if (userRole !== 'admin') {
            alert(t('kids.onlyAdminsCanDelete', 'Only administrators can delete kids.'));
            return;
        }

        if (window.confirm(t('kids.deleteConfirm', 'Are you sure you want to delete {kidName}? This action cannot be undone.', { kidName: kid.name }))) {
            try {
                await deleteKid(kid.id);
                setKids(kids.filter(k => k.id !== kid.id));
                alert(t('kids.deleteSuccess', '{kidName} has been deleted successfully!', { kidName: kid.name }));
            } catch (err) {
                console.error('Error deleting kid:', err);
                alert(t('kids.deleteFailed', 'Failed to delete kid. Please try again.'));
            }
        }
    };

    const handleViewKid = (kid) => {
        navigate(`/admin/kids/view/${kid.id}`);
    };

    const handleRowClick = (kid, event) => {
        if (event.target.closest('.action-buttons-enhanced')) {
            return;
        }
        handleViewKid(kid);
    };

    // TEAM CHANGE MODAL HANDLERS - FIXED with fresh data
    const handleChangeTeam = (kid) => {

        // Get the most up-to-date kid data from the current state
        const currentKidData = kids.find(k => k.id === kid.id);

        if (!currentKidData) {
            console.error('❌ Kid not found in current state:', kid.id);
            return;
        }

        // Create a stable kid object for the TeamChangeModal with current data
        const modalKidData = {
            id: currentKidData.id,
            name: currentKidData.name,
            teamId: currentKidData.teamId, // This will be the updated teamId
            team: currentKidData.team,     // This will be the updated team name
            // Pass the updated original data
            ...currentKidData.originalData
        };


        // Set the selected kid FIRST
        setSelectedKidForTeamChange(modalKidData);

        // Then open the modal in the next tick to avoid race conditions
        setTimeout(() => {
            setTeamModalOpen(true);
        }, 0);
    };

    const handleTeamChanged = async (kidId, newTeamId) => {

        // Update the kids state with the new team information
        setKids(prevKids =>
            prevKids.map(kid =>
                kid.id === kidId
                    ? {
                        ...kid,
                        teamId: newTeamId,
                        team: getTeamNameById(newTeamId),
                        // IMPORTANT: Update the originalData too so modal gets fresh data
                        originalData: {
                            ...kid.originalData,
                            teamId: newTeamId
                        }
                    }
                    : kid
            )
        );

        // Close modal and clear selection
        handleCloseTeamModal();

        const kidName = kids.find(k => k.id === kidId)?.name;
        const teamName = newTeamId ? getTeamNameById(newTeamId) : t('kids.noTeam', 'No Team');
        const action = newTeamId ? t('kids.assignedTo', 'assigned to') : t('kids.removedFrom', 'removed from team');

        // Show success message
        alert(t('kids.teamChanged', '{kidName} has been {action} {teamName}', {
            kidName,
            action,
            teamName
        }));
    };

    const handleCloseTeamModal = () => {
        setTeamModalOpen(false);
        // Clear the selected kid after a brief delay to prevent re-render issues
        setTimeout(() => {
            setSelectedKidForTeamChange(null);
        }, 100);
    };

    // EDIT KID MODAL HANDLERS
    const handleEditKid = (kid) => {
        navigate(`/admin/kids/edit/${kid.id}`);
    };

    const handleKidUpdated = (kidId, updatedData) => {
        const photoInfo = getKidPhotoInfo(updatedData);

        setKids(prevKids =>
            prevKids.map(kid =>
                kid.id === kidId
                    ? {
                        ...kid,
                        name: getKidDisplayName(updatedData),
                        parentName: userRole === 'admin' || userRole === 'instructor'
                            ? updatedData.parentInfo?.name || 'N/A'
                            : kid.parentName,
                        age: updatedData.personalInfo?.dateOfBirth ? calculateAge(updatedData.personalInfo.dateOfBirth) : 'N/A',
                        team: getTeamNameById(updatedData.teamId),
                        teamId: updatedData.teamId,
                        status: updatedData.signedFormStatus?.toLowerCase() || 'pending',
                        participantNumber: updatedData.participantNumber,
                        // Update photo information
                        photoUrl: photoInfo.url,
                        hasPhoto: photoInfo.hasPhoto,
                        initials: getKidInitials(updatedData),
                        originalData: { ...kid.originalData, ...updatedData }
                    }
                    : kid
            )
        );

        setEditModalOpen(false);
        setSelectedKidForEdit(null);

        const kidName = kids.find(k => k.id === kidId)?.name;
        alert(t('kids.updated', '{kidName} has been updated successfully!', { kidName }));
    };

    const handleExportKids = () => {
        setExportModalOpen(true);
    };

    const handleCloseExportModal = () => {
        setExportModalOpen(false);
    };

    const handleAddKid = () => {
        navigate('/admin/kids/add');
    };

    const stats = {
        kidsWithoutTeams: kids.filter(k => k.team === t('kids.noTeam', 'No Team')).length,
        totalKids: kids.length,
        activeKids: kids.filter(k => k.status === 'completed').length, // FIXED: Active = completed status
        kidsWithTeams: kids.filter(k => k.team !== t('kids.noTeam', 'No Team')).length
    };

    if (permissionsLoading) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`kids-management-page ${appliedTheme}-mode`}>
                    <div className="loading-state">
                        <div className="loading-content">
                            <Clock className="loading-spinner" size={30} />
                            <p>{t('kids.loadingPermissions', 'Loading permissions...')}</p>
                        </div>
                    </div>
                </div>
            </Dashboard>
        );
    }

    if (permissionsError) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`kids-management-page ${appliedTheme}-mode`}>
                    <div className="error-container">
                        <h3>{t('kids.permissionError', 'Permission Error')}</h3>
                        <p>{permissionsError}</p>
                        <button onClick={() => window.location.reload()} className="btn-primary">
                            <RefreshCw className="btn-icon" size={18} />
                            {t('kids.reloadPage', 'Reload Page')}
                        </button>
                    </div>
                </div>
            </Dashboard>
        );
    }

    if (error) {
        return (
            <Dashboard requiredRole={userRole}>
                <div className={`kids-management-page ${appliedTheme}-mode`}>
                    <div className="error-container">
                        <h3>{t('common.error', 'Error')}</h3>
                        <p>{error}</p>
                        <button onClick={loadTeamsAndKids} className="btn-primary">
                            <RefreshCw className="btn-icon" size={18} />
                            {t('kids.tryAgain', 'Try Again')}
                        </button>
                    </div>
                </div>
            </Dashboard>
        );
    }

    return (
        <Dashboard requiredRole={userRole}>
            <div className={`kids-management-page ${appliedTheme}-mode`}>
                <h1 className="page-title">
                    <Baby size={32} className="page-title-icon" /> {t('kids.title', 'Kids Management')}
                </h1>

                <div className="kids-management-container">
                    {/* Header with Actions */}
                    <div className="page-header">
                        {userRole === 'admin' && (
                            <button className="btn-primary" onClick={handleAddKid}>
                                <Plus className="btn-icon" size={18} />
                                {t('kids.addNewKid', 'Add New Kid')}
                            </button>
                        )}

                        <div className="header-actions">
                            <button className="btn-secondary" onClick={loadTeamsAndKids}>
                                <RefreshCw className="btn-icon" size={18} />
                                {t('kids.refresh', 'Refresh')}
                            </button>
                            {(userRole === 'admin' || userRole === 'instructor') && (
                                <button className="btn-export" onClick={handleExportKids}>
                                    <Download className="btn-icon" size={18} />
                                    {t('kids.exportKids', 'Export Kids')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* OPTIMIZED Stats Cards - Single Row Layout */}
                    <div className="stats-grid-optimized">
                        <div
                            className={`stat-card total ${activeCardFilter === 'total' ? 'active' : ''}`}
                            onClick={() => handleStatCardClick('total')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Users className="stat-icon" size={40} />
                            <div className="stat-content">
                                <h3>{userRole === 'parent' ? t('kids.yourKids', 'Your Kids') : t('kids.totalKids', 'Total Kids')}</h3>
                                <div className="stat-value">{stats.totalKids}</div>
                            </div>
                        </div>

                        {(userRole === 'admin' || userRole === 'instructor') && (
                            <div
                                className={`stat-card priority-warning clickable ${activeCardFilter === 'without-teams' ? 'active' : ''}`}
                                onClick={() => handleStatCardClick('without-teams')}
                                style={{ cursor: 'pointer' }}
                            >
                                <AlertTriangle className="stat-icon warning" size={45} />
                                <div className="stat-content">
                                    <h3>{t('kids.kidsWithoutTeams', 'Kids without Teams')}</h3>
                                    <div className="stat-value">{stats.kidsWithoutTeams}</div>
                                </div>
                            </div>
                        )}

                        <div
                            className={`stat-card active-kids ${activeCardFilter === 'active' ? 'active' : ''}`}
                            onClick={() => handleStatCardClick('active')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Check className="stat-icon" size={40} />
                            <div className="stat-content">
                                <h3>{t('kids.activeKids', 'Active Kids')}</h3>
                                <div className="stat-value">{stats.activeKids}</div>
                            </div>
                        </div>

                        <div
                            className={`stat-card with-teams ${activeCardFilter === 'with-teams' ? 'active' : ''}`}
                            onClick={() => handleStatCardClick('with-teams')}
                            style={{ cursor: 'pointer' }}
                        >
                            <Car className="stat-icon" size={40} />
                            <div className="stat-content">
                                <h3>{t('kids.kidsWithTeams', 'Kids with Teams')}</h3>
                                <div className="stat-value">{stats.kidsWithTeams}</div>
                            </div>
                        </div>
                    </div>

                    {/* Rest of the component remains the same... */}
                    {/* Search and Filters */}
                    <div className="search-filter-section">
                        <div className="search-container">
                            <div className="search-input-wrapper">
                                <Search className="search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('kids.searchPlaceholder', 'Search by kid name or parent name...')}
                                    className="search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button className="clear-search" onClick={() => setSearchTerm('')}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="filter-container">
                            <label className="filter-label">
                                <Tag className="filter-icon" size={16} />
                                {t('kids.teamStatus', 'Team Status')}
                            </label>
                            <select
                                className="filter-select"
                                value={teamFilter}
                                onChange={(e) => setTeamFilter(e.target.value)}
                            >
                                <option value="all">⭐ {t('kids.allKids', 'All Kids')}</option>
                                <option value="no-team">⚠️ {t('kids.noTeam', 'No Team')}</option>
                                <option value="with-team">🏎️ {t('kids.withTeam', 'With Team')}</option>
                            </select>
                        </div>

                        <div className="filter-container">
                            <label className="filter-label">
                                <BarChart3 className="filter-icon" size={16} />
                                {t('kids.status', 'Status')}
                            </label>
                            <select
                                className="filter-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">🌈 {t('kids.allStatus', 'All Status')}</option>
                                <option value="active">✅ {t('status.active', 'Active')}</option>
                                <option value="pending">⏳ {t('status.pending', 'Pending')}</option>
                                <option value="completed">🏁 {t('status.completed', 'Completed')}</option>
                                <option value="cancelled">❌ {t('status.cancelled', 'Cancelled')}</option>
                            </select>
                        </div>

                        <button className="btn-clear" onClick={handleClearFilters}>
                            <Eraser className="btn-icon" size={18} />
                            {t('kids.clearAll', 'Clear All')}
                        </button>
                    </div>

                    {/* Results Info with Reset Button */}
                    <div className="results-info">
                        <div className="results-content">
                            <FileSpreadsheet className="results-icon" size={18} />
                            {t('kids.showing', 'Showing')} {filteredKids.length} {t('kids.of', 'of')} {kids.length} {t('kids.kids', 'kids')}
                            {showingKidsWithoutTeams && <span className="priority-filter"> • 🚨 {t('kids.priorityFilter', 'PRIORITY: Kids without teams')}</span>}
                            {teamFilter !== 'all' && !showingKidsWithoutTeams && <span className="filter-applied"> • {t('kids.status', 'Status')}: {teamFilter === 'with-team' ? t('kids.withTeam', 'With Team') : teamFilter === 'no-team' ? t('kids.noTeam', 'No Team') : teamFilter}</span>}
                            {statusFilter !== 'all' && (
                                <span className="filter-applied">
                                    • {t('kids.status', 'Status')}: {
                                        statusFilter === 'active'
                                            ? t('kids.active', 'Active')
                                            : t(`status.${statusFilter}`, statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1))
                                    }
                                </span>
                            )}
                            {searchTerm && <span className="search-applied"> • {t('general.search', 'Search')}: "{searchTerm}"</span>}
                        </div>

                        {(teamFilter !== 'all' || statusFilter !== 'all' || searchTerm || showingKidsWithoutTeams) && (
                            <button className="btn-reset" onClick={handleClearFilters} title={t('kids.reset', 'Reset all filters')}>
                                <RefreshCw className="btn-icon" size={16} />
                                {t('kids.reset', 'Reset')}
                            </button>
                        )}
                    </div>

                    {/* Enhanced Table with Photo Column */}
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th><Baby size={16} style={{ marginRight: '8px' }} />{t('kids.kidInfo', 'Kid Info')}</th>
                                    <th><Camera size={16} style={{ marginRight: '8px' }} />{t('kids.photo', 'Photo')}</th>
                                    <th>🎂 {t('kids.age', 'Age')}</th>
                                    <th><Car size={16} style={{ marginRight: '8px' }} />{t('kids.team', 'Team')}</th>
                                    <th><BarChart3 size={16} style={{ marginRight: '8px' }} />{t('kids.status', 'Status')}</th>
                                    <th>⚡ {t('kids.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="loading-cell">
                                            <div className="loading-content">
                                                <Clock className="loading-spinner" size={30} />
                                                {t('kids.loadingKids', 'Loading kids...')}
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredKids.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            <div className="empty-state">
                                                <Baby className="empty-icon" size={60} />
                                                <h3>{t('kids.noKidsFound', 'No kids found')}</h3>
                                                <p>
                                                    {userRole === 'parent'
                                                        ? t('kids.noKidsRegistered', 'No kids registered under your account')
                                                        : t('kids.adjustFilters', 'Try adjusting your search or filters')
                                                    }
                                                </p>
                                                {userRole === 'admin' && (
                                                    <button className="btn-primary" style={{ marginTop: '15px' }} onClick={handleAddKid}>
                                                        <Plus className="btn-icon" size={18} />
                                                        {t('kids.addFirstKid', 'Add First Kid')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredKids.map(kid => (
                                        <tr
                                            key={kid.id}
                                            className={`${kid.team === t('kids.noTeam', 'No Team') ? 'priority-row' : ''} clickable-row`}
                                            onClick={(e) => handleRowClick(kid, e)}
                                            style={{ cursor: 'pointer' }}
                                            title={t('kids.clickToView', 'Click to view details')}
                                        >
                                            <td>
                                                <div className="kid-info">
                                                    <div className="kid-name">
                                                        {kid.team === t('kids.noTeam', 'No Team') && <AlertTriangle className="priority-indicator" size={16} />}
                                                        {kid.name}
                                                    </div>
                                                    <div className="parent-name">👨‍👩‍👧‍👦 {kid.parentName}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="kid-photo-container">
                                                    {kid.hasPhoto ? (
                                                        <img
                                                            src={kid.photoUrl}
                                                            alt={kid.name}
                                                            className="table-kid-photo"
                                                        />
                                                    ) : (
                                                        <div className="table-kid-photo-placeholder">
                                                            {kid.initials}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{kid.age}</td>
                                            <td>
                                                <span className={`team-badge ${kid.team === t('kids.noTeam', 'No Team') ? 'no-team' : 'with-team'}`}>
                                                    {kid.team === t('kids.noTeam', 'No Team') ? (
                                                        <>
                                                            <AlertTriangle size={14} style={{ marginRight: '4px' }} />
                                                            {t('kids.noTeam', 'No Team')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Car size={14} style={{ marginRight: '4px' }} />
                                                            {getTeamNameById(kid.teamId)}
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${kid.status}`}>
                                                    {kid.status === 'active' && <Check size={14} style={{ marginRight: '4px' }} />}
                                                    {kid.status === 'completed' && <Check size={14} style={{ marginRight: '4px' }} />}
                                                    {kid.status === 'cancelled' && <XCircle size={14} style={{ marginRight: '4px' }} />}
                                                    {kid.status === 'pending' && <Clock size={14} style={{ marginRight: '4px' }} />}
                                                    {t(`status.${kid.status}`, kid.status.charAt(0).toUpperCase() + kid.status.slice(1))}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons-enhanced">
                                                    <button
                                                        className="btn-action view"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewKid(kid);
                                                        }}
                                                        title={t('kids.viewDetails', 'View Details')}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {(userRole === 'admin' || userRole === 'instructor') && (
                                                        <button
                                                            className={`btn-action ${kid.team === t('kids.noTeam', 'No Team') ? 'assign-team priority' : 'change-team'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleChangeTeam(kid);
                                                            }}
                                                            title={kid.team === t('kids.noTeam', 'No Team') ? t('kids.assignTeam', 'Assign Team') : t('kids.changeTeam', 'Change Team')}
                                                        >
                                                            {kid.team === t('kids.noTeam', 'No Team') ? <Plus size={16} /> : <Car size={16} />}
                                                        </button>
                                                    )}

                                                    {(userRole === 'admin' || userRole === 'instructor') && (
                                                        <button
                                                            className="btn-action edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditKid(kid);
                                                            }}
                                                            title={t('kids.editKid', 'Edit Kid')}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}

                                                    {userRole === 'admin' && (
                                                        <button
                                                            className="btn-action delete"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteKid(kid);
                                                            }}
                                                            title={t('kids.deleteKid', 'Delete Kid')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TEAM CHANGE MODAL - RENDER OUTSIDE DASHBOARD */}
                {selectedKidForTeamChange && (
                    <TeamChangeModal
                        kid={selectedKidForTeamChange}
                        isOpen={teamModalOpen && selectedKidForTeamChange !== null}
                        onClose={handleCloseTeamModal}
                        onTeamChanged={handleTeamChanged}
                    />
                )}

                {/* Export Kids Modal Component */}
                <ExportKidsModal
                    isOpen={exportModalOpen}
                    onClose={handleCloseExportModal}
                />
            </div>
        </Dashboard>
    );
};

export default KidsManagementPage;