import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { adminService } from '../../services/adminService'
import type { FiltrosUsuarios, ListadoUsuarios } from '../../services/adminService'
import type { Usuario } from '../../types/auth'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import { Search, User, Lock, Unlock, Zap, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

export function AdminUsuarios() {
  const { usuario: usuarioActual } = useAuth()
  const [listado, setListado] = useState<ListadoUsuarios | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<FiltrosUsuarios>({ pagina: 1 })

  // Escuchar actualización de presencia desde el túnel unificado
  useEffect(() => {
    const handlePresence = (e: any) => {
        const { usuario_id, esta_online } = e.detail;
        setListado(prev => {
            if (!prev) return null;
            return {
                ...prev,
                usuarios: prev.usuarios.map(u => 
                    u.id_supabase === usuario_id ? { ...u, esta_online } : u
                )
            };
        });
    }

    window.addEventListener('presence_change', handlePresence);
    return () => window.removeEventListener('presence_change', handlePresence);
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const data = await adminService.listarUsuarios(filtros)
      setListado(data)
    } catch (err) {
      console.error("CRITICAL_ERROR: Fallo al consultar Directorio de Agentes:", err)
      setMensaje("Error de Conexión: No se pudo sincronizar el directorio.")
      setTimeout(() => setMensaje(null), 5000)
    } finally {
      setCargando(false)
    }
  }, [filtros])

  useEffect(() => {
    cargar()
  }, [cargar])

  const accion = async (fn: () => Promise<boolean>, ok: string) => {
    const exito = await fn()
    if (exito) {
      setMensaje(ok)
      cargar()
      setTimeout(() => setMensaje(null), 3000)
    }
  }

  const toggleBloqueo = (u: Usuario) => {
    if (u.id_supabase === usuarioActual?.id_supabase) {
      return alert("Protocolo Denegado: No puedes bloquear tu propia cuenta de Administrador.")
    }
    if (!window.confirm(`¿Confirmas que deseas ${u.bloqueado ? 'desbloquear' : 'bloquear'} a ${u.nombre_usuario}?`)) return
    
    u.bloqueado
      ? accion(() => adminService.desbloquear(u.id_supabase), `${u.nombre_usuario} desbloqueado`)
      : accion(() => adminService.bloquear(u.id_supabase), `${u.nombre_usuario} bloqueado`)
  }

  const siguientePlan = (u: Usuario) => {
    const planes: ('gratis' | 'starter' | 'pro' | 'elite')[] = ['gratis', 'starter', 'pro', 'elite']
    const idx = planes.indexOf(u.plan || 'gratis')
    const proximo = planes[(idx + 1) % planes.length]
    accion(() => adminService.cambiarPlan(u.id_supabase, proximo), `Plan de ${u.nombre_usuario} -> ${proximo.toUpperCase()}`)
  }

  const toggleRol = (u: Usuario) => {
    if (u.id_supabase === usuarioActual?.id_supabase) {
      return alert("Protocolo Denegado: No puedes degradar tu propia cuenta de Administrador por seguridad. Contacta a otro Admin.")
    }
    const nuevoRol = u.rol === 'usuario' ? 'administrador' : 'usuario'
    if (!window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD ⚠️\n\nEstás a punto de cambiar el rol de ${u.nombre_usuario} a ${nuevoRol.toUpperCase()}.\n\n¿Estás completamente seguro de modificar sus credenciales de acceso?`)) return
    
    accion(
      () => adminService.cambiarRol(u.id_supabase, nuevoRol),
      `Rol de ${u.nombre_usuario} actualizado`
    )
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Directorio_Agentes</h2>
          {mensaje && (
            <div className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
              {mensaje}
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="cyber-card p-8 mb-10 border-[var(--border-color)] bg-white/[0.02]">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
              <input 
                type="text"
                placeholder="Buscar por identidad, correo..."
                value={filtros.q ?? ''}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value, pagina: 1 })}
                className="w-full bg-[var(--bg)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-2">Nivel_Rol</label>
              <select
                className="bg-[var(--bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3 text-xs focus:border-[var(--accent)] outline-none appearance-none cursor-pointer min-w-[120px]"
                value={filtros.rol ?? ''}
                onChange={(e) => setFiltros({ ...filtros, rol: (e.target.value as any) || undefined, pagina: 1 })}
              >
                <option value="">TODOS</option>
                <option value="administrador">ADMIN</option>
                <option value="usuario">USUARIO</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-2">Tipo_Plan</label>
              <select
                className="bg-[var(--bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3 text-xs focus:border-[var(--accent)] outline-none appearance-none cursor-pointer min-w-[120px]"
                value={filtros.plan ?? ''}
                onChange={(e) => setFiltros({ ...filtros, plan: (e.target.value as any) || undefined, pagina: 1 })}
              >
                <option value="">TODOS</option>
                <option value="gratis">GRATIS</option>
                <option value="starter">STARTER</option>
                <option value="pro">PRO</option>
                <option value="elite">ELITE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin mb-4" />
            <p className="text-[var(--accent)] text-[10px] font-black tracking-[0.5em] uppercase">Consultando Base de Datos...</p>
          </div>
        ) : listado ? (
          <>
            <div className="cyber-card overflow-hidden">
              <table className="w-full text-left text-[11px] font-bold">
                <thead className="bg-white/[0.03] border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <tr>
                    <th className="p-6 uppercase tracking-widest">Identidad</th>
                    <th className="p-6 uppercase tracking-widest">Autorización</th>
                    <th className="p-6 uppercase tracking-widest">Plan</th>
                    <th className="p-6 uppercase tracking-widest">Estado</th>
                    <th className="p-6 uppercase tracking-widest">Registro</th>
                    <th className="p-6 uppercase tracking-widest">Protocolos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {listado.usuarios.map((u) => (
                    <tr key={u.id_supabase} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6 text-[var(--text-main)]">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs ${u.rol === 'administrador' ? 'bg-[#ff0055]/20 text-[#ff0055]' : 'bg-cyan-400/20 text-cyan-400'}`}>
                            {u.nombre_usuario?.[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black group-hover:text-[var(--accent)] transition-colors">{u.nombre_usuario}</span>
                            <span className="text-[9px] opacity-40">{u.correo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          u.rol === 'administrador' ? 'border-[#ff0055]/30 text-[#ff0055] bg-[#ff0055]/5' : 'border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          u.plan === 'elite' ? 'border-cyan-400/50 text-cyan-400 bg-cyan-400/10' :
                          u.plan === 'pro' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10' : 'border-[var(--border-color)] text-[var(--text-muted)]'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                          {u.esta_online ? (
                            <span className="text-cyan-400 flex items-center gap-2 text-[9px] font-black tracking-widest animate-pulse">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]"></div> EN LÍNEA
                            </span>
                          ) : (
                            <span className="text-white/20 flex items-center gap-2 text-[9px] font-black tracking-widest">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div> DESCONECTADO
                            </span>
                          )}
                          
                          {u.bloqueado ? (
                            <span className="text-red-500/50 text-[8px] font-bold uppercase">Acceso Denegado</span>
                          ) : (
                            <span className="text-emerald-500/50 text-[8px] font-bold uppercase">Cuenta Habilitada</span>
                          )}
                        </div>
                      </td>
                      <td className="p-6 text-[var(--text-muted)] font-mono italic">
                        {new Date(u.fecha_creacion).toLocaleDateString()}
                      </td>
                      <td className="p-6">
                        <div className="flex gap-3">
                          <button 
                            onClick={() => toggleBloqueo(u)}
                            disabled={u.id_supabase === usuarioActual?.id_supabase}
                            className={`p-2 rounded-lg transition-all ${u.id_supabase === usuarioActual?.id_supabase ? 'opacity-10 cursor-not-allowed' : u.bloqueado ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                            title={u.id_supabase === usuarioActual?.id_supabase ? 'Acción denegada' : u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                          >
                            {u.bloqueado ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                          <button 
                            onClick={() => siguientePlan(u)}
                            className="p-2 bg-white/5 text-[var(--text-muted)] rounded-lg hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-all"
                            title="Cambiar Plan"
                          >
                            <Zap size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {listado.total_paginas > 1 && (
              <div className="flex items-center justify-between mt-8 px-4">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                   Nodo {listado.pagina} de {listado.total_paginas} — {listado.total} Sujetos Detectados
                </p>
                <div className="flex gap-4">
                  <button
                    disabled={(filtros.pagina ?? 1) <= 1}
                    onClick={() => setFiltros({ ...filtros, pagina: (filtros.pagina ?? 1) - 1 })}
                    className="p-3 bg-white/5 border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-10 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    disabled={(filtros.pagina ?? 1) >= listado.total_paginas}
                    onClick={() => setFiltros({ ...filtros, pagina: (filtros.pagina ?? 1) + 1 })}
                    className="p-3 bg-white/5 border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-10 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="cyber-card p-20 text-center border-[var(--border-color)]">
             <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-[0.3em]">No se han encontrado registros en este sector.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
