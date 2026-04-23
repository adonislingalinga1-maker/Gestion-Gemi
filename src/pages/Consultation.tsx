import React, { useState } from 'react';
import { 
  Eye, 
  Stethoscope, 
  Activity, 
  FileText, 
  Save, 
  ChevronRight,
  Plus,
  History,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

const VA_OPTIONS = ['10/10', '9/10', '8/10', '7/10', '6/10', '5/10', '4/10', '3/10', '2/10', '1/10', 'PL+', 'PL-'];

export default function Consultation() {
  const [activeTab, setActiveTab] = useState<'va' | 'pio' | 'exam' | 'opinion'>('va');
  const [vaData, setVaData] = useState({ od: '10/10', os: '10/10' });
  const [pioData, setPioData] = useState({ od: 15, os: 15 });
  const [examTemplate, setExamTemplate] = useState('Normal');

  const templates = ['Normal', 'Glaucome', 'DMLA', 'Cataracte', 'Uvéite'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nouvelle Consultation</h1>
            <p className="text-slate-500 font-medium">Patient: <span className="text-blue-600">Robert Durand (ID: #4092)</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all">
            <History size={18} />
            Dernier Examen
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Save size={18} />
            Terminer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Rail */}
        <div className="lg:col-span-1 space-y-1">
          {[
            { id: 'va', name: 'Acuité Visuelle', icon: Eye },
            { id: 'pio', name: 'Tension (PIO)', icon: Activity },
            { id: 'exam', name: 'Lampe à fente & Fond', icon: Stethoscope },
            { id: 'opinion', name: 'Avis & Décision', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "text-slate-600 hover:bg-white hover:shadow-sm"
              )}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm tracking-wide">{item.name}</span>
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 min-h-[500px]">
          {activeTab === 'va' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Eye className="text-blue-600" /> Acuité Visuelle (Loin)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {['OD', 'OS'].map((eye) => (
                  <div key={eye} className="space-y-6">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Œil {eye}</p>
                    <div className="grid grid-cols-4 gap-3">
                      {VA_OPTIONS.map((val) => (
                        <button
                          key={val}
                          onClick={() => setVaData(prev => ({ ...prev, [eye.toLowerCase()]: val }))}
                          className={cn(
                            "py-3 rounded-xl border-2 font-bold text-sm transition-all",
                            (eye === 'OD' ? vaData.od : vaData.os) === val
                              ? "bg-blue-50 border-blue-600 text-blue-700"
                              : "border-slate-50 hover:border-slate-200 text-slate-500"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pio' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="text-blue-600" /> Pression Intra-Oculaire (mmHg)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {['OD', 'OS'].map((eye) => (
                  <div key={eye} className="space-y-6">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Œil {eye}</p>
                    <div className="flex items-center gap-6">
                      <input 
                        type="range" 
                        min="5" 
                        max="60" 
                        value={eye === 'OD' ? pioData.od : pioData.os}
                        onChange={(e) => setPioData(prev => ({ ...prev, [eye.toLowerCase()]: parseInt(e.target.value) }))}
                        className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className={cn(
                        "w-20 py-3 rounded-2xl flex items-center justify-center font-bold text-xl",
                        (eye === 'OD' ? pioData.od : pioData.os) > 21 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {eye === 'OD' ? pioData.od : pioData.os}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[10, 15, 18, 21, 24].map(v => (
                        <button 
                          key={v}
                          onClick={() => setPioData(prev => ({ ...prev, [eye.toLowerCase()]: v }))}
                          className="flex-1 py-2 rounded-lg bg-slate-50 text-slate-500 text-xs font-bold hover:bg-slate-100"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'exam' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Examen Biomicroscopique</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {templates.map(t => (
                    <button 
                      key={t}
                      onClick={() => setExamTemplate(t)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                        examTemplate === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-blue-50">
                  <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-sm">
                    <Zap size={16} /> Intelligent Auto-fill (Template: {examTemplate})
                  </div>
                  <textarea 
                    rows={6}
                    className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium leading-relaxed"
                    placeholder="Détails de l'examen..."
                    defaultValue={
                      examTemplate === 'Normal' ? "Segment antérieur : calme, cornée claire, CA profonde et optiquement vide. Cristallin : transparent. Fond d'œil : papille bien limitée, rosée, C/D 0.3. Macula et périphérie sans particularité." : 
                      examTemplate === 'Glaucome' ? "Segments antérieurs : calmes. Angles ouverts (Van Herick 4). Fond d'oeil : Excavation papillaire asymétrique. OD C/D 0.7, OS C/D 0.5. Anneau neurorétinien aminci en temporal inférieur." : ""
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opinion' && (
            <div className="space-y-10 animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-xl font-bold text-slate-900">Avis Médical Structuré</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'État', options: ['Stable', 'À surveiller', 'Critique'], colors: ['bg-green-500', 'bg-orange-500', 'bg-red-500'] },
                  { label: 'Évolution', options: ['Amélioration', 'Stable', 'Détérioration'], colors: ['bg-blue-500', 'bg-slate-500', 'bg-red-500'] },
                  { label: 'Risque', options: ['Faible', 'Moyen', 'Élevé'], colors: ['bg-green-500', 'bg-orange-500', 'bg-red-500'] },
                ].map((group) => (
                  <div key={group.label} className="space-y-4">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">{group.label}</p>
                    <div className="space-y-2">
                      {group.options.map((opt, i) => (
                        <button
                          key={opt}
                          className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                        >
                          <span className="font-bold text-slate-600 text-sm">{opt}</span>
                          <div className={cn("w-2 h-2 rounded-full", group.colors[i])} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button className="w-full py-5 rounded-[2rem] bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3">
                  <CheckCircle2 /> Finaliser et Générer Ordonnance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
