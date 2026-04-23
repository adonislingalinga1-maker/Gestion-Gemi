import React from 'react';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';

const data = [
  { name: 'Lun', patients: 40, risk: 24 },
  { name: 'Mar', patients: 30, risk: 13 },
  { name: 'Mer', patients: 20, risk: 98 },
  { name: 'Jeu', patients: 27, risk: 39 },
  { name: 'Ven', patients: 18, risk: 48 },
  { name: 'Sam', patients: 23, risk: 38 },
];

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-blue-900/5">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          trend > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
          <p className="text-slate-500">Aperçu en temps réel de votre clinique AI-assistée.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Plus size={18} />
            Nouveau Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Patients Total" value="1,284" icon={Users} color="bg-blue-500" trend={12} />
        <StatCard title="Consultations" value="48" icon={Activity} color="bg-indigo-500" trend={5} />
        <StatCard title="Haut Risque (AI)" value="12" icon={AlertTriangle} color="bg-red-500" trend={-2} />
        <StatCard title="RDV du jour" value="24" icon={Calendar} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm shadow-blue-900/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-900">Activité de la Clinique</h2>
            <select className="bg-slate-50 border-none text-sm font-semibold text-slate-600 px-4 py-2 rounded-xl">
              <option>7 Derniers Jours</option>
              <option>Ce Mois</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm shadow-blue-900/5 overflow-hidden flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Alertes de Risque IA</h2>
          <div className="flex-1 space-y-6">
            {[
              { name: 'Patient #492', risk: 'Glaucome Possible', level: 'Élevé', time: '12m' },
              { name: 'Patient #832', risk: 'DMLA Détectée', level: 'Moyen', time: '45m' },
              { name: 'Patient #122', risk: 'RDV Manqué', level: 'Faible', time: '2h' },
            ].map((alert, i) => (
              <div key={i} className="flex gap-4 group cursor-pointer hover:translate-x-1 transition-transform">
                <div className={cn(
                  "w-2 h-12 rounded-full",
                  alert.level === 'Élevé' ? 'bg-red-500' : alert.level === 'Moyen' ? 'bg-orange-500' : 'bg-blue-500'
                )} />
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{alert.name}</p>
                  <p className="text-xs text-slate-500 mb-1">{alert.risk}</p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{alert.time}</span>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500" />
              </div>
            ))}
          </div>
          <button className="mt-8 w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors">
            Voir toutes les alertes
          </button>
        </div>
      </div>
    </div>
  );
}
