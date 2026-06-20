import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { adminService } from '../../services/adminService'
import type { FiltrosUsuarios, ListadoUsuarios, ActualizarUsuarioPayload } from '../../services/adminService'
import type { Usuario } from '../../types/auth'
import { useAuth } from '../../hooks/useAuth'
import { Search, Lock, Unlock, Zap, Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, UserCog, X, Save } from 'lucide-react'

interface FormUsuario {
  correo: string
  nombre_usuario: string
  nombre_completo: string
  password: string
  rol: 'administrador' | 'usuario'
  plan: 'gratis' | 'starter' | 'pro' | 'elite'
  pais: string
}

const FORM_VACIO: FormUsuario = {
  correo: '', nombre_usuario: '', nombre_completo: '', password: '', rol: 'usuario', plan: 'gratis', pais: 'BO',
}

const INPUT_CLS = 'w-full bg-[var(--bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all'

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-1">{label}</label>
      {children}
    </div>
  )
}

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

  // Variante de "accion" que maneja resultados con mensaje (crear/editar/eliminar)
  const accionRes = async (fn: () => Promise<{ ok: boolean; mensaje?: string }>, ok: string) => {
    const res = await fn()
    if (res.ok) {
      setMensaje(ok)
      cargar()
      setTimeout(() => setMensaje(null), 3000)
    } else {
      setMensaje(res.mensaje ?? 'Operación fallida')
      setTimeout(() => setMensaje(null), 5000)
    }
  }

  // ====== CRUD: Formularios Crear / Editar ======
  const [modo, setModo] = useState<'crear' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<FormUsuario>(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_VACIO)
    setErrorForm(null)
    setModo('crear')
  }

  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setForm({
      correo: u.correo,
      nombre_usuario: u.nombre_usuario,
      nombre_completo: u.nombre_completo ?? '',
      password: '',
      rol: u.rol,
      plan: u.plan,
      pais: u.pais ?? 'BO',
    })
    setErrorForm(null)
    setModo('editar')
  }

  const cerrarModal = () => {
    if (guardando) return
    setModo(null)
    setEditando(null)
  }

  const guardar = async () => {
    setErrorForm(null)
    const correo = form.correo.trim()
    const usuario = form.nombre_usuario.trim()

    if (!correo || !usuario) return setErrorForm('Correo y nombre de usuario son obligatorios.')
    if (usuario.length < 3) return setErrorForm('El nombre de usuario debe tener al menos 3 caracteres.')
    if (!/^[a-z0-9_]+$/.test(usuario)) return setErrorForm('Usuario inválido: solo minúsculas, números y guión bajo (_).')
    if (modo === 'crear' && form.password.length < 6) return setErrorForm('La contraseña debe tener al menos 6 caracteres.')

    setGuardando(true)
    try {
      if (modo === 'crear') {
        const res = await adminService.crearUsuario({
          correo,
          nombre_usuario: usuario,
          password: form.password,
          nombre_completo: form.nombre_completo.trim() || undefined,
          rol: form.rol,
          plan: form.plan,
          pais: form.pais.trim() || 'BO',
        })
        if (!res.ok) { setErrorForm(res.mensaje ?? 'No se pudo crear el usuario.'); return }
        setMensaje(`Agente ${usuario} dado de alta`)
      } else if (modo === 'editar' && editando) {
        const payload: ActualizarUsuarioPayload = {
          nombre_usuario: usuario,
          nombre_completo: form.nombre_completo.trim(),
          rol: form.rol,
          plan: form.plan,
          pais: form.pais.trim() || 'BO',
        }
        if (correo !== editando.correo) payload.correo = correo
        if (form.password.trim()) payload.password = form.password

        const res = await adminService.actualizarUsuario(editando.id_supabase, payload)
        if (!res.ok) { setErrorForm(res.mensaje ?? 'No se pudo actualizar el usuario.'); return }
        setMensaje(`Agente ${usuario} actualizado`)
      }
      setModo(null)
      setEditando(null)
      cargar()
      setTimeout(() => setMensaje(null), 3000)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = (u: Usuario) => {
    if (u.id_supabase === usuarioActual?.id_supabase) {
      return alert('Protocolo Denegado: No puedes eliminar tu propia cuenta de Administrador.')
    }
    if (!window.confirm(`⚠️ BAJA DEFINITIVA ⚠️\n\nVas a eliminar permanentemente a ${u.nombre_usuario} de Supabase y de la base de datos.\n\nEsta acción NO se puede deshacer. ¿Continuar?`)) return
    accionRes(() => adminService.eliminarUsuario(u.id_supabase), `${u.nombre_usuario} eliminado`)
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700">
        <div className="flex justify-between items-center mb-12 gap-6 flex-wrap">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Directorio_Agentes</h2>
          <div className="flex items-center gap-4">
            {mensaje && (
              <div className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                {mensaje}
              </div>
            )}
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,0,85,0.4)]"
            >
              <Plus size={16} strokeWidth={3} /> Nuevo Usuario
            </button>
          </div>
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
                          <button
                            onClick={() => toggleRol(u)}
                            disabled={u.id_supabase === usuarioActual?.id_supabase}
                            className={`p-2 rounded-lg transition-all ${u.id_supabase === usuarioActual?.id_supabase ? 'opacity-10 cursor-not-allowed' : 'bg-white/5 text-[var(--text-muted)] hover:bg-purple-500/10 hover:text-purple-400'}`}
                            title={u.id_supabase === usuarioActual?.id_supabase ? 'Acción denegada' : 'Cambiar Rol'}
                          >
                            <UserCog size={14} />
                          </button>
                          <button
                            onClick={() => abrirEditar(u)}
                            className="p-2 bg-white/5 text-[var(--text-muted)] rounded-lg hover:bg-cyan-400/10 hover:text-cyan-400 transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => eliminar(u)}
                            disabled={u.id_supabase === usuarioActual?.id_supabase}
                            className={`p-2 rounded-lg transition-all ${u.id_supabase === usuarioActual?.id_supabase ? 'opacity-10 cursor-not-allowed' : 'bg-white/5 text-red-500 hover:bg-red-500/20'}`}
                            title={u.id_supabase === usuarioActual?.id_supabase ? 'Acción denegada' : 'Eliminar'}
                          >
                            <Trash2 size={14} />
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

      {/* ====== MODAL CRUD: Crear / Editar Usuario ====== */}
      {modo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={cerrarModal}
        >
          <div
            className="cyber-card w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[var(--border-color)] bg-[var(--bg)] p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">
                {modo === 'crear' ? 'Alta_de_Agente' : 'Editar_Agente'}
              </h3>
              <button onClick={cerrarModal} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                <X size={20} />
              </button>
            </div>

            {errorForm && (
              <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-[11px] font-bold">
                {errorForm}
              </div>
            )}

            <div className="space-y-5">
              <Campo label="Correo Electrónico">
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="agente@dominio.com"
                  className={INPUT_CLS}
                />
              </Campo>

              <Campo label="Nombre de Usuario">
                <input
                  type="text"
                  value={form.nombre_usuario}
                  onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value.toLowerCase() })}
                  placeholder="agente_007"
                  className={INPUT_CLS}
                />
              </Campo>

              <Campo label="Nombre Completo (opcional)">
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  placeholder="Juan Pérez"
                  className={INPUT_CLS}
                />
              </Campo>

              <Campo label={modo === 'crear' ? 'Contraseña' : 'Contraseña (dejar vacío para no cambiar)'}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={INPUT_CLS}
                />
              </Campo>

              <div className="grid grid-cols-2 gap-4">
                <Campo label="Rol">
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value as 'administrador' | 'usuario' })}
                    className={INPUT_CLS}
                  >
                    <option value="usuario">USUARIO</option>
                    <option value="administrador">ADMINISTRADOR</option>
                  </select>
                </Campo>

                <Campo label="Plan">
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value as FormUsuario['plan'] })}
                    className={INPUT_CLS}
                  >
                    <option value="gratis">GRATIS</option>
                    <option value="starter">STARTER</option>
                    <option value="pro">PRO</option>
                    <option value="elite">ELITE</option>
                  </select>
                </Campo>
              </div>

              <Campo label="País (ISO-2)">
                <input
                  type="text"
                  maxLength={2}
                  value={form.pais}
                  onChange={(e) => setForm({ ...form, pais: e.target.value.toUpperCase() })}
                  placeholder="BO"
                  className={`${INPUT_CLS} w-28`}
                />
              </Campo>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={cerrarModal}
                disabled={guardando}
                className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-muted)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all disabled:opacity-30"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {modo === 'crear' ? 'Crear Agente' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
