import { DashboardLayout } from '../components/DashboardLayout'
import { FolderOpen, Activity } from 'lucide-react'

export function Borradores() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase leading-none">
            Borradores <br /> <span className="text-[#ff0055]">Pendientes</span>
          </h1>
          <p className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase">Investigaciones en Curso</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-20 text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[25px] flex items-center justify-center mx-auto mb-8 border border-white/5">
            <FolderOpen className="text-white/10" size={32} />
          </div>
          <h3 className="text-white font-bold text-xl mb-2 uppercase tracking-tight">Sin Borradores</h3>
          <p className="text-white/40 text-sm italic font-medium mb-10">No tienes análisis guardados como borradores en este momento.</p>
          
          <div className="inline-flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 px-6 py-3 rounded-full text-cyan-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <Activity size={14} className="animate-pulse" /> Sincronizando con la Nube...
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
