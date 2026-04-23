import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { Shield, User as UserIcon, Check, ShieldAlert, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useProfile } from '../hooks/useProfile';

export default function Admin() {
  const { profile: currentProfile } = useProfile();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const initialDoctors = [
    { name: 'Dr. Bamba', email: 'bamba@ophthaguard.ai' },
    { name: 'Pr. Ouattara', email: 'ouattara@ophthaguard.ai' },
    { name: 'Pr. Fanny', email: 'fanny@ophthaguard.ai' },
    { name: 'Pr. Coulibaly', email: 'coulibaly@ophthaguard.ai' },
    { name: 'Dr. Kone Adama', email: 'kone.adama@ophthaguard.ai' },
    { name: 'Dr. Kone Nabakan', email: 'kone.nabakan@ophthaguard.ai' },
    { name: 'Dr. Kone Doman', email: 'kone.doman@ophthaguard.ai' },
    { name: 'Dr. Coulibaly Mohamed', email: 'coulibaly.mohamed@ophthaguard.ai' },
    { name: 'Dr. Kone Pkatchenin', email: 'kone.pkatchenin@ophthaguard.ai' },
  ];

  const seedDoctors = async () => {
    setIsSeeding(true);
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      for (const docInfo of initialDoctors) {
        const docId = `staff_${docInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'profiles', docId), {
          uid: docId,
          displayName: docInfo.name,
          email: docInfo.email,
          role: 'doctor',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      await fetchProfiles();
      alert("Liste des médecins initialisée avec succès !");
    } catch (error) {
      console.error("Error seeding doctors:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'profiles'), orderBy('email'));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setProfiles(results);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProfile?.role === 'admin') {
      fetchProfiles();
    }
  }, [currentProfile]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, 'profiles', uid), {
        role: newRole,
        updatedAt: new Date()
      });
      setProfiles(prev => prev.map(p => p.uid === uid ? { ...p, role: newRole } : p));
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (currentProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <ShieldAlert size={48} className="mb-4 text-red-400" />
        <h2 className="text-xl font-bold mb-2">Accès Refusé</h2>
        <p>Seuls les administrateurs peuvent accéder à ce module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administration & Accès</h1>
          <p className="text-slate-500">Gérez les rôles et les permissions des membres du personnel.</p>
        </div>
        <button 
          onClick={seedDoctors}
          disabled={isSeeding}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
        >
          {isSeeding ? <Activity size={18} className="animate-spin" /> : <Plus size={18} />}
          Initialiser Liste Médecins
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Utilisateur</th>
              <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rôle Actuel</th>
              <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date d'inscription</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Modifier Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                  <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                  <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-48 ml-auto" /></td>
                </tr>
              ))
            ) : (
              profiles.map((p) => (
                <tr key={p.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                        <UserIcon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.displayName}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      p.role === 'admin' ? "bg-red-50 text-red-600" :
                      p.role === 'doctor' ? "bg-blue-50 text-blue-600" :
                      "bg-green-50 text-green-600"
                    )}>
                      {p.role}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-600">
                    {p.createdAt?.toDate ? format(p.createdAt.toDate(), 'dd MMM yyyy') : 'N/A'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(['admin', 'doctor', 'secretary', 'nurse'] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRoleChange(p.uid, role)}
                          disabled={updatingId === p.uid || p.role === role}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                            p.role === role 
                              ? "bg-slate-900 text-white cursor-default" 
                              : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                          )}
                        >
                          {updatingId === p.uid ? <Activity size={12} className="animate-spin" /> : role}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
