import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/common/Header';
import { DemoBanner } from './components/common/DemoBanner';
import { CitizenHome } from './components/citizen/CitizenHome';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { WhatsAppDemoView } from './components/whatsapp/WhatsAppDemoView';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<'citizen' | 'admin' | 'volunteer' | 'whatsapp'>('citizen');
  const [demoScenario, setDemoScenario] = useState<'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT' | undefined>(undefined);
  const { setLanguage } = useLanguage();

  const handleRunDemoScenario = (scenario: 'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT') => {
    setDemoScenario(scenario);
    setCurrentTab('citizen');
    
    // Programmatically align application language to match target scenario
    if (scenario === 'HINDI_VOICE') {
      setLanguage('hi');
    } else {
      setLanguage('en');
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header currentTab={currentTab} onTabChange={(tab) => { setCurrentTab(tab); setDemoScenario(undefined); }} />

      {/* One-Click Hackathon Demo Scenario Banner */}
      <DemoBanner onRunDemoScenario={handleRunDemoScenario} />

      {/* Main Tab Content */}
      <main className="main-content">
        {currentTab === 'citizen' && <CitizenHome initialDemoScenario={demoScenario} key={demoScenario || 'default'} />}
        {currentTab === 'admin' && <AdminDashboard />}
        {currentTab === 'volunteer' && <VolunteerDashboard />}
        {currentTab === 'whatsapp' && <WhatsAppDemoView />}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px 0',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginTop: '32px'
      }}>
        <p><strong>SEHAT SETU</strong> — Multilingual Voice-First Healthcare Access Platform for India</p>
        <p style={{ marginTop: '2px' }}>"Healthcare access should not depend on knowing where to look." • Route, Don't Diagnose.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
