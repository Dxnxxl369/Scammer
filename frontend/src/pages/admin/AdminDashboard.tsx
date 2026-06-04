import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/DashboardLayout'
import { adminService } from '../../services/adminService'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { Estadisticas } from '../../services/adminService'
import { Users, Shield, Activity, Search, Loader2 } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  colorClass?: string
}

function StatCard({ label, value, icon, colorClass = "text-[var(--text-main)]" }: StatCardProps) {
  return (
    <div className="cyber-card p-8 border-white/5 group hover:border-[var(--accent)] transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-xl bg-white/5 ${colorClass}`}>
          {icon}
        </div>
        <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{label.replace(' ', '_').toUpperCase()}</span>
      </div>
      <p className={`text-4xl font-black italic ${colorClass}`}>{value}</p>
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Estadisticas | null>(null)
  const [cargando, setCargando] = useState(true)

  // Escuchar actualización de presencia desde el túnel unificado
  useEffect(() => {
    const handlePresence = (e: any) => {
        setStats(prev => {
            if (!prev) return null;
            const diff = e.detail.esta_online ? 1 : -1;
            return {
                ...prev,
                en_linea: Math.max(0, prev.en_linea + diff)
            };
        });
    }

    window.addEventListener('presence_change', handlePresence);
    return () => window.removeEventListener('presence_change', handlePresence);
  }, [])

  useEffect(() => {
    adminService.estadisticas().then((data) => {
      setStats(data)
      setCargando(false)
    })
  }, [])

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <h2 className="text-5xl font-black italic uppercase text-[var(--text-main)] tracking-tighter">Admin_<span className="accent-text">Control</span></h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2">Panel de Mando Centralizado</p>
          </div>
          <div className="flex items-center gap-4 bg-cyan-400/10 border border-cyan-400/20 px-6 py-3 rounded-full">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest font-mono">Status: Secure_Node_Online</span>
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
            <p className="text-[var(--accent)] text-[10px] font-black tracking-[0.5em] uppercase">Sincronizando Datos...</p>
          </div>
        ) : stats ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <StatCard label="Total Agentes" value={stats.total_usuarios} icon={<Users size={24} />} colorClass="text-cyan-400" />
              <StatCard label="Agentes Online" value={stats.en_linea || 0} icon={<Activity size={24} />} colorClass="text-emerald-400" />
              <StatCard label="Suscripciones Activas" value={stats.plan_pro + stats.plan_starter + stats.plan_elite} icon={<Shield size={24} />} colorClass="text-[var(--accent)]" />
              <StatCard label="Usuarios Bloqueados" value={stats.bloqueados} icon={<Activity size={24} />} colorClass="text-red-500" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-6 cyber-card border-[var(--border-color)]">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-2 italic tracking-widest">Plan_Gratis</p>
                <p className="text-2xl font-black text-[var(--text-main)]">{stats.plan_gratis}</p>
              </div>
              <div className="p-6 cyber-card border-[var(--border-color)]">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase mb-2 italic tracking-widest">Plan_Starter</p>
                <p className="text-2xl font-black text-[var(--text-main)]">{stats.plan_starter}</p>
              </div>
              <div className="p-6 cyber-card border-[var(--accent)]/30 bg-[var(--accent)]/5">
                <p className="text-[8px] font-black text-[var(--accent)] uppercase mb-2 italic tracking-widest">Plan_Pro</p>
                <p className="text-2xl font-black text-[var(--text-main)]">{stats.plan_pro}</p>
              </div>
              <div className="p-6 cyber-card border-cyan-400/30 bg-cyan-400/5">
                <p className="text-[8px] font-black text-cyan-400 uppercase mb-2 italic tracking-widest">Plan_Elite</p>
                <p className="text-2xl font-black text-[var(--text-main)]">{stats.plan_elite}</p>
              </div>
            </div>

            <div className="cyber-card p-12 text-center border-dashed border-[var(--border-color)]">
              <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto mb-6 flex items-center justify-center text-[var(--text-muted)]">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-black uppercase italic mb-4 text-[var(--text-main)]">Gestión de Usuarios</h3>
              <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-8">Acceda a la base de datos completa de agentes para modificar niveles de autorización.</p>
              <Link to="/admin/usuarios" className="btn-primary inline-block">Abrir Directorio</Link>
            </div>
          </div>
        ) : (
          <div className="cyber-card p-20 text-center border-red-500/20">
            <p className="text-red-500 text-xs font-black uppercase tracking-widest">Error de Conexión con el Nodo Central</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
