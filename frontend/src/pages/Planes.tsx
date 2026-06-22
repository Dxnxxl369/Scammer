import { useState, useEffect } from 'react'
import { Shield, Check, X, CreditCard, Loader2, Clock, Image as ImageIcon, Video, FileText, Database, Infinity as InfinityIcon, HardDrive } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/DashboardLayout'
import { useAuth } from '../hooks/useAuth'
import { api } from '../services/api'

export function Planes() {
  const { usuario, recargarUsuario } = useAuth()
  const navigate = useNavigate()
  
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'elite' | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [exito, setExito] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'unknown'>('unknown')

  // Config REAL de planes (precio + límites) desde la BD = lo que el admin edita
  // en /admin/planes. Si la carga falla, se usan los valores por defecto del JSX.
  const [cfgPlanes, setCfgPlanes] = useState<Record<string, { precio: number; limite_livianos: number; limite_pesados: number }>>({})

  useEffect(() => {
    api.get('/pagos/planes/')
      .then(res => {
        const arr = (res.data?.datos || []) as any[]
        const map: Record<string, any> = {}
        arr.forEach(p => { if (p?.plan) map[p.plan] = p })
        setCfgPlanes(map)
      })
      .catch(() => { /* quedan los valores por defecto del JSX */ })
  }, [])

  // Precio (sin "$") de la BD, o el fallback hardcodeado si aún no cargó.
  const precioNum = (plan: string, fallback: string) => {
    const c = cfgPlanes[plan]
    return c ? String(c.precio) : fallback
  }
  // Texto de cuota: número real, o "ILIMITADOS" si es 999999+.
  const cuotaTxt = (plan: string, tipo: 'Livianos' | 'Pesados', fallback: string) => {
    const c = cfgPlanes[plan]
    if (!c) return fallback
    const n = tipo === 'Livianos' ? c.limite_livianos : c.limite_pesados
    if (n == null) return fallback
    return n >= 999999 ? `${tipo} ILIMITADOS` : `${n} Análisis ${tipo}`
  }

  const handleCheckout = (plan: 'starter' | 'pro' | 'elite') => {
    if (!usuario) { navigate('/login'); return }
    setSelectedPlan(plan)
    setModalOpen(true)
  }

  useEffect(() => {
    const num = cardData.number.replace(/\s/g, '')
    if (num.startsWith('4')) setCardBrand('visa')
    else if (/^(5[1-5]|2[2-7])/.test(num)) setCardBrand('mastercard')
    else setCardBrand('unknown')
  }, [cardData.number])

  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target
    if (name === 'number') value = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19)
    else if (name === 'expiry') value = value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1/').substring(0, 5)
    else if (name === 'cvv') value = value.replace(/\D/g, '').substring(0, 4)
    setCardData({ ...cardData, [name]: value })
  }

  const procesarPago = async () => {
    if (!selectedPlan || !usuario) return
    const numClean = cardData.number.replace(/\s/g, '')
    const expClean = cardData.expiry.replace(/\D/g, '')
    
    if (numClean.length < 16 || cardData.cvv.length < 3 || expClean.length < 4) {
      alert("Por favor, complete correctamente los datos de la tarjeta simulada (16 dígitos, fecha MM/YY y CVC).")
      return
    }
    setProcesando(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const res = await api.post(`/auth/suscripcion/`, { plan: selectedPlan })
      
      if (res.data.exito) {
        setExito(true)
        await recargarUsuario()
        setTimeout(() => { 
          setModalOpen(false)
          setExito(false)
          navigate('/dashboard') 
        }, 2500)
      } else {
        throw new Error("Respuesta fallida del servidor")
      }
    } catch (error) {
      console.error("Error en pago:", error)
      alert("Error al procesar la acreditación. Verifique su conexión y vuelva a intentarlo.")
      setProcesando(false)
    }
  }

  const cancelarSuscripcion = async () => {
    if (!usuario || usuario.plan === 'gratis') return
    if (!window.confirm(`¿Cancelar tu suscripción ${(usuario.plan || '').toUpperCase()} y volver al plan GRATIS? El cambio es inmediato.`)) return
    setCancelando(true)
    try {
      const res = await api.post('/pagos/cancelar/')
      if (res.data?.exito) {
        await recargarUsuario()
        alert('Suscripción cancelada. Volviste al plan GRATIS.')
      } else {
        throw new Error('Respuesta fallida del servidor')
      }
    } catch (error) {
      console.error('Error al cancelar suscripción:', error)
      alert('No se pudo cancelar la suscripción. Intentá de nuevo.')
    } finally {
      setCancelando(false)
    }
  }

  const getPlanWeight = (plan?: string) => {
    switch(plan) {
      case 'gratis': return 0;
      case 'starter': return 1;
      case 'pro': return 2;
      case 'elite': return 3;
      default: return 0;
    }
  }

  const userWeight = getPlanWeight(usuario?.plan)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-black mb-6 italic uppercase tracking-tighter text-[var(--text-main)]">Protocolos de <span className="text-[#ff0055] drop-shadow-[0_0_10px_rgba(255,0,85,0.4)]">Acreditación</span></h2>
          <p className="text-[var(--text-muted)] text-[10px] font-black tracking-[0.4em] uppercase max-w-2xl mx-auto leading-relaxed">Defina su capacidad operativa y tiempo de retención de evidencias en Supabase Storage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* FREE */}
          <div className="cyber-card p-8 border-zinc-700/50 bg-zinc-800/10 flex flex-col transition-all hover:-translate-y-2 hover:border-white/20">
            <div className="mb-6">
              <span className="text-[8px] font-black px-3 py-1 bg-zinc-700 text-white rounded-full uppercase tracking-widest mb-4 inline-block">Nivel 0</span>
              <h3 className="text-2xl font-black italic text-zinc-400 mb-1">AGENTE_FREE</h3>
              <p className="text-3xl font-black text-white">${precioNum('gratis', '0')} <span className="text-[10px] text-white/20 font-normal">/ MES</span></p>
            </div>
            <div className="space-y-6 flex-1 text-[11px] font-bold text-white/60">
              <div className="space-y-2">
                <p className="text-white/20 uppercase text-[9px] tracking-widest">Cuotas</p>
                <div className="flex items-center gap-2"><Check className="w-3 h-3 text-zinc-500" /> {cuotaTxt('gratis', 'Livianos', '10 Análisis Livianos')}</div>
                <div className="flex items-center gap-2"><Check className="w-3 h-3 text-zinc-500" /> {cuotaTxt('gratis', 'Pesados', '3 Análisis Pesados')}</div>
              </div>
              <div className="space-y-2">
                <p className="text-white/20 uppercase text-[9px] tracking-widest">Storage (Supabase)</p>
                <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-emerald-500" /> Guarda solo TEXTO</div>
                <div className="flex items-center gap-2 text-white/30 italic"><X className="w-3 h-3" /> Multimedia: Solo Nombre</div>
              </div>
            </div>
            <button disabled className="mt-8 bg-zinc-800/50 text-zinc-500 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-zinc-700/50">
              {usuario?.plan === 'gratis' ? 'Nivel Actual' : 'Plan Base'}
            </button>
          </div>

          {/* STARTER */}
          <div className="cyber-card p-8 border-cyan-500/30 bg-cyan-500/5 flex flex-col transition-all hover:-translate-y-2 hover:border-cyan-400/50">
            <div className="mb-6">
              <span className="text-[8px] font-black px-3 py-1 bg-cyan-500 text-black rounded-full uppercase tracking-widest mb-4 inline-block">Nivel 1</span>
              <h3 className="text-2xl font-black italic text-cyan-400 mb-1">STARTER_KIT</h3>
              <p className="text-3xl font-black text-white">${precioNum('starter', '9.99')} <span className="text-[10px] text-white/20 font-normal">/ MES</span></p>
            </div>
            <div className="space-y-6 flex-1 text-[11px] font-bold text-white/80">
              <div className="space-y-2">
                <p className="text-cyan-500/30 uppercase text-[9px] tracking-widest">Cuotas</p>
                <div className="flex items-center gap-2"><Check className="w-3 h-3 text-cyan-400" /> {cuotaTxt('starter', 'Livianos', '50 Análisis Livianos')}</div>
                <div className="flex items-center gap-2"><Check className="w-3 h-3 text-cyan-400" /> {cuotaTxt('starter', 'Pesados', '15 Análisis Pesados')}</div>
              </div>
              <div className="space-y-2">
                <p className="text-cyan-500/30 uppercase text-[9px] tracking-widest">Storage (Supabase)</p>
                <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-emerald-400" /> Texto + Docs {'<'} 2MB</div>
                <div className="flex items-center gap-2 text-white/30 italic"><ImageIcon className="w-3 h-3" /> Otros: Solo Nombre</div>
              </div>
            </div>
            {usuario?.plan === 'starter' ? (
              <button disabled className="mt-8 bg-cyan-900/50 text-cyan-600 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-cyan-800/50">Nivel Actual</button>
            ) : getPlanWeight('starter') < userWeight ? (
              <button disabled className="mt-8 bg-zinc-800/50 text-zinc-500 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-zinc-700/50">Incluido en tu Plan</button>
            ) : (
              <button onClick={() => handleCheckout('starter')} className="mt-8 bg-cyan-500 text-black font-black py-4 rounded-xl text-[9px] tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {usuario?.plan === 'gratis' ? 'Elevar Ahora' : 'Suscribirse'}
              </button>
            )}
          </div>

          {/* PRO */}
          <div className="cyber-card p-8 border-rose-500/50 bg-rose-500/5 shadow-[0_0_40px_rgba(244,63,94,0.1)] flex flex-col transition-all hover:-translate-y-2 hover:border-rose-400/60 relative z-10 md:scale-105">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black px-4 py-1 tracking-widest uppercase italic rounded-bl-xl">Más Elegido</div>
            <div className="mb-6">
              <span className="text-[8px] font-black px-3 py-1 bg-rose-500 text-white rounded-full uppercase tracking-widest mb-4 inline-block">Nivel 2</span>
              <h3 className="text-2xl font-black italic text-rose-500 mb-1">PRO_OPERATOR</h3>
              <p className="text-3xl font-black text-white">${precioNum('pro', '19.99')} <span className="text-[10px] text-white/20 font-normal">/ MES</span></p>
            </div>
            <div className="space-y-6 flex-1 text-[11px] font-bold text-white">
              <div className="space-y-2">
                <p className="text-rose-500/30 uppercase text-[9px] tracking-widest">Cuotas</p>
                <div className="flex items-center gap-2"><InfinityIcon className="w-3 h-3 text-rose-500" /> {cuotaTxt('pro', 'Livianos', 'Livianos ILIMITADOS')}</div>
                <div className="flex items-center gap-2"><Check className="w-3 h-3 text-rose-500" /> {cuotaTxt('pro', 'Pesados', '50 Análisis Pesados')}</div>
              </div>
              <div className="space-y-2">
                <p className="text-rose-500/30 uppercase text-[9px] tracking-widest">Storage (Supabase)</p>
                <div className="flex items-center gap-2"><FileText className="w-3 h-3 text-emerald-400" /> Texto + Docs {'<'} 4MB</div>
                <div className="flex items-center gap-2"><ImageIcon className="w-3 h-3 text-emerald-400" /> Imagen + Media {'<'} 4MB</div>
              </div>
            </div>
            {usuario?.plan === 'pro' ? (
              <button disabled className="mt-8 bg-rose-900/50 text-rose-600 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-rose-800/50">Nivel Actual</button>
            ) : getPlanWeight('pro') < userWeight ? (
              <button disabled className="mt-8 bg-zinc-800/50 text-zinc-500 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-zinc-700/50">Incluido en tu Plan</button>
            ) : (
              <button onClick={() => handleCheckout('pro')} className="mt-8 bg-rose-500 text-white font-black py-4 rounded-xl text-[9px] tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                {userWeight < 2 ? 'Elevar Ahora' : 'Suscribirse'}
              </button>
            )}
          </div>

          {/* ELITE */}
          <div className="cyber-card p-8 border-amber-500/30 bg-amber-500/5 flex flex-col transition-all hover:-translate-y-2 hover:border-amber-400/50">
            <div className="mb-6">
              <span className="text-[8px] font-black px-3 py-1 bg-amber-500 text-black rounded-full uppercase tracking-widest mb-4 inline-block">Nivel Max</span>
              <h3 className="text-2xl font-black italic text-amber-500 mb-1">ELITE_TERMINAL</h3>
              <p className="text-3xl font-black text-white">${precioNum('elite', '49.99')} <span className="text-[10px] text-white/20 font-normal">/ MES</span></p>
            </div>
            <div className="space-y-6 flex-1 text-[11px] font-bold text-white">
              <div className="space-y-2">
                <p className="text-amber-500/30 uppercase text-[9px] tracking-widest">Cuotas</p>
                <div className="flex items-center gap-2"><InfinityIcon className="w-3 h-3 text-amber-500" /> {cuotaTxt('elite', 'Livianos', 'Livianos ILIMITADOS')}</div>
                <div className="flex items-center gap-2"><InfinityIcon className="w-3 h-3 text-amber-500" /> {cuotaTxt('elite', 'Pesados', 'Pesados ILIMITADOS')}</div>
              </div>
              <div className="space-y-2">
                <p className="text-amber-500/30 uppercase text-[9px] tracking-widest">Storage (Supabase)</p>
                <div className="flex items-center gap-2"><HardDrive className="w-3 h-3 text-amber-500" /> Guarda TODO sin límite</div>
                <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-amber-500" /> Retención Persistente</div>
              </div>
            </div>
            {usuario?.plan === 'elite' ? (
              <button disabled className="mt-8 bg-amber-900/50 text-amber-600 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase cursor-not-allowed border border-amber-800/50">Nivel Actual</button>
            ) : (
              <button onClick={() => handleCheckout('elite')} className="mt-8 border border-amber-500 text-amber-500 font-black py-4 rounded-xl text-[9px] tracking-widest uppercase hover:bg-amber-500 hover:text-black transition-all">
                Ascender a ELITE
              </button>
            )}
          </div>

        </div>

        {usuario && usuario.plan !== 'gratis' && (
          <div className="mt-16 flex flex-col items-center gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Plan activo: <span className="text-white/60">{usuario.plan}</span></p>
            <button
              onClick={cancelarSuscripcion}
              disabled={cancelando}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/70 hover:text-rose-500 border border-rose-500/30 hover:border-rose-500/60 rounded-full px-8 py-4 transition-all disabled:opacity-40"
            >
              {cancelando ? 'Cancelando…' : 'Cancelar suscripción y volver a Gratis'}
            </button>
          </div>
        )}

        <section className="mt-20 p-10 bg-white/5 rounded-[40px] border border-white/5">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-6 text-center opacity-50">Lógica de Purga Forense</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-[11px] text-white/40 leading-relaxed font-medium">
                <p>1. <span className="text-white">FREE:</span> Historial se purga cada 3 días automáticamente.</p>
                <p>2. <span className="text-white">STARTER:</span> Historial se purga cada 15 días.</p>
                <p>3. <span className="text-white">PRO/ELITE:</span> Retención extendida a 30 días o indefinida (persistente).</p>
            </div>
        </section>
      </div>

      {/* Checkout Modal */}
      {modalOpen && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(25px)' }}>
          <div className="max-w-4xl w-full cyber-card p-0 overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-[#09090b] border border-white/10">
            <div className={`h-1.5 w-full ${selectedPlan === 'pro' ? 'bg-[#ff0055]' : (selectedPlan === 'elite' ? 'bg-amber-500' : 'bg-cyan-400')}`}></div>
            
            <div className="flex flex-col lg:flex-row min-h-[550px]">
              {/* Resumen */}
              <div className="lg:w-1/3 bg-white/[0.02] p-10 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
                <div className="flex items-center gap-3 mb-10 text-white">
                  <Shield className={selectedPlan === 'pro' ? 'text-[#ff0055]' : (selectedPlan === 'elite' ? 'text-amber-500' : 'text-cyan-400')} size={24} />
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Checkout</h3>
                </div>
                <div className="bg-[#09090b] border border-white/10 rounded-3xl p-6 mb-10">
                  <p className="text-[9px] font-black text-white/50 uppercase mb-2 italic tracking-widest">Suscripción Técnica</p>
                  <p className="text-lg font-black uppercase text-white tracking-tight">{selectedPlan.toUpperCase()}</p>
                  <p className={`text-4xl font-black italic mt-2 ${selectedPlan === 'pro' ? 'text-[#ff0055]' : (selectedPlan === 'elite' ? 'text-amber-500' : 'text-cyan-400')}`}>
                    ${precioNum(selectedPlan, selectedPlan === 'pro' ? '19.99' : (selectedPlan === 'elite' ? '49.99' : '9.99'))} <span className="text-[10px] font-bold text-white/50 not-italic">/ MES</span>
                  </p>
                </div>
              </div>

              {/* Formulario */}
              <div className="lg:w-2/3 p-10 lg:p-16 flex flex-col justify-center">
                {exito ? (
                  <div className="text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <Check size={48} />
                    </div>
                    <h4 className="text-3xl font-black italic uppercase text-white tracking-tighter">Acceso Concedido</h4>
                    <p className="text-xs text-white/50 uppercase tracking-[0.3em] font-black mt-4">Actualizando protocolos del terminal...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-10">
                        <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] italic">Método de Pago</h4>
                    </div>
                    
                    <div className="space-y-6 flex-1">
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-white/50 uppercase tracking-widest ml-1">Número de Tarjeta</label>
                           <div className="relative">
                              <input 
                                type="text"
                                name="number"
                                value={cardData.number}
                                onChange={handleCardInput}
                                placeholder="0000 0000 0000 0000"
                                className="w-full bg-[#09090b] border border-white/10 rounded-2xl p-5 text-white font-mono tracking-widest outline-none focus:border-white/30 transition-all"
                              />
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20"><CreditCard size={20}/></div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <input 
                              type="text"
                              name="expiry"
                              value={cardData.expiry}
                              onChange={handleCardInput}
                              placeholder="MM / YY"
                              className="w-full bg-[#09090b] border border-white/10 rounded-2xl p-5 text-white font-mono outline-none focus:border-white/30 transition-all"
                            />
                            <input 
                              type="password"
                              name="cvv"
                              value={cardData.cvv}
                              onChange={handleCardInput}
                              placeholder="CVC"
                              className="w-full bg-[#09090b] border border-white/10 rounded-2xl p-5 text-white font-mono outline-none focus:border-white/30 transition-all"
                            />
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 space-y-4">
                      <button 
                        onClick={procesarPago}
                        disabled={procesando}
                        className={`w-full py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all transform active:scale-95 ${selectedPlan === 'pro' ? 'bg-[#ff0055] text-white' : (selectedPlan === 'elite' ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black')} disabled:opacity-30`}
                      >
                        {procesando ? <><Loader2 size={18} className="animate-spin" /> Verificando...</> : <>Confirmar Acreditación</>}
                      </button>
                      <button onClick={() => setModalOpen(false)} className="w-full text-[9px] font-black uppercase text-white/50 hover:text-white transition-colors tracking-widest">Abortar Transacción</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
