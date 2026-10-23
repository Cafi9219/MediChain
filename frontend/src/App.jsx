import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import VtopLanding from './components/VtopLanding.jsx';
import LoginModal from './components/LoginModal.jsx';
import DoctorRosterModal from './components/DoctorRosterModal.jsx';
import BlockchainExplorer from './components/BlockchainExplorer.jsx';
import CifvDashboard from './components/CifvDashboard.jsx';
import SropsDashboard from './components/SropsDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { fetchBlockchain, fetchDoctors } from './utils/api.js';

export default function App() {
  const [currentDept, setCurrentDept] = useState(null); // null, CIFV, SROPS, ADMIN
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedDeptForLogin, setSelectedDeptForLogin] = useState(null);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [blockHeight, setBlockHeight] = useState(1);

  useEffect(() => {
    loadConsortiumStatus();
    const interval = setInterval(loadConsortiumStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadConsortiumStatus() {
    try {
      const [bRes, dRes] = await Promise.all([
        fetchBlockchain('ADMIN'),
        fetchDoctors()
      ]);
      if (bRes.success) setBlockHeight(bRes.blockHeight);
      if (dRes.success) setDoctorsList(dRes.doctors);
    } catch (err) {
      console.error(err);
    }
  }

  function handleSelectDepartment(dept) {
    setSelectedDeptForLogin(dept);
    setLoginModalOpen(true);
  }

  function handleLoginSuccess(department) {
    setCurrentDept(department);
    loadConsortiumStatus();
  }

  function handleLogout() {
    setCurrentDept(null);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentDept={currentDept}
        onLogout={handleLogout}
        onOpenDoctors={() => setDoctorModalOpen(true)}
        onOpenExplorer={() => setExplorerOpen(true)}
        blockHeight={blockHeight}
      />

      {/* Main View Switching */}
      <div className="flex-1">
        {!currentDept && (
          <VtopLanding
            onSelectDepartment={handleSelectDepartment}
            onOpenExplorer={() => setExplorerOpen(true)}
            onOpenDoctors={() => setDoctorModalOpen(true)}
            blockHeight={blockHeight}
          />
        )}

        {currentDept && currentDept.role === 'CIFV' && (
          <CifvDashboard
            onOpenExplorer={() => setExplorerOpen(true)}
            onOpenDoctors={() => setDoctorModalOpen(true)}
          />
        )}

        {currentDept && currentDept.role === 'SROPS' && (
          <SropsDashboard
            onOpenExplorer={() => setExplorerOpen(true)}
            onOpenDoctors={() => setDoctorModalOpen(true)}
          />
        )}

        {currentDept && currentDept.role === 'ADMIN' && (
          <AdminDashboard
            onOpenExplorer={() => setExplorerOpen(true)}
            onOpenDoctors={() => setDoctorModalOpen(true)}
          />
        )}
      </div>

      {/* Login Modal with Captcha */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        selectedDept={selectedDeptForLogin}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 9 Specialists Directory Modal */}
      <DoctorRosterModal
        isOpen={doctorModalOpen}
        onClose={() => setDoctorModalOpen(false)}
        doctors={doctorsList}
      />

      {/* Blockchain Consortium Ledger Explorer Modal */}
      <BlockchainExplorer
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
      />
    </div>
  );
}
