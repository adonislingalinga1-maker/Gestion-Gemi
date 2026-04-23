import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Calendar, 
  Phone, 
  Mail, 
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
  UserPlus
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit, startAfter, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Patient } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M' as 'M' | 'F' | 'O',
    phone: '',
    email: '',
    idNumber: ''
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'patients'), orderBy('lastName'), limit(50));
      
      if (search) {
        // Simple search logic - in production better use Algolia or similar for Firestore
        q = query(
          collection(db, 'patients'), 
          where('lastName', '>=', search.toUpperCase()), 
          where('lastName', '<=', search.toUpperCase() + '\uf8ff'),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(results);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        lastName: formData.lastName.toUpperCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      });
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '',
        gender: 'M',
        phone: '',
        email: '',
        idNumber: ''
      });
      fetchPatients();
    } catch (error) {
      console.error("Error creating patient:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Patients</h1>
          <p className="text-slate-500">Gérez vos dossiers patients et l'historique médical.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus size={18} />
          Nouveau Patient
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-3 rounded-xl font-medium hover:bg-slate-100 transition-all">
            <Filter size={18} />
            Filtres
          </button>
          <button className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-3 rounded-xl font-medium hover:bg-slate-100 transition-all">
            <ArrowUpDown size={18} />
            Trier
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date de Naiss.</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Genre</th>
                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dernière Visite</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-8" /></td>
                    <td className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                    Aucun patient trouvé.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {patient.firstName[0]}{patient.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{patient.lastName} {patient.firstName}</p>
                          <p className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-tighter">ID: {patient.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          <span className="text-xs">{patient.phone || 'Non renseigné'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-xs truncate max-w-[150px]">{patient.email || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{patient.birthDate}</td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        patient.gender === 'M' ? "bg-blue-50 text-blue-600" : 
                        patient.gender === 'F' ? "bg-pink-50 text-pink-600" : 
                        "bg-slate-50 text-slate-600"
                      )}>
                        {patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : 'Autre'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-xs">
                          {patient.createdAt?.toDate ? format(patient.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-8 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Affichage de 1 à {patients.length} patients</p>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30" disabled>
              <ChevronLeft size={20} />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30" disabled>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* New Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nouveau Patient</h2>
                <p className="text-sm text-slate-500">Enregistrez un nouveau dossier médical.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 shadow-sm transition-colors"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePatient} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Prénom</label>
                  <input 
                    required
                    value={formData.firstName}
                    onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Nom</label>
                  <input 
                    required
                    value={formData.lastName}
                    onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="DUPONT"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Date de Naissance</label>
                  <input 
                    required
                    type="date"
                    value={formData.birthDate}
                    onChange={e => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Genre</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="O">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Téléphone</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="+225 01 02 03 04 05"
                  />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">E-mail</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Numéro d'Identité (Optionnel)</label>
                <input 
                  value={formData.idNumber}
                  onChange={e => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="ID 123 456 789"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Activity size={20} className="animate-spin" /> : <UserPlus size={20} />}
                  {isSubmitting ? 'Création en cours...' : 'Créer le dossier patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
