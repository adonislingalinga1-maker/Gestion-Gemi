import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Consultation from './pages/Consultation';
import Imaging from './pages/Imaging';
import Admin from './pages/Admin';
import { useProfile } from './hooks/useProfile';

// Simple placeholder page component
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
    <h2 className="text-xl font-bold mb-2">{title}</h2>
    <p>Ce module est en cours de développement.</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const { profile, loading: profileLoading } = useProfile();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Sync Profile
        const profileRef = doc(db, 'profiles', u.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          const role = u.email === 'adonislingalinga1@gmail.com' ? 'admin' : 'doctor';
          await setDoc(profileRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email?.split('@')[0],
            role: role,
            createdAt: serverTimestamp()
          });
        }
      }
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const loading = authLoading || profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    
    // Check if path is restricted and user profile has loaded
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return <Layout>{children}</Layout>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute allowedRoles={['admin', 'doctor', 'secretary', 'nurse']}><Patients /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute allowedRoles={['admin', 'doctor', 'secretary', 'nurse']}><Appointments /></ProtectedRoute>} />
        <Route path="/consultations" element={<ProtectedRoute allowedRoles={['admin', 'doctor']}><Consultation /></ProtectedRoute>} />
        <Route path="/imaging" element={<ProtectedRoute allowedRoles={['admin', 'doctor']}><Imaging /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
