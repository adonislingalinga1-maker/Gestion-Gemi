import React, { useState, useEffect } from 'react';
import { Camera, Search, Upload, Info, BrainCircuit, Activity, Save, User as UserIcon, FileText, Eye, ChevronDown, Plus, UserPlus, X, Calendar, Download } from 'lucide-react';
import { analyzeEyeScan } from '../services/aiService';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Patient, Consultation, MedicalOpinion } from '../types';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

export default function Imaging() {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  
  // Linkage fields
  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPatientResults, setShowPatientResults] = useState(false);

  // Consultation fields
  const [consultationId, setConsultationId] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [consultationResults, setConsultationResults] = useState<Consultation[]>([]);
  const [isSearchingConsultations, setIsSearchingConsultations] = useState(false);
  const [showConsultationResults, setShowConsultationResults] = useState(false);

  // New Patient Modal state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    gender: 'M' as 'M' | 'F' | 'O'
  });
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);

  const [eye, setEye] = useState<'OD' | 'OS' | 'OU'>('OU');
  const [scanType, setScanType] = useState<'OCT' | 'Fundus'>('OCT');
  const [isScanTypeAutoDetected, setIsScanTypeAutoDetected] = useState(true);
  const [storagePath, setStoragePath] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pastAnalyses, setPastAnalyses] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Diagnosis Link Modal
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [currentSavedImagingId, setCurrentSavedImagingId] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState<MedicalOpinion[]>([]);
  const [isFetchingDiagnoses, setIsFetchingDiagnoses] = useState(false);
  const [isCreatingDiagnosis, setIsCreatingDiagnosis] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState({
    state: 'Stable' as 'Stable' | 'À surveiller' | 'Critique',
    evolution: 'Stable' as 'Amélioration' | 'Stable' | 'Détérioration',
    riskLevel: 'Faible' as 'Faible' | 'Moyen' | 'Élevé',
    recommendation: '',
    notes: ''
  });

  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.length < 2) {
        setPatientResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const q = query(
          collection(db, 'patients'),
          where('lastName', '>=', patientSearch),
          where('lastName', '<=', patientSearch + '\uf8ff'),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        setPatientResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchPatients, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Fetch consultations for selected patient
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!patientId) {
        setConsultationResults([]);
        return;
      }
      setIsSearchingConsultations(true);
      try {
        const q = query(
          collection(db, 'consultations'),
          where('patientId', '==', patientId),
          orderBy('date', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consultation));
        setConsultationResults(results);
      } catch (error) {
        console.error("Consultation fetch failed:", error);
      } finally {
        setIsSearchingConsultations(false);
      }
    };

    fetchConsultations();
  }, [patientId]);

  // Fetch past analyses for selected patient
  useEffect(() => {
    const fetchHistory = async () => {
      if (!patientId) {
        setPastAnalyses([]);
        return;
      }
      setIsFetchingHistory(true);
      try {
        const q = query(
          collection(db, 'imaging'),
          where('patientId', '==', patientId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPastAnalyses(results);
      } catch (error) {
        console.error("History fetch failed:", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistory();
  }, [patientId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setAnalyzing(true);
    setSaveStatus('idle');
    // Strip base64 prefix
    const base64Data = image.split(',')[1];
    const analysis = await analyzeEyeScan(base64Data, scanType);
    setResult(analysis || "Aucune analyse disponible.");
    
    // Auto-populate fields based on AI findings
    if (analysis) {
      const upperText = analysis.toUpperCase();
      let typeFound = false;
      
      // Detect Eye
      if (upperText.includes('OD ') || upperText.includes('DROIT') || upperText.includes('RIGHT EYE')) {
        setEye('OD');
      } else if (upperText.includes('OS ') || upperText.includes('GAUCHE') || upperText.includes('LEFT EYE')) {
        setEye('OS');
      } else if (upperText.includes('OU ') || upperText.includes('BOTH EYES') || upperText.includes('LES DEUX')) {
        setEye('OU');
      }

      // Detect/Confirm Scan Type
      if (upperText.includes('OCT')) {
        setScanType('OCT');
        typeFound = true;
      } else if (upperText.includes('FUNDUS') || upperText.includes('FOND D\'OEIL')) {
        setScanType('Fundus');
        typeFound = true;
      }
      setIsScanTypeAutoDetected(typeFound);
    }

    setAnalyzing(false);
    return analysis;
  };

  const saveToPatientRecord = async (analysisResult?: string) => {
    const finalResult = analysisResult || result;
    if (!finalResult || !patientId) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      const docRef = await addDoc(collection(db, 'imaging'), {
        patientId,
        consultationId,
        type: scanType,
        eye,
        storagePath: storagePath || 'internal_base64_storage',
        analysisResult: { text: finalResult },
        uploadedBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      setSaveStatus('success');
      setCurrentSavedImagingId(docRef.id);
      
      // Update local history
      const newRecord = {
        id: docRef.id,
        patientId,
        consultationId,
        type: scanType,
        eye,
        storagePath: storagePath || 'internal_base64_storage',
        analysisResult: { text: finalResult },
        createdAt: { toDate: () => new Date() } // Mock for immediate update
      };
      setPastAnalyses(prev => [newRecord, ...prev]);
      
      return docRef;
    } catch (error) {
      console.error("Error saving imaging record:", error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeAndSave = async () => {
    const analysis = await startAnalysis();
    if (analysis) {
      await saveToPatientRecord(analysis);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPatient(true);
    try {
      const docRef = await addDoc(collection(db, 'patients'), {
        ...newPatientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      });
      
      const newPatient = { id: docRef.id, ...newPatientData } as any as Patient;
      setSelectedPatient(newPatient);
      setPatientId(docRef.id);
      setIsNewPatientModalOpen(false);
      setNewPatientData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        email: '',
        phone: '',
        gender: 'M'
      });
    } catch (error) {
      console.error("Error creating patient:", error);
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const fetchDiagnoses = async () => {
    if (!patientId) return;
    setIsFetchingDiagnoses(true);
    try {
      const q = query(
        collection(db, 'medical_opinions'),
        where('patientId', '==', patientId),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalOpinion));
      setDiagnoses(results);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
    } finally {
      setIsFetchingDiagnoses(false);
    }
  };

  const linkToDiagnosis = async (diagnosisId: string) => {
    if (!currentSavedImagingId) return;
    try {
      await updateDoc(doc(db, 'imaging', currentSavedImagingId), {
        diagnosisId,
        updatedAt: serverTimestamp()
      });
      setIsDiagnosisModalOpen(false);
      setSaveStatus('idle'); // Clear the status after linking
      alert("Imagerie associée au diagnostic avec succès !");
    } catch (error) {
      console.error("Error linking diagnosis:", error);
    }
  };

  const createAndLinkDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !currentSavedImagingId) return;
    setIsCreatingDiagnosis(true);
    try {
      const diagRef = await addDoc(collection(db, 'medical_opinions'), {
        ...diagnosisForm,
        patientId,
        consultationId: consultationId || 'NO_CONSULTATION', // Required in schema
        updatedAt: serverTimestamp()
      });
      
      await linkToDiagnosis(diagRef.id);
    } catch (error) {
      console.error("Error creating and linking diagnosis:", error);
    } finally {
      setIsCreatingDiagnosis(false);
    }
  };

  const generateReportPDF = () => {
    if (!result || !selectedPatient) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('OphthaGuard AI', 20, 20);
    doc.setFontSize(14);
    doc.text('Rapport d\'Analyse d\'Imagerie', 20, 30);
    
    // Patient Info Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU PATIENT', 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom: ${selectedPatient.lastName} ${selectedPatient.firstName}`, 20, 65);
    doc.text(`ID Patient: ${selectedPatient.id}`, 20, 70);
    doc.text(`Date de l'examen: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 75);
    
    // Scan Info
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS EXAMEN', 110, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Type de scan: ${scanType}`, 110, 65);
    doc.text(`Œil: ${eye}`, 110, 70);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(20, 85, pageWidth - 20, 85);
    
    // Analysis Results
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCLUSION DE L\'ASSISTANT IA', 20, 100);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Clean markdown for PDF
    const cleanText = result.replace(/[#*`]/g, '').trim();
    const splitResult = doc.splitTextToSize(cleanText, pageWidth - 40);
    doc.text(splitResult, 20, 110);
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Ce rapport est généré par IA et doit être validé par un ophtalmologiste qualifié.', 20, pageHeight - 20);
    doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy')} - OphthaGuard AI Clinique`, 20, pageHeight - 15);

    doc.save(`Rapport_Analyse_${selectedPatient.lastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nouveau Patient</h2>
                <p className="text-sm text-slate-500">Créer un dossier médical en quelques secondes.</p>
              </div>
              <button 
                onClick={() => setIsNewPatientModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePatient} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prénom</label>
                  <input 
                    required
                    value={newPatientData.firstName}
                    onChange={e => setNewPatientData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nom</label>
                  <input 
                    required
                    value={newPatientData.lastName}
                    onChange={e => setNewPatientData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="DUPONT"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date de Naissance</label>
                  <input 
                    required
                    type="date"
                    value={newPatientData.dateOfBirth}
                    onChange={e => setNewPatientData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Genre</label>
                  <select 
                    value={newPatientData.gender}
                    onChange={e => setNewPatientData(prev => ({ ...prev, gender: e.target.value as any }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="O">Autre</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Téléphone (Optionnel)</label>
                <input 
                  type="tel"
                  value={newPatientData.phone}
                  onChange={e => setNewPatientData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="+225 01 02 03 04 05"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isCreatingPatient}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingPatient ? <Activity size={20} className="animate-spin" /> : <UserPlus size={20} />}
                  {isCreatingPatient ? 'Création...' : 'Créer le dossier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyse d'Imagerie Assistée</h1>
          <p className="text-slate-500">Téléchargez vos scans OCT ou fond d'œil pour une analyse par IA.</p>
        </div>
        {saveStatus === 'success' && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold">
              Dossier mis à jour avec succès !
            </div>
            <button 
              onClick={generateReportPDF}
              className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={16} /> Rapport PDF
            </button>
            <button 
              onClick={() => {
                setIsDiagnosisModalOpen(true);
                fetchDiagnoses();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <Activity size={16} /> Associer au Diagnostic
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm shadow-blue-900/5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <UserIcon size={18} className="text-blue-600" /> Informations Patient
              </h3>
              <button 
                onClick={() => setIsNewPatientModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-colors"
              >
                <UserPlus size={14} /> Nouveau Patient
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sélectionner Patient</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      if (selectedPatient) {
                        setSelectedPatient(null);
                        setPatientId('');
                      }
                      setShowPatientResults(true);
                    }}
                    onFocus={() => setShowPatientResults(true)}
                    placeholder="Chercher par nom..."
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearching ? <Activity size={16} className="animate-spin" /> : <Search size={16} />}
                  </div>
                </div>

                {showPatientResults && patientResults.length > 0 && !selectedPatient && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-blue-900/10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {patientResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientId(p.id);
                          setShowPatientResults(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-slate-500">ID: {p.id.substring(0, 8)}...</p>
                        </div>
                        <Plus size={14} className="text-slate-300 group-hover:text-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation</label>
                <div className="relative">
                  <button
                    disabled={!patientId}
                    onClick={() => setShowConsultationResults(!showConsultationResults)}
                    className={cn(
                      "w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between transition-colors",
                      !patientId ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"
                    )}
                  >
                    <span className="truncate">
                      {selectedConsultation 
                        ? `Consultation du ${format(selectedConsultation.date.toDate(), 'dd/MM/yyyy')}` 
                        : "Sélectionner consultation"}
                    </span>
                    <ChevronDown size={16} className={cn("text-slate-400 transition-transform", showConsultationResults && "rotate-180")} />
                  </button>
                </div>

                {showConsultationResults && consultationResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-blue-900/10 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {consultationResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedConsultation(c);
                          setConsultationId(c.id);
                          setShowConsultationResults(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Le {format(c.date.toDate(), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-[10px] text-slate-500">ID: {c.id.substring(0, 8)}...</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showConsultationResults && consultationResults.length === 0 && !isSearchingConsultations && patientId && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-blue-900/10 p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Aucune consultation trouvée</p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Œil</label>
                <select 
                  value={eye}
                  onChange={(e) => setEye(e.target.value as any)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OD">OD (Droit)</option>
                  <option value="OS">OS (Gauche)</option>
                  <option value="OU">OU (Les deux)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                <select 
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as any)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OCT">OCT</option>
                  <option value="Fundus">Fond d'œil</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Path Storage</label>
                <input 
                  type="text" 
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  placeholder="/images/oct/..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 flex flex-col items-center justify-center min-h-[350px] border-dashed border-2 border-slate-200">
            {image ? (
              <div className="relative w-full h-full flex flex-col items-center">
                <img src={image} alt="Eye Scan" className="max-h-[250px] rounded-2xl shadow-md mb-6 object-cover" />
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button 
                    onClick={() => setImage(null)}
                    className="px-6 py-3 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Remplacer
                  </button>
                  <button 
                    onClick={handleAnalyzeAndSave}
                    disabled={analyzing || saving || !patientId}
                    className={cn(
                      "px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                      !patientId 
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                    )}
                  >
                    {(analyzing || saving) ? <Activity className="animate-spin" size={20} /> : <Save size={20} />}
                    {analyzing ? 'Analyse...' : saving ? 'Enregistrement...' : 'Analyser & Enregistrer'}
                  </button>
                  {!patientId && (
                    <p className="absolute -bottom-10 text-[10px] text-red-500 font-bold flex items-center gap-1 animate-pulse">
                      <Info size={12} /> Sélectionnez un patient pour enregistrer
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer group">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                  <Upload size={28} />
                </div>
                <p className="font-bold text-slate-900 mb-1">Upload Scans</p>
                <p className="text-slate-500 text-xs text-center px-8">Glissez-déposez l'image de l'examen ici</p>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BrainCircuit size={120} />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Info size={20} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Rapport d'Assistant IA</h2>
              </div>
              <div className="flex gap-2">
                {patientId && (
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all",
                      showHistory ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <FileText size={14} />
                    Historique ({pastAnalyses.length})
                  </button>
                )}
                {result && (
                  <button 
                    onClick={() => saveToPatientRecord()}
                    disabled={saving || !patientId}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all",
                      !patientId ? "bg-slate-800 text-slate-500" : "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {saving ? <Activity className="animate-spin" size={14} /> : <Save size={14} />}
                    Enregistrer au Dossier
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 bg-white/5 rounded-[2rem] p-6 border border-white/10 overflow-y-auto custom-scrollbar relative">
              {showHistory && (
                <div className="absolute inset-0 z-20 bg-slate-900 p-6 animate-in slide-in-from-right duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Historique des Analyses</h3>
                    <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {isFetchingHistory ? (
                      <div className="flex items-center justify-center py-12">
                        <Activity className="animate-spin text-blue-400" />
                      </div>
                    ) : pastAnalyses.length === 0 ? (
                      <p className="text-white/40 text-center py-12">Aucun historique trouvé pour ce patient.</p>
                    ) : (
                      pastAnalyses.map(analysis => (
                        <button
                          key={analysis.id}
                          onClick={() => {
                            setResult(analysis.analysisResult.text);
                            setEye(analysis.eye);
                            setScanType(analysis.type);
                            setShowHistory(false);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] p-4 text-left hover:bg-white/10 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {analysis.type} - {analysis.eye}
                            </span>
                            <span className="text-[10px] text-white/30">
                              {analysis.createdAt?.toDate ? format(analysis.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'Date inconnue'}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 line-clamp-2 italic">
                            {analysis.analysisResult.text.substring(0, 100)}...
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {!isScanTypeAutoDetected && result && (
                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                      <Search size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Type de Scan Incertain</p>
                      <p className="text-[10px] text-white/50 italic">IA n'a pas pu confirmer le type.</p>
                    </div>
                  </div>
                  <div className="flex bg-white/5 p-1 rounded-xl items-center">
                    <button 
                      onClick={() => { setScanType('OCT'); setIsScanTypeAutoDetected(true); }}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                        scanType === 'OCT' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      OCT
                    </button>
                    <button 
                      onClick={() => { setScanType('Fundus'); setIsScanTypeAutoDetected(true); }}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                        scanType === 'Fundus' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      Fundus
                    </button>
                  </div>
                </div>
              )}

              {!result && !analyzing && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8">
                  <Activity size={48} className="text-white/20" />
                  <p className="text-white/40 font-medium">En attente d'imagerie pour commencer l'analyse prédictive.</p>
                </div>
              )}

              {analyzing && (
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <BrainCircuit className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={32} />
                  </div>
                  <p className="text-blue-400 font-bold animate-pulse">Détection des biomarqueurs...</p>
                </div>
              )}

              {result && (
                <div className="prose prose-invert prose-blue max-w-none">
                  <Markdown>{result}</Markdown>
                </div>
              )}
            </div>

            {result && (
              <div className="mt-6 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white/30">
                <ShieldCheck size={14} /> Intelligence Artificielle Assistive - Validation Médicale Requise
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagnosis Link Modal */}
      {isDiagnosisModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Associer au Diagnostic</h2>
                <p className="text-sm text-slate-500">Lier l'analyse IA à une conclusion médicale.</p>
              </div>
              <button 
                onClick={() => setIsDiagnosisModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-slate-600 shadow-sm transition-colors"
                title="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Existing Diagnoses */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Diagnostics Récents</h3>
                {isFetchingDiagnoses ? (
                  <div className="py-12 flex justify-center">
                    <Activity className="animate-spin text-blue-500" />
                  </div>
                ) : diagnoses.length === 0 ? (
                  <p className="text-sm text-slate-400 italic px-1">Aucun diagnostic récent trouvé.</p>
                ) : (
                  <div className="space-y-3">
                    {diagnoses.map(diag => (
                      <button
                        key={diag.id}
                        onClick={() => linkToDiagnosis(diag.id)}
                        className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            diag.riskLevel === 'Élevé' ? "bg-red-50 text-red-600" :
                            diag.riskLevel === 'Moyen' ? "bg-orange-50 text-orange-600" :
                            "bg-green-50 text-green-600"
                          )}>
                            {diag.state}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {diag.updatedAt?.toDate ? format(diag.updatedAt.toDate(), 'dd/MM/yy') : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 italic mb-1 group-hover:text-slate-900">
                          {diag.recommendation || "Pas de recommandation"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Diagnosis */}
              <div className="space-y-4 border-l border-slate-100 pl-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nouveau Diagnostic</h3>
                <form onSubmit={createAndLinkDiagnosis} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">État</label>
                    <select 
                      value={diagnosisForm.state}
                      onChange={e => setDiagnosisForm(prev => ({ ...prev, state: e.target.value as any }))}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Stable">Stable</option>
                      <option value="À surveiller">À surveiller</option>
                      <option value="Critique">Critique</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Évolution</label>
                    <select 
                      value={diagnosisForm.evolution}
                      onChange={e => setDiagnosisForm(prev => ({ ...prev, evolution: e.target.value as any }))}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Amélioration">Amélioration</option>
                      <option value="Stable">Stable</option>
                      <option value="Détérioration">Détérioration</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Niveau de Risque</label>
                    <select 
                      value={diagnosisForm.riskLevel}
                      onChange={e => setDiagnosisForm(prev => ({ ...prev, riskLevel: e.target.value as any }))}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Faible">Faible</option>
                      <option value="Moyen">Moyen</option>
                      <option value="Élevé">Élevé</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Recommandation</label>
                    <textarea 
                      required
                      value={diagnosisForm.recommendation}
                      onChange={e => setDiagnosisForm(prev => ({ ...prev, recommendation: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      placeholder="Ex: Suivi à 6 mois..."
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isCreatingDiagnosis}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                  >
                    {isCreatingDiagnosis ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />}
                    Créer & Associer
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return <Info size={size} />;
}
