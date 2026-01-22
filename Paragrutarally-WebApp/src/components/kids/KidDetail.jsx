// src/components/kids/KidDetail.jsx - READ-ONLY VIEW COMPONENT
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { usePermissions } from '../../hooks/usePermissions.jsx'; // FIXED: Removed extension
import ProtectedField from '../../hooks/protectedField.jsx'; // FIXED: Correct path
import {
    IconArrowLeft as ArrowLeft,
    IconEdit as Edit,
    IconUserCircle as UserCircle,
    IconMapPin as MapPin,
    IconUsers as Users,
    IconClock as Clock
} from '@tabler/icons-react';

function KidDetailView() {
    const { kidId } = useParams();
    const navigate = useNavigate();
    const { userRole, permissions, loading: permissionsLoading, error: permissionsError } = usePermissions();

    const [kidData, setKidData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKidData = async () => {
            // Wait for permissions to load
            if (permissionsLoading) {
                return;
            }

            if (!permissions) {
                setError('Permissions not available');
                setLoading(false);
                return;
            }

            try {
                const kidDoc = await getDoc(doc(db, 'kids', kidId));

                if (kidDoc.exists()) {
                    const data = kidDoc.data();

                    // Check if user can view this kid
                    if (!permissions.canViewKid(data)) {
                        setError('Access denied: You cannot view this kid\'s information');
                        setLoading(false);
                        return;
                    }

                    setKidData({ id: kidDoc.id, ...data });
                } else {
                    setError('Kid not found');
                }
            } catch (err) {
                console.error('💥 Error fetching kid:', err);
                setError('Failed to load kid details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchKidData();
    }, [kidId, permissions, permissionsLoading]);

    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age.toString();
    };

    const canEdit = () => {
        if (!permissions || !kidData) return false;

        // Check if user can edit this specific kid
        switch (userRole) {
            case 'admin':
                return true;
            case 'instructor':
                return kidData.instructorId === permissions.userData?.instructorId;
            case 'parent':
                return kidData.parentInfo?.parentId === permissions.user?.uid;
            default:
                return false;
        }
    };

    // Show permissions loading
    if (permissionsLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Clock className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading permissions...</p>
                </div>
            </div>
        );
    }

    // Show permissions error
    if (permissionsError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Permission Error</h3>
                    <p className="text-red-700 mb-4">{permissionsError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-sm font-medium"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Clock className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading kid details...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <div className="space-x-3">
                        <button
                            onClick={() => navigate('/admin/kids')}
                            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm font-medium"
                        >
                            Back to Kids
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-100 hover:bg-red-200 px-4 py-2 rounded text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!kidData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">No kid data available</p>
            </div>
        );
    }

    const fullName = `${kidData.personalInfo?.firstName || kidData.firstName || ''} ${kidData.personalInfo?.lastName || kidData.lastName || ''}`.trim();
    const age = calculateAge(kidData.personalInfo?.dateOfBirth || kidData.dateOfBirth);
    const gender = kidData.personalInfo?.gender || kidData.gender;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/admin/kids')}
                                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft size={20} className="mr-2" />
                                Back to Kids
                            </button>
                            <div className="border-l border-gray-300 h-6"></div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                    <UserCircle size={32} className="mr-3 text-indigo-600" />
                                    {fullName || 'Kid Details'}
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Viewing as: <span className="font-medium capitalize">{userRole}</span>
                                    {kidData.participantNumber && (
                                        <span className="ml-4">
                                            Participant #: <span className="font-medium">{kidData.participantNumber}</span>
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        {canEdit() && (
                            <button
                                onClick={() => navigate(`/admin/kids/edit/${kidId}`)}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                <Edit size={18} className="mr-2" />
                                Edit Kid
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="space-y-8">
                            {/* Basic Information */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <UserCircle size={20} className="mr-2 text-indigo-600" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <ProtectedField
                                        field="participantNumber"
                                        value={kidData.participantNumber}
                                        kidData={kidData}
                                        label="Participant Number"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="firstName"
                                        value={kidData.personalInfo?.firstName || kidData.firstName}
                                        kidData={kidData}
                                        label="First Name"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="lastName"
                                        value={kidData.personalInfo?.lastName || kidData.lastName}
                                        kidData={kidData}
                                        label="Last Name"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="personalInfo.dateOfBirth"
                                        value={kidData.personalInfo?.dateOfBirth || kidData.dateOfBirth}
                                        kidData={kidData}
                                        label="Date of Birth"
                                        disabled={true}
                                    />

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Age</label>
                                        <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border">
                                            {age} years old
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                                        <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border">
                                            {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : 'Not specified'}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Team</label>
                                        <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border">
                                            {kidData.teamId ? `Team ${kidData.teamId.slice(0, 8)}...` : 'No Team Assigned'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <MapPin size={20} className="mr-2 text-indigo-600" />
                                    Personal Information
                                </h3>
                                <div className="space-y-4">
                                    <ProtectedField
                                        field="personalInfo.address"
                                        value={kidData.personalInfo?.address || kidData.address}
                                        kidData={kidData}
                                        label="Address"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="personalInfo.capabilities"
                                        value={kidData.personalInfo?.capabilities}
                                        kidData={kidData}
                                        label="Capabilities & Challenges"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="personalInfo.announcersNotes"
                                        value={kidData.personalInfo?.announcersNotes}
                                        kidData={kidData}
                                        label="Announcer Notes"
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            {/* Parent Information */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Users size={20} className="mr-2 text-indigo-600" />
                                    Parent/Guardian Information
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <ProtectedField
                                        field="parentInfo.name"
                                        value={kidData.parentInfo?.name || kidData.guardianName}
                                        kidData={kidData}
                                        label="Parent/Guardian Name"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="parentInfo.email"
                                        value={kidData.parentInfo?.email || kidData.email}
                                        kidData={kidData}
                                        label="Parent Email"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="parentInfo.phone"
                                        value={kidData.parentInfo?.phone || kidData.contactNumber}
                                        kidData={kidData}
                                        label="Parent Phone"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="parentInfo.grandparentsInfo.names"
                                        value={kidData.parentInfo?.grandparentsInfo?.names}
                                        kidData={kidData}
                                        label="Grandparents Names"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="emergencyContact"
                                        value={kidData.emergencyContact}
                                        kidData={kidData}
                                        label="Emergency Contact"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="emergencyPhone"
                                        value={kidData.emergencyPhone}
                                        kidData={kidData}
                                        label="Emergency Phone"
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Comments</h3>
                                <div className="space-y-4">
                                    <ProtectedField
                                        field="comments.parent"
                                        value={kidData.comments?.parent}
                                        kidData={kidData}
                                        label="Parent Comments"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="comments.teamLeader"
                                        value={kidData.comments?.teamLeader}
                                        kidData={kidData}
                                        label="Team Leader Comments"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="comments.organization"
                                        value={kidData.comments?.organization}
                                        kidData={kidData}
                                        label="Organization Comments"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="comments.familyContact"
                                        value={kidData.comments?.familyContact}
                                        kidData={kidData}
                                        label="Family Contact Comments"
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                                <div className="space-y-4">
                                    <ProtectedField
                                        field="signedDeclaration"
                                        value={kidData.signedDeclaration}
                                        kidData={kidData}
                                        label="Signed Declaration"
                                        type="checkbox"
                                        disabled={true}
                                    />

                                    <ProtectedField
                                        field="notes"
                                        value={kidData.notes}
                                        kidData={kidData}
                                        label="General Notes"
                                        disabled={true}
                                    />

                                    {/* Status Information */}
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Form Status</label>
                                        <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                kidData.signedFormStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                    kidData.signedFormStatus === 'active' ? 'bg-blue-100 text-blue-800' :
                                                        kidData.signedFormStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                            }`}>
                                                {kidData.signedFormStatus?.charAt(0).toUpperCase() + kidData.signedFormStatus?.slice(1) || 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 sm:px-6">
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                {kidData.createdAt && (
                                    <span>Created: {new Date(kidData.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                )}
                                {kidData.updatedAt && (
                                    <span className="ml-4">
                                        Last Updated: {new Date(kidData.updatedAt.seconds * 1000).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="space-x-3">
                                <button
                                    onClick={() => navigate('/admin/kids')}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Back to Kids List
                                </button>
                                {canEdit() && (
                                    <button
                                        onClick={() => navigate(`/admin/kids/edit/${kidId}`)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <Edit size={16} className="mr-2" />
                                        Edit Kid
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default KidDetailView;
