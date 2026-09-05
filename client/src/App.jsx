import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import { Navbar, Sidebar } from './components/NavComponents.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { PatientsView } from './views/PatientsView.jsx';
import { PatientProfileView } from './views/PatientProfileView.jsx';
import { AddPatientModal } from './views/AddPatientModal.jsx';
import { UploadReportView } from './views/UploadReportView.jsx';
import { DualPaneReviewView } from './views/DualPaneReviewView.jsx';
import { AISummaryView, ReportCompareView } from './views/SummaryAndCompareViews.jsx';
import { PatientTimelineView, ConflictResolveModal } from './views/TimelineAndConflictViews.jsx';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('medlens_theme') || 'dark');
  const [activeView, setActiveView] = useState(() => localStorage.getItem('medlens_active_view') || 'dashboard');

  // Application Data State
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(() => localStorage.getItem('medlens_selected_patient_id') || '');
  const [selectedReportId, setSelectedReportId] = useState(() => localStorage.getItem('medlens_selected_report_id') || '');
  const [allReports, setAllReports] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Auth User State
  const [activeUser, setActiveUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // Modal States
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [editPatientData, setEditPatientData] = useState(null);
  const [conflictModalData, setConflictModalData] = useState(null);

  // Mobile Navigation Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');


  // Initial Data Load
  const loadInitialData = async () => {
    try {
      // 1. Load active user & users
      const userData = await api.getCurrentUser();
      setActiveUser(userData.user);
      const usersList = await api.getUsers();
      setAllUsers(usersList.users || []);

      // 2. Load patients
      const patData = await api.getPatients();
      const patientList = patData.patients || [];
      setPatients(patientList);

      if (patientList.length > 0) {
        // Resolve target patient: saved in localStorage or default to first patient
        const savedPatId = localStorage.getItem('medlens_selected_patient_id');
        const targetPatient = patientList.find(p => p.id === savedPatId) || patientList[0];
        const activePatId = targetPatient.id;

        setSelectedPatientId(activePatId);
        localStorage.setItem('medlens_selected_patient_id', activePatId);

        // Load persisted reports for active patient
        const repData = await api.getReports(activePatId);
        const reportList = repData.reports || [];
        setAllReports(reportList);

        // Resolve target report: saved in localStorage or default to latest report for this patient
        const savedRepId = localStorage.getItem('medlens_selected_report_id');
        const targetReport = reportList.find(r => r.id === savedRepId) || reportList[0];

        if (targetReport) {
          setSelectedReportId(targetReport.id);
          localStorage.setItem('medlens_selected_report_id', targetReport.id);
        } else {
          setSelectedReportId('');
          localStorage.removeItem('medlens_selected_report_id');
        }

        // Load timeline for active patient
        const timeData = await api.getTimeline(activePatId);
        setTimeline(timeData.timeline || []);
      }
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update theme on root & persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('medlens_theme', theme);
  }, [theme]);

  // Navigation handler with persistence
  const handleNavigate = (view) => {
    setActiveView(view);
    localStorage.setItem('medlens_active_view', view);
  };

  // Handle switching active patient with persistence
  const handleSelectPatient = async (patientId) => {
    if (!patientId) return;
    setSelectedPatientId(patientId);
    localStorage.setItem('medlens_selected_patient_id', patientId);

    try {
      const repData = await api.getReports(patientId);
      const reportList = repData.reports || [];
      setAllReports(reportList);

      if (reportList.length > 0) {
        setSelectedReportId(reportList[0].id);
        localStorage.setItem('medlens_selected_report_id', reportList[0].id);
      } else {
        setSelectedReportId('');
        localStorage.removeItem('medlens_selected_report_id');
      }

      const timeData = await api.getTimeline(patientId);
      setTimeline(timeData.timeline || []);
    } catch (err) {
      console.error('Error selecting patient:', err);
    }
  };

  // Reload patient and report list
  const refreshData = async () => {
    try {
      const patData = await api.getPatients();
      const patientList = patData.patients || [];
      setPatients(patientList);

      const currentPatId = selectedPatientId || localStorage.getItem('medlens_selected_patient_id');
      if (currentPatId) {
        const repData = await api.getReports(currentPatId);
        const reportList = repData.reports || [];
        setAllReports(reportList);

        const currentRepId = selectedReportId || localStorage.getItem('medlens_selected_report_id');
        if (currentRepId && reportList.some(r => r.id === currentRepId)) {
          setSelectedReportId(currentRepId);
        } else if (reportList.length > 0) {
          setSelectedReportId(reportList[0].id);
          localStorage.setItem('medlens_selected_report_id', reportList[0].id);
        } else {
          setSelectedReportId('');
          localStorage.removeItem('medlens_selected_report_id');
        }

        const timeData = await api.getTimeline(currentPatId);
        setTimeline(timeData.timeline || []);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Save patient (create or edit)
  const handleSavePatient = async (patientData, editId = null) => {
    if (editId) {
      await api.updatePatient(editId, patientData);
    } else {
      const res = await api.createPatient(patientData);
      setSelectedPatientId(res.patient.id);
      localStorage.setItem('medlens_selected_patient_id', res.patient.id);
    }
    await refreshData();
  };

  // Delete patient
  const handleDeletePatient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this patient dossier? This will remove all associated reports and history permanently.')) {
      return;
    }
    await api.deletePatient(id);
    if (selectedPatientId === id) {
      const remaining = patients.filter(p => p.id !== id);
      const nextPatId = remaining[0]?.id || '';
      setSelectedPatientId(nextPatId);
      if (nextPatId) {
        localStorage.setItem('medlens_selected_patient_id', nextPatId);
      } else {
        localStorage.removeItem('medlens_selected_patient_id');
      }
    }
    await refreshData();
  };

  // On upload success
  const handleUploadSuccess = async (reportId, patientId) => {
    setSelectedReportId(reportId);
    localStorage.setItem('medlens_selected_report_id', reportId);

    setSelectedPatientId(patientId);
    localStorage.setItem('medlens_selected_patient_id', patientId);

    const repData = await api.getReports(patientId);
    setAllReports(repData.reports || []);

    const patData = await api.getPatients();
    setPatients(patData.patients || []);

    const timeData = await api.getTimeline(patientId);
    setTimeline(timeData.timeline || []);

    handleNavigate('review');
  };

  // Switch clinician user
  const handleSwitchUser = async (userId) => {
    try {
      const res = await api.loginUser(userId);
      setActiveUser(res.user);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const pendingCount = patients.reduce((acc, p) => acc + (p.hasUnverifiedReports ? 1 : 0), 0);

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={handleNavigate}
        pendingCount={pendingCount}
        selectedPatient={selectedPatient}
        hasActiveReport={Boolean(selectedReportId)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Container */}
      <div className="main-content">
        {/* Top Navbar */}
        <Navbar
          theme={theme}
          setTheme={setTheme}
          activeUser={activeUser}
          allUsers={allUsers}
          onSwitchUser={handleSwitchUser}
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={handleSelectPatient}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          pendingReviewCount={pendingCount}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />


        {/* Content Body based on active view */}
        <main className="content-body">
          {activeView === 'dashboard' && (
            <DashboardView
              patients={patients}
              reports={allReports}
              selectedPatient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onOpenAddPatient={() => { setEditPatientData(null); setIsAddPatientOpen(true); }}
              onOpenUpload={() => handleNavigate('upload')}
              onNavigate={handleNavigate}
              timeline={timeline}
            />
          )}

          {activeView === 'patients' && (
            <PatientsView
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onOpenAddPatient={() => { setEditPatientData(null); setIsAddPatientOpen(true); }}
              onEditPatient={(p) => { setEditPatientData(p); setIsAddPatientOpen(true); }}
              onDeletePatient={handleDeletePatient}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'patient-profile' && (
            <PatientProfileView
              patient={selectedPatient}
              reports={allReports}
              onOpenUpload={() => handleNavigate('upload')}
              onOpenEdit={() => { setEditPatientData(selectedPatient); setIsAddPatientOpen(true); }}
              onOpenReportReview={(repId) => {
                setSelectedReportId(repId);
                localStorage.setItem('medlens_selected_report_id', repId);
                handleNavigate('review');
              }}
              onOpenSummary={(repId) => {
                setSelectedReportId(repId);
                localStorage.setItem('medlens_selected_report_id', repId);
                handleNavigate('summary');
              }}
              onOpenCompare={() => handleNavigate('compare')}
              onNavigate={handleNavigate}
            />
          )}

          {activeView === 'upload' && (
            <UploadReportView
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
              onUploadSuccess={handleUploadSuccess}
            />
          )}

          {activeView === 'review' && (
            <DualPaneReviewView
              reportId={selectedReportId || allReports[0]?.id}
              onNavigateToSummary={(repId) => {
                setSelectedReportId(repId);
                localStorage.setItem('medlens_selected_report_id', repId);
                handleNavigate('summary');
              }}
              onResolveConflict={(repId, conflict) => setConflictModalData({ reportId: repId, conflict })}
            />
          )}

          {activeView === 'summary' && (
            <AISummaryView
              reportId={selectedReportId || allReports[0]?.id}
              onNavigateToReview={(repId) => {
                setSelectedReportId(repId);
                localStorage.setItem('medlens_selected_report_id', repId);
                handleNavigate('review');
              }}
              onOpenCompare={() => handleNavigate('compare')}
            />
          )}

          {activeView === 'compare' && (
            <ReportCompareView
              patient={selectedPatient}
              reports={allReports}
              onNavigateToReview={(repId) => {
                setSelectedReportId(repId);
                localStorage.setItem('medlens_selected_report_id', repId);
                handleNavigate('review');
              }}
            />
          )}

          {activeView === 'timeline' && (
            <PatientTimelineView
              patient={selectedPatient}
              patients={patients}
              onSelectPatient={handleSelectPatient}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Patient Modal */}
      <AddPatientModal
        isOpen={isAddPatientOpen}
        onClose={() => { setIsAddPatientOpen(false); setEditPatientData(null); }}
        onSave={handleSavePatient}
        editPatient={editPatientData}
      />

      {/* Conflict Resolution Dialog Modal */}
      <ConflictResolveModal
        isOpen={Boolean(conflictModalData)}
        onClose={() => setConflictModalData(null)}
        reportId={conflictModalData?.reportId}
        conflict={conflictModalData?.conflict}
        onResolved={refreshData}
      />
    </div>
  );
}
