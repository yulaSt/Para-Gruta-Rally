// src/App.jsx - Updated with Role-Based Redirect Handler and Forms Routes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PermissionProvider } from './hooks/usePermissions.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary';

// Import the role redirect handler
import RoleRedirectHandler from './components/routing/RoleRedirectHandler.jsx';

// Import the enhanced protected route components
import ProtectedRoute, {
    RequireAuth,
    RequireAdmin,
    RequireInstructorOnly,
    RequireParent,
    RequireHost,
    RequireAnyRole
} from './components/routing/ProtectedRoute.jsx';

// Import pages
import Login from './components/auth/Login';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import EventManagementPage from './pages/admin/EventManagementPage';
import CreateEventPage from './pages/admin/CreateEventPage';
import ViewEventsPage from './pages/admin/ViewEventsPage';
import EditEventPage from './pages/admin/EditEventPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import FormsManagementPage from './pages/admin/FormsManagementPage';
import FormSubmissionsPage from './pages/admin/FormSubmissionsPage';
import BackupSyncPage from './pages/admin/BackupSyncPage';
import ExportPage from './pages/admin/ExportPage.jsx';
import AnalyticsDashboardPage from './pages/admin/AnalyticsDashboardPage';

// Admin Kids Management
import KidsManagementPage from './pages/admin/KidsManagementPage';
import AddKidPage from './pages/admin/AddKidPage';
import EditKidPage from './pages/admin/EditKidPage';
import ViewKidPage from './pages/admin/ViewKidPage';

// Admin Teams Management
import TeamsManagementPage from './pages/admin/TeamsManagementPage';
import AddTeamPage from './pages/admin/AddTeamPage';
import EditTeamPage from './pages/admin/EditTeamPage';
import ViewTeamPage from './pages/admin/ViewTeamPage';

// Admin Vehicles Management
import VehiclesPage from './pages/admin/VehiclesPage';
import ViewVehiclePage from './pages/admin/ViewVehiclePage';
import AddVehiclePage from './pages/admin/AddVehiclePage';
import EditVehiclePage from './pages/admin/EditVehiclePage';

// Instructor pages
import InstructorDashboardPage from './pages/instructor/InstructorDashboardPage';
import InstructorKidsManagementPage from './pages/instructor/InstructorKidsManagementPage';
import InstructorTeamsManagementPage from './pages/instructor/InstructorTeamsManagementPage';
import InstructorVehiclesPage from './pages/instructor/InstructorVehiclesPage';
import InstructorEventsPage from './pages/instructor/InstructorEventsPage';
import InstructorFormsPage from './pages/instructor/InstructorFormsPage';

// Parent pages
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import ParentKidDetailPage from './pages/parent/ParentKidDetailPage';
import ParentEventPage from './pages/parent/ParentEventPage.jsx';
import MyFormsPage from './pages/parent/MyFormsPage';

// Host pages
import HostDashboardPage from './pages/host/HostDashboardPage';

// Shared pages
import GalleryPage from './pages/shared/GalleryPage';
import MyAccountPage from './pages/shared/MyAccountPage';

// Permission-aware components
import KidDetailView from './components/kids/KidDetail.jsx';

// Import styles
import './styles/theme.css';
import './App.css';

// Import legal pages
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';


function App() {
    return (
        <ErrorBoundary>
            <LanguageProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <PermissionProvider>
                            <Router>
                                <RoleRedirectHandler>
                                    <div className="App">
                                        <Routes>
                                            {/* ========================================
                                               PUBLIC ROUTES
                                               ======================================== */}
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/forgot-password" element={<Login />} />
                                            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                                            <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                                            {/* ========================================
                                               ADMIN ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/admin/dashboard"
                                                element={
                                                    <RequireAdmin>
                                                        <AdminDashboardPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Events Management */}
                                            <Route
                                                path="/admin/events"
                                                element={
                                                    <RequireAdmin>
                                                        <EventManagementPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/events/create"
                                                element={
                                                    <RequireAdmin>
                                                        <CreateEventPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/events/view/:eventId"
                                                element={
                                                    <RequireAdmin>
                                                        <ViewEventsPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/events/edit/:eventId"
                                                element={
                                                    <RequireAdmin>
                                                        <EditEventPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Users Management */}
                                            <Route
                                                path="/admin/users"
                                                element={
                                                    <RequireAdmin>
                                                        <UserManagementPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Kids Management */}
                                            <Route
                                                path="/admin/kids"
                                                element={
                                                    <RequireAdmin>
                                                        <KidsManagementPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/kids/add"
                                                element={
                                                    <RequireAdmin>
                                                        <AddKidPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/kids/view/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <ViewKidPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/kids/edit/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <EditKidPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Teams Management */}
                                            <Route
                                                path="/admin/teams"
                                                element={
                                                    <RequireAdmin>
                                                        <TeamsManagementPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/teams/add"
                                                element={
                                                    <RequireAdmin>
                                                        <AddTeamPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/teams/view/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <ViewTeamPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/teams/edit/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <EditTeamPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Vehicles Management */}
                                            <Route
                                                path="/admin/vehicles"
                                                element={
                                                    <RequireAdmin>
                                                        <VehiclesPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/vehicles/add"
                                                element={
                                                    <RequireAdmin>
                                                        <AddVehiclePage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/vehicles/view/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <ViewVehiclePage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/vehicles/edit/:id"
                                                element={
                                                    <RequireAdmin>
                                                        <EditVehiclePage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* ========================================
                                               ADMIN FORMS MANAGEMENT ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/admin/forms"
                                                element={
                                                    <RequireAdmin>
                                                        <FormsManagementPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/forms/submissions"
                                                element={
                                                    <RequireAdmin>
                                                        <FormSubmissionsPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/forms/:formId/submissions"
                                                element={
                                                    <RequireAdmin>
                                                        <FormSubmissionsPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* Admin Other Management */}
                                            <Route
                                                path="/admin/backup"
                                                element={
                                                    <RequireAdmin>
                                                        <BackupSyncPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/export"
                                                element={
                                                    <RequireAdmin>
                                                        <ExportPage />
                                                    </RequireAdmin>
                                                }
                                            />
                                            <Route
                                                path="/admin/analytics"
                                                element={
                                                    <RequireAdmin>
                                                        <AnalyticsDashboardPage />
                                                    </RequireAdmin>
                                                }
                                            />

                                            {/* ========================================
                                               INSTRUCTOR ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/instructor/dashboard"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorDashboardPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* Instructor Events */}
                                            <Route
                                                path="/instructor/events"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorEventsPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* Instructor Forms */}
                                            <Route
                                                path="/instructor/forms"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorFormsPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* Instructor Kids Management */}
                                            <Route
                                                path="/instructor/kids"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorKidsManagementPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/kids/view/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <ViewKidPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/kids/edit/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <EditKidPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* Instructor Teams Management */}
                                            <Route
                                                path="/instructor/teams"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorTeamsManagementPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/teams/view/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <ViewTeamPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/teams/edit/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <EditTeamPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* Instructor Vehicles Management */}
                                            <Route
                                                path="/instructor/vehicles"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <InstructorVehiclesPage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/vehicles/view/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <ViewVehiclePage />
                                                    </RequireInstructorOnly>
                                                }
                                            />
                                            <Route
                                                path="/instructor/vehicles/edit/:id"
                                                element={
                                                    <RequireInstructorOnly>
                                                        <EditVehiclePage />
                                                    </RequireInstructorOnly>
                                                }
                                            />

                                            {/* ========================================
                                               PARENT ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/parent/dashboard"
                                                element={
                                                    <RequireParent>
                                                        <ParentDashboardPage />
                                                    </RequireParent>
                                                }
                                            />
                                            <Route
                                                path="/parent/kid/:id"
                                                element={
                                                    <RequireParent>
                                                        <ParentKidDetailPage />
                                                    </RequireParent>
                                                }
                                            />
                                            <Route
                                                path="/parent/events"
                                                element={
                                                    <RequireParent>
                                                        <ParentEventPage />
                                                    </RequireParent>
                                                }
                                            />

                                            {/* ========================================
                                               PARENT FORMS ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/parent/forms"
                                                element={
                                                    <RequireParent>
                                                        <MyFormsPage />
                                                    </RequireParent>
                                                }
                                            />

                                            {/* ========================================
                                               HOST/GUEST ROUTES
                                               ======================================== */}
                                            <Route
                                                path="/host/dashboard"
                                                element={
                                                    <RequireHost>
                                                        <HostDashboardPage />
                                                    </RequireHost>
                                                }
                                            />
                                            <Route
                                                path="/host/events"
                                                element={
                                                    <RequireHost>
                                                        <HostDashboardPage />
                                                    </RequireHost>
                                                }
                                            />

                                            {/* ========================================
                                               SHARED ROUTES (Accessible to all authenticated users)
                                               ======================================== */}

                                            {/* My Account - accessible to all authenticated users */}
                                            <Route
                                                path="/my-account"
                                                element={
                                                    <RequireAuth>
                                                        <MyAccountPage />
                                                    </RequireAuth>
                                                }
                                            />

                                            {/* Gallery - accessible to all authenticated users */}
                                            <Route
                                                path="/gallery"
                                                element={
                                                    <RequireAuth>
                                                        <GalleryPage />
                                                    </RequireAuth>
                                                }
                                            />
                                            <Route
                                                path="/gallery/:eventId"
                                                element={
                                                    <RequireAuth>
                                                        <GalleryPage />
                                                    </RequireAuth>
                                                }
                                            />

                                            {/* Permission-aware kid detail route - uses smart permissions */}
                                            <Route
                                                path="/kid/:kidId"
                                                element={
                                                    <RequireAuth>
                                                        <KidDetailView />
                                                    </RequireAuth>
                                                }
                                            />

                                            {/* ========================================
                                               FLEXIBLE MULTI-ROLE ROUTES
                                               For routes that need multiple role access
                                               ======================================== */}

                                            {/* Kids can be viewed by admin, instructor (for their kids), or parent (for their kids) */}
                                            <Route
                                                path="/kids/view/:id"
                                                element={
                                                    <RequireAnyRole roles={['admin', 'instructor', 'parent']}>
                                                        <ViewKidPage />
                                                    </RequireAnyRole>
                                                }
                                            />

                                            {/* Teams can be viewed by admin, instructor, or parent */}
                                            <Route
                                                path="/teams/view/:id"
                                                element={
                                                    <RequireAnyRole roles={['admin', 'instructor', 'parent']}>
                                                        <ViewTeamPage />
                                                    </RequireAnyRole>
                                                }
                                            />

                                            {/* Vehicles can be viewed by admin, instructor */}
                                            <Route
                                                path="/vehicles/view/:id"
                                                element={
                                                    <RequireAnyRole roles={['admin', 'instructor']}>
                                                        <ViewVehiclePage />
                                                    </RequireAnyRole>
                                                }
                                            />

                                            {/* ========================================
                                               DEFAULT REDIRECTS & 404
                                               ======================================== */}

                                            {/* Legacy dashboard redirect - now handled by RoleRedirectHandler */}
                                            <Route
                                                path="/dashboard"
                                                element={
                                                    <RequireAuth>
                                                        <Navigate to="/admin/dashboard" replace />
                                                    </RequireAuth>
                                                }
                                            />

                                            {/* Root redirect */}
                                            <Route path="/" element={<Navigate to="/login" replace />} />

                                            {/* 404 - redirect to login for now, could be enhanced with a proper 404 page */}
                                            <Route path="*" element={<Navigate to="/login" replace />} />
                                        </Routes>
                                    </div>
                                </RoleRedirectHandler>
                            </Router>
                        </PermissionProvider>
                    </AuthProvider>
                </ThemeProvider>
            </LanguageProvider>
        </ErrorBoundary>
    );
}

export default App;