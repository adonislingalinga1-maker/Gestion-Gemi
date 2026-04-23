import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  X,
  Search,
  Check,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, where, addDoc, serverTimestamp, updateDoc, doc, limit } from 'firebase/firestore';
import { Patient, Appointment, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Appointments() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Doctors & Filters
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [isSendingSMS, setIsSendingSMS] = useState<string | null>(null);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    type: 'Consultation Standard',
    notes: '',
    doctorId: ''
  });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      let q = query(
        collection(db, 'appointments'),
        where('startTime', '>=', start),
        where('startTime', '<=', end),
        orderBy('startTime', 'asc')
      );

      if (filterDoctorId !== 'all') {
        q = query(q, where('doctorId', '==', filterDoctorId));
      }
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() 
      } as any as Appointment));
      setAppointments(results);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, filterDoctorId]);

  // Fetch Doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const q = query(collection(db, 'profiles'), where('role', '==', 'doctor'));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setDoctors(results);
      } catch (error) {
        console.error("Error fetching doctors:", error);
      }
    };
    fetchDoctors();
  }, []);

  // Patient Search Logic
  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.length < 2) {
        setPatientResults([]);
        return;
      }
      setIsSearchingPatients(true);
      try {
        const q = query(
          collection(db, 'patients'),
          where('lastName', '>=', patientSearch.toUpperCase()),
          where('lastName', '<=', patientSearch.toUpperCase() + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        setPatientResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearchingPatients(false);
      }
    };

    const timer = setTimeout(searchPatients, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    setIsSubmitting(true);
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      await addDoc(collection(db, 'appointments'), {
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientPhone: selectedPatient.phone,
        doctorId: formData.doctorId,
        doctorName: doctors.find(d => d.uid === formData.doctorId)?.displayName || 'Non assigné',
        startTime,
        type: formData.type,
        status: 'scheduled',
        notes: formData.notes,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        type: 'Consultation Standard',
        notes: '',
        doctorId: ''
      });
      fetchAppointments();
    } catch (error) {
      console.error("Error creating appointment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchAppointments();
    } catch (error) {
      console.error("Error updating appointment status:", error);
    }
  };

  const simulateSMSSending = (appt: any) => {
    setIsSendingSMS(appt.id);
    // Simulate API call to SMS gateway
    setTimeout(() => {
      alert(`SMS de confirmation envoyé à ${appt.patientName} (${appt.patientPhone || 'Mobile: +225 01 02 03 04 05'})\n\nContenu: "Bonjour ${appt.patientName}, votre rdv avec le Dr. ${appt.doctorName} est confirmé pour le ${format(appt.startTime, 'dd/MM')} à ${format(appt.startTime, 'HH:mm')}."`);
      setIsSendingSMS(null);
      updateDoc(doc(db, 'appointments', appt.id), {
        status: 'confirmed',
        smsSentAt: serverTimestamp()
      }).then(() => fetchAppointments());
    }, 1500);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { locale: fr }),
    end: endOfWeek(endOfMonth(currentDate), { locale: fr }),
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda & Rendez-vous</h1>
          <p className="text-slate-500">Gérez le calendrier de la clinique et les disponibilités.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Filter */}
          <div className="relative">
            <select 
              value={filterDoctorId}
              onChange={(e) => setFilterDoctorId(e.target.value)}
              className="appearance-none bg-white border border-slate-100 rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les Docteurs</option>
              {doctors.map(doc => (
                <option key={doc.uid} value={doc.uid}>Dr. {doc.displayName}</option>
              ))}
            </select>
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl flex items-center p-1 shadow-sm">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <span className="px-4 font-bold text-slate-900 min-w-[140px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </span>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            Réserver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendar View */}
        <div className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-50">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {daysInMonth.map((day, i) => {
              const dayAppts = appointments.filter(a => isSameDay(a.startTime, day));
              return (
                <div 
                  key={i} 
                  className={cn(
                    "min-h-[120px] p-3 border-b border-r border-slate-50 transition-colors",
                    !isSameMonth(day, currentDate) && "bg-slate-50/30",
                    isSameDay(day, new Date()) && "bg-blue-50/30"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-sm font-bold",
                      isSameDay(day, new Date()) ? "text-blue-600" : "text-slate-600",
                      !isSameMonth(day, currentDate) && "text-slate-300"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayAppts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayAppts.slice(0, 3).map((appt: any) => (
                      <div 
                        key={appt.id} 
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold truncate",
                          appt.status === 'completed' ? "bg-green-50 text-green-600" :
                          appt.status === 'cancelled' ? "bg-red-50 text-red-400" :
                          "bg-blue-50 text-blue-600"
                        )}
                      >
                        {format(appt.startTime, 'HH:mm')} - {appt.patientName}
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[10px] text-slate-400 font-bold pl-2">+{dayAppts.length - 3} de plus</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">À l'agenda aujourd'hui</h3>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              {appointments.filter(a => isSameDay(a.startTime, currentDate)).length}
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {appointments.filter(a => isSameDay(a.startTime, currentDate)).length === 0 ? (
              <div className="py-12 text-center">
                <CalendarIcon size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 text-sm italic">Aucun rendez-vous prévu pour cette date.</p>
              </div>
            ) : (
              appointments.filter(a => isSameDay(a.startTime, currentDate)).map((appt: any) => (
                <div key={appt.id} className="relative pl-6 border-l-2 border-blue-100 pb-2">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <div className="flex items-start justify-between group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">{format(appt.startTime, 'HH:mm')}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                          appt.status === 'completed' ? "bg-green-100 text-green-700" :
                          appt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {appt.status}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">{appt.patientName}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium tracking-wide">
                        <Activity size={10} /> {appt.type}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => simulateSMSSending(appt)}
                        disabled={isSendingSMS === appt.id}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          appt.smsSentAt ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500 hover:bg-blue-100"
                        )}
                        title="Envoyer confirmation SMS"
                      >
                        {isSendingSMS === appt.id ? <Activity size={14} className="animate-spin" /> : <Smartphone size={14} />}
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(appt.id, 'completed')}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(appt.id, 'cancelled')}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Vue d'ensemble rapide</h4>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Terminés</span>
              <span className="font-bold text-green-600">{appointments.filter(a => a.status === 'completed' && isSameDay(a.startTime, currentDate)).length}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600 mt-2">
              <span>Annulés</span>
              <span className="font-bold text-red-500">{appointments.filter(a => a.status === 'cancelled' && isSameDay(a.startTime, currentDate)).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Prendre Rendez-vous</h2>
                <p className="text-sm text-slate-500">Planifiez une nouvelle consultation.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 shadow-sm transition-colors"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-8 space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Chercher Patient</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      if (selectedPatient) setSelectedPatient(null);
                      setShowPatientResults(true);
                    }}
                    onFocus={() => setShowPatientResults(true)}
                    placeholder="Tapez le nom du patient..."
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearchingPatients ? <Activity size={16} className="animate-spin" /> : <Search size={16} />}
                  </div>
                </div>

                {showPatientResults && patientResults.length > 0 && !selectedPatient && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-blue-900/10 overflow-hidden py-2">
                    {patientResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowPatientResults(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">ID: {p.id.substring(0, 8)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Médecin Assigne</label>
                <select 
                  required
                  value={formData.doctorId}
                  onChange={e => setFormData(prev => ({ ...prev, doctorId: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un docteur</option>
                  {doctors.map(doc => (
                    <option key={doc.uid} value={doc.uid}>Dr. {doc.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Heure</label>
                  <input 
                    type="time"
                    required
                    value={formData.time}
                    onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Type de Consultation</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option>Consultation Standard</option>
                  <option>Examen de la Vue</option>
                  <option>Suivi Glaucome</option>
                  <option>Injection Intra-vitréenne (IVT)</option>
                  <option>Cataracte - Pré-opératoire</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Notes / Raison</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Notes optionnelles..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting || !selectedPatient}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Activity size={20} className="animate-spin" /> : <CalendarIcon size={20} />}
                  {isSubmitting ? 'Confirmation...' : 'Confirmer le rendez-vous'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
