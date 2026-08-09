import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';
import { getCurrentSessionUser, loginDemoRole, logoutUser } from '../services/firebase/authService';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentSessionUser());

  useEffect(() => {
    if (!user) {
      // Auto-initialize demo citizen session for frictionless hackathon navigation
      loginDemoRole('citizen').then(u => setUser(u));
    }
  }, []);

  const switchRole = async (newRole: UserRole) => {
    const u = await loginDemoRole(newRole);
    setUser(u);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const role = user ? user.role : 'citizen';

  return (
    <AuthContext.Provider value={{ user, role, switchRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
