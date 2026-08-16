import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/common/Header';

import { CitizenHome } from './components/citizen/CitizenHome';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { VolunteerDashboard } from './components/volunteer/VolunteerDashboard';
import { LoginScreen } from './components/citizen/LoginScreen';
import { OnboardingFlow } from './components/citizen/OnboardingFlow';
import { subscribeToAuth } from './services/firebase/authService';
import type { UserProfile } from './types';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<'citizen' | 'admin' | 'volunteer'>('citizen');
  const [demoScenario, setDemoScenario] = useState<'HINDI_VOICE' | 'EMERGENCY' | 'SCHEME_CHECK' | 'HUMAN_SUPPORT' | undefined>(undefined);

  
  // Navigation states
  const [authStatus, setAuthStatus] = useState<'LOADING' | 'UNAUTHENTICATED' | 'ONBOARDING' | 'AUTHENTICATED'>('LOADING');
  const [sessionUser, setSessionUser] = useState<UserProfile | null>(null);

  // Subscribe to real Firebase Auth changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((profile: any) => {
      setSessionUser(profile);
      if (!profile) {
        setAuthStatus('UNAUTHENTICATED');
      } else {
        // Read onboardingCompleted from Firestore document model
        if (profile.onboardingCompleted) {
          setAuthStatus('AUTHENTICATED');
        } else {
          setAuthStatus('ONBOARDING');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (profile: any) => {
    setSessionUser(profile);
    if (profile.onboardingCompleted) {
      setAuthStatus('AUTHENTICATED');
    } else {
      setAuthStatus('ONBOARDING');
    }
  };

  const handleOnboardingComplete = (updatedProfile: UserProfile) => {
    setSessionUser(updatedProfile);
    setAuthStatus('AUTHENTICATED');
  };

  if (authStatus === 'LOADING') {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-body)',
        color: 'var(--primary)',
        fontWeight: 700,
        fontSize: '1.2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-pulse" style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', margin: '0 auto 16px' }}></div>
          Loading Sehat Setu...
        </div>
      </div>
    );
  }

  if (authStatus === 'UNAUTHENTICATED') {
    return (
      <div className="app-container">
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={async () => {
            // Set guest session status using standard loginAnonymous service
            try {
              const { loginAnonymous } = await import('./services/firebase/authService');
              const guestProfile = await loginAnonymous();
              setSessionUser(guestProfile);
            } catch (e) {}
            setAuthStatus('AUTHENTICATED');
          }}
        />
      </div>
    );
  }

  if (authStatus === 'ONBOARDING' && sessionUser) {
    return (
      <div className="app-container">
        <OnboardingFlow 
          userProfile={sessionUser}
          onOnboardingComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header 
        currentTab={currentTab} 
        onTabChange={(tab) => { setCurrentTab(tab); setDemoScenario(undefined); }} 
        onOpenLogin={() => {
          setAuthStatus('UNAUTHENTICATED');
        }}
      />

      {/* Main Tab Content */}
      <main className="main-content">
        {currentTab === 'citizen' && (
          <CitizenHome 
            initialDemoScenario={demoScenario} 
            key={demoScenario || 'default'} 
            onAuthRequired={() => {
              // Open login screen
              setAuthStatus('UNAUTHENTICATED');
            }}
          />
        )}
        {currentTab === 'admin' && <AdminDashboard />}
        {currentTab === 'volunteer' && <VolunteerDashboard />}
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
