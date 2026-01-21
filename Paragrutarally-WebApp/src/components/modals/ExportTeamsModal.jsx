// src/components/modals/ExportTeamsModal.jsx - UPDATED WITH CLEAN MODAL STRUCTURE
import React, { useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
    IconX as X,
    IconDownload as Download,
    IconClock as Clock,
    IconUsers as Team,
    IconFilter as Filter,
    IconSettings as Settings,
    IconInfoCircle as InfoCircle
} from '@tabler/icons-react';

const ExportTeamsModal = ({ isOpen, onClose }) => {
    const { t, isRTL, currentLanguage } = useLanguage();
    const { userRole, userData, user } = usePermissions();
    const [exportOptions, setExportOptions] = useState({
        statusFilter: 'all',
        capacityFilter: 'all',
        includeBasicInfo: true,
        includeInstructorInfo: true,
        includeMemberInfo: true,
        includeCapacityInfo: true,
        includeTimestamps: true,
        includeKidsDetails: false
    });
    const [isExporting, setIsExporting] = useState(false);

    // Hebrew headers mapping
    const getHeaders = () => {
        const headers = [];

        if (currentLanguage === 'he') {
            if (exportOptions.includeBasicInfo) {
                headers.push('שם הצוות', 'תיאור', 'סטטוס');
            }

            if (exportOptions.includeInstructorInfo) {
                headers.push('מדריך ראשי', 'אימייל המדריך', 'טלפון המדריך', 'כל המדריכים');
            }

            if (exportOptions.includeCapacityInfo) {
                headers.push('חברים נוכחיים', 'קיבולת מקסימלית', 'מקומות פנויים', 'אחוז קיבולת');
            }

            if (exportOptions.includeMemberInfo) {
                headers.push('שמות חברים');
            }

            if (exportOptions.includeKidsDetails) {
                headers.push('פרטי ילדים');
            }

            if (exportOptions.includeTimestamps) {
                headers.push('נוצר בתאריך', 'עודכן בתאריך');
            }
        } else {
            if (exportOptions.includeBasicInfo) {
                headers.push(
                    t('exportTeams.teamName', 'Team Name'),
                    t('events.description', 'Description'),
                    t('teams.status', 'Status')
                );
            }

            if (exportOptions.includeInstructorInfo) {
                headers.push(
                    t('exportTeams.primaryInstructor', 'Primary Instructor'),
                    t('exportTeams.instructorEmail', 'Instructor Email'),
                    t('exportTeams.instructorPhone', 'Instructor Phone'),
                    t('exportTeams.allInstructors', 'All Instructors')
                );
            }

            if (exportOptions.includeCapacityInfo) {
                headers.push(
                    t('exportTeams.currentMembers', 'Current Members'),
                    t('exportTeams.maxCapacity', 'Max Capacity'),
                    t('teams.availableSpots', 'Available Spots'),
                    t('exportTeams.capacityPercentage', 'Capacity %')
                );
            }

            if (exportOptions.includeMemberInfo) {
                headers.push(t('exportTeams.memberNames', 'Member Names'));
            }

            if (exportOptions.includeKidsDetails) {
                headers.push(t('exportTeams.kidsDetails', 'Kids Details'));
            }

            if (exportOptions.includeTimestamps) {
                headers.push(t('users.createdAt', 'Created At'), t('exportEvents.updatedAt', 'Updated At'));
            }
        }

        return headers;
    };

    // Helper function to format CSV for RTL
    const formatCsvForRTL = (csvContent) => {
        if (currentLanguage !== 'he') return csvContent;

        // Add BOM for proper Hebrew encoding
        const BOM = '\uFEFF';
        return BOM + csvContent;
    };

    const handleExport = async () => {
        setIsExporting(true);

        try {
            // Get teams data
            const teamsQuery = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
            const teamsSnapshot = await getDocs(teamsQuery);

            // Get instructors data if needed
            let instructorsData = {};
            if (exportOptions.includeInstructorInfo) {
                const instructorsSnapshot = await getDocs(collection(db, 'instructors'));
                instructorsSnapshot.forEach((doc) => {
                    instructorsData[doc.id] = doc.data();
                });
            }

            // Get kids data if needed
            let kidsData = {};
            if (exportOptions.includeMemberInfo || exportOptions.includeKidsDetails) {
                const kidsSnapshot = await getDocs(collection(db, 'kids'));
                kidsSnapshot.forEach((doc) => {
                    kidsData[doc.id] = doc.data();
                });
            }

            const teams = [];

            teamsSnapshot.forEach((doc) => {
                const teamData = doc.data();

                // Apply status filter if selected
                const teamStatus = teamData.active !== false ? 'active' : 'inactive';
                if (exportOptions.statusFilter !== 'all' && teamStatus !== exportOptions.statusFilter) {
                    return;
                }

                // Calculate current members
                const currentMembers = teamData.kidIds ? teamData.kidIds.length : 0;
                const maxMembers = teamData.maxCapacity || 15;

                // Apply capacity filter if selected
                if (exportOptions.capacityFilter !== 'all') {
                    if (exportOptions.capacityFilter === 'empty' && currentMembers > 0) {
                        return;
                    }
                    if (exportOptions.capacityFilter === 'available' && currentMembers >= maxMembers) {
                        return;
                    }
                    if (exportOptions.capacityFilter === 'full' && currentMembers < maxMembers) {
                        return;
                    }
                }

                const team = {};

                // Include basic info if option is selected
                if (exportOptions.includeBasicInfo) {
                    team.teamName = teamData.name || '';
                    team.description = teamData.description || '';
                    team.status = teamStatus;
                }

                // Include instructor info if option is selected
                if (exportOptions.includeInstructorInfo) {
                    if (teamData.instructorIds && teamData.instructorIds.length > 0) {
                        const primaryInstructorId = teamData.teamLeaderId || teamData.instructorIds[0];
                        const instructor = instructorsData[primaryInstructorId];

                        if (instructor) {
                            team.instructorName = instructor.displayName || instructor.name || instructor.email || '';
                            team.instructorEmail = instructor.email || '';
                            team.instructorPhone = instructor.phone || '';
                        } else {
                            team.instructorName = t('teams.unknownInstructor', 'Unknown Instructor');
                            team.instructorEmail = '';
                            team.instructorPhone = '';
                        }

                        // Include all instructors if there are multiple
                        if (teamData.instructorIds.length > 1) {
                            const allInstructorNames = teamData.instructorIds
                                .map(id => {
                                    const inst = instructorsData[id];
                                    return inst ? (inst.displayName || inst.name || inst.email) : t('common.unknown', 'Unknown');
                                })
                                .join(', ');
                            team.allInstructors = allInstructorNames;
                        } else {
                            team.allInstructors = team.instructorName || '';
                        }
                    } else {
                        team.instructorName = t('teams.noInstructor', 'No Instructor');
                        team.instructorEmail = '';
                        team.instructorPhone = '';
                        team.allInstructors = t('teams.noInstructor', 'No Instructor');
                    }
                }

                // Include capacity info if option is selected
                if (exportOptions.includeCapacityInfo) {
                    team.currentMembers = currentMembers;
                    team.maxCapacity = maxMembers;
                    team.availableSpots = Math.max(0, maxMembers - currentMembers);
                    team.capacityPercentage = maxMembers > 0 ? Math.round((currentMembers / maxMembers) * 100) : 0;
                }

                // Include member info if option is selected
                if (exportOptions.includeMemberInfo) {
                    if (teamData.kidIds && teamData.kidIds.length > 0) {
                        const memberNames = teamData.kidIds
                            .map(kidId => {
                                const kid = kidsData[kidId];
                                if (kid && kid.personalInfo) {
                                    const firstName = kid.personalInfo.firstName || '';
                                    const lastName = kid.personalInfo.lastName || '';
                                    return `${firstName} ${lastName}`.trim() || kid.participantNumber || t('common.unknown', 'Unknown');
                                }
                                return t('common.unknown', 'Unknown');
                            })
                            .join(', ');
                        team.memberNames = memberNames;
                    } else {
                        team.memberNames = t('exportTeams.noMembers', 'No Members');
                    }
                }

                // Include detailed kids info if option is selected
                if (exportOptions.includeKidsDetails && teamData.kidIds && teamData.kidIds.length > 0) {
                    const kidsDetails = teamData.kidIds
                        .map(kidId => {
                            const kid = kidsData[kidId];
                            if (kid) {
                                const firstName = kid.personalInfo?.firstName || '';
                                const lastName = kid.personalInfo?.lastName || '';
                                const parentName = kid.parentInfo?.name || '';
                                const age = kid.personalInfo?.dateOfBirth ?
                                    new Date().getFullYear() - new Date(kid.personalInfo.dateOfBirth).getFullYear() : '';

                                return `${firstName} ${lastName} (${t('exportTeams.age', 'Age')}: ${age}, ${t('exportTeams.parent', 'Parent')}: ${parentName})`.trim();
                            }
                            return t('exportTeams.unknownKid', 'Unknown Kid');
                        })
                        .join(' | ');
                    team.kidsDetails = kidsDetails;
                }

                // Include timestamps if option is selected
                if (exportOptions.includeTimestamps) {
                    team.createdAt = teamData.createdAt?.toDate?.()
                        ? teamData.createdAt.toDate().toLocaleDateString() + ' ' + teamData.createdAt.toDate().toLocaleTimeString()
                        : '';
                    team.updatedAt = teamData.updatedAt?.toDate?.()
                        ? teamData.updatedAt.toDate().toLocaleDateString() + ' ' + teamData.updatedAt.toDate().toLocaleTimeString()
                        : '';
                }

                teams.push(team);
            });

            // Create CSV content with proper headers
            const headers = getHeaders();
            let csvContent = headers.join(',') + '\n';

            teams.forEach(team => {
                const row = [];

                if (exportOptions.includeBasicInfo) {
                    row.push(
                        `"${team.teamName || ''}"`,
                        `"${team.description || ''}"`,
                        `"${team.status || ''}"`
                    );
                }

                if (exportOptions.includeInstructorInfo) {
                    row.push(
                        `"${team.instructorName || ''}"`,
                        `"${team.instructorEmail || ''}"`,
                        `"${team.instructorPhone || ''}"`,
                        `"${team.allInstructors || ''}"`
                    );
                }

                if (exportOptions.includeCapacityInfo) {
                    row.push(
                        `"${team.currentMembers || 0}"`,
                        `"${team.maxCapacity || 0}"`,
                        `"${team.availableSpots || 0}"`,
                        `"${team.capacityPercentage || 0}%"`
                    );
                }

                if (exportOptions.includeMemberInfo) {
                    row.push(`"${team.memberNames || ''}"`);
                }

                if (exportOptions.includeKidsDetails) {
                    row.push(`"${team.kidsDetails || ''}"`);
                }

                if (exportOptions.includeTimestamps) {
                    row.push(`"${team.createdAt || ''}"`, `"${team.updatedAt || ''}"`);
                }

                csvContent += row.join(',') + '\n';
            });

            // Format for RTL if Hebrew
            csvContent = formatCsvForRTL(csvContent);

            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const statusFilter = exportOptions.statusFilter === 'all' ? 'all' : exportOptions.statusFilter;
            const capacityFilter = exportOptions.capacityFilter === 'all' ? 'all' : exportOptions.capacityFilter;
            const langSuffix = currentLanguage === 'he' ? '_he' : '';
            const filename = `teams_export_${statusFilter}_${capacityFilter}_${timestamp}${langSuffix}.csv`;

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            onClose();
        } catch (error) {
            console.error('Error exporting teams:', error);
            alert(t('exportTeams.exportError', 'Failed to export teams. Please try again.'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            setExportOptions({
                statusFilter: 'all',
                capacityFilter: 'all',
                includeBasicInfo: true,
                includeInstructorInfo: true,
                includeMemberInfo: true,
                includeCapacityInfo: true,
                includeTimestamps: true,
                includeKidsDetails: false
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="form-creation-modal-overlay" dir={isRTL ? 'rtl' : 'ltr'}>
            <div
                className="form-creation-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="export-teams-modal-title"
            >
                <div className="form-creation-modal-header">
                    <h3 id="export-teams-modal-title">
                        <Team size={24} />
                        {t('teams.exportTeams', 'Export Teams')}
                    </h3>
                    <button
                        className="form-creation-modal-close"
                        onClick={handleClose}
                        disabled={isExporting}
                        type="button"
                        aria-label={t('common.close', 'Close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="form-creation-modal-body">
                    {/* Filter Options */}
                    <div className="form-section">
                        <h4>
                            <Filter size={18} />
                            {t('exportTeams.filterOptions', 'Filter Options')}
                        </h4>

                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="statusFilter">
                                    {t('exportTeams.filterByStatus', 'Filter by Status')}
                                </label>
                                <select
                                    id="statusFilter"
                                    value={exportOptions.statusFilter}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        statusFilter: e.target.value
                                    }))}
                                    disabled={isExporting}
                                    className="form-select"
                                >
                                    <option value="all">{t('teams.allTeams', 'All Teams')}</option>
                                    <option value="active">{t('teams.active', 'Active')}</option>
                                    <option value="inactive">{t('teams.inactive', 'Inactive')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="capacityFilter">
                                    {t('exportTeams.filterByCapacity', 'Filter by Capacity')}
                                </label>
                                <select
                                    id="capacityFilter"
                                    value={exportOptions.capacityFilter}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        capacityFilter: e.target.value
                                    }))}
                                    disabled={isExporting}
                                    className="form-select"
                                >
                                    <option value="all">{t('teams.allTeams', 'All Teams')}</option>
                                    <option value="empty">{t('teams.emptyTeams', 'Empty Teams')}</option>
                                    <option value="available">{t('teams.availableSpots', 'Teams with Available Spots')}</option>
                                    <option value="full">{t('teams.fullTeams', 'Full Teams')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="form-section">
                        <h4>
                            <Settings size={18} />
                            {t('exportTeams.dataToInclude', 'Data to Include')}
                        </h4>

                        <div className="target-users-grid">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeBasicInfo}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeBasicInfo: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                <Team size={16} style={{ marginRight: isRTL ? '0' : '4px', marginLeft: isRTL ? '4px' : '0' }} />
                                {t('exportTeams.includeBasicInfo', 'Include basic information (name, description, status)')}
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeInstructorInfo}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeInstructorInfo: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                👨‍🏫 {t('exportTeams.includeInstructorInfo', 'Include instructor information')}
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeCapacityInfo}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeCapacityInfo: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                📊 {t('exportTeams.includeCapacityInfo', 'Include capacity and member count')}
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeMemberInfo}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeMemberInfo: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                👥 {t('exportTeams.includeMemberInfo', 'Include member names list')}
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeKidsDetails}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeKidsDetails: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                🎯 {t('exportTeams.includeKidsDetails', 'Include detailed kids information (age, parent)')}
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={exportOptions.includeTimestamps}
                                    onChange={(e) => setExportOptions(prev => ({
                                        ...prev,
                                        includeTimestamps: e.target.checked
                                    }))}
                                    disabled={isExporting}
                                />
                                ⏰ {t('import.includeTimestamp', 'Include Created At and Updated At timestamps')}
                            </label>
                        </div>
                    </div>

                    {/* User Role Notices */}
                    <div className="form-section">
                        <h4>
                            <InfoCircle size={18} />
                            {t('exportTeams.notices', 'Important Notices')}
                        </h4>

                        {userRole === 'instructor' && (
                            <div className="info-alert">
                                👨‍🏫 {t('exportTeams.instructorExportNotice', 'You can export all teams data based on your instructor permissions.')}
                            </div>
                        )}

                        {currentLanguage === 'he' && (
                            <div className="info-alert">
                                🌐 {t('export.hebrewNotice', 'הקובץ יוצא עם כותרות בעברית ותמיכה ב-RTL')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-creation-modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClose}
                        disabled={isExporting}
                    >
                        {t('general.cancel', 'Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <div className="loading-spinner-mini" aria-hidden="true"></div>
                                {t('users.exporting', 'Exporting...')}
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                {t('users.exportToCsv', 'Export to CSV')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportTeamsModal;