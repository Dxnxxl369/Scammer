import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAnonimo } from '../hooks/useAnonimo'
import { Layout } from '../components/Layout'

export function Home() {
  const { usuario } = useAuth()
  const { restantesLivianos, restantesPesados } = useAnonimo()

  const agotado = restantesLivianos <= 0 && restantesPesados <= 0

  return (
    <Layout>
      <div className="relative overflow-hidden min-h-screen">
        {/* Subdued Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--text-muted)05_1px,transparent_1px),linear-gradient(to_bottom,var(--text-muted)05_1px,transparent_1px)] bg-[size:60px_60px] z-0"></div>

        <section className="relative z-10 max-w-7xl mx-auto px-8 pt-40 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-10">
              <span className="w-16 h-[2px] bg-[var(--accent)]"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent)] animate-pulse">
                Advanced Forensic Intelligence v4.2.0
              </span>
            </div>
            
            <h1 className="text-8xl font-black text-[var(--text-main)] mb-12 leading-[0.9] tracking-tighter uppercase italic">
              Infraestructura <br />
              <span className="accent-text">Forense Digital</span>
            </h1>
            
            <p className="text-xl text-[var(--text-muted)] max-w-2xl mb-16 leading-relaxed font-bold uppercase tracking-tight italic">
              "Detecte contenido sintético con precisión militar. Nuestra IA analiza patrones neuronales invisibles en medios digitales."
            </p>

            <div className="flex flex-col sm:flex-row gap-8">
              {usuario ? (
                <Link to="/dashboard" className="btn-primary flex items-center justify-center px-16 py-8 text-xs">
                  Acceder al Terminal
                </Link>
              ) : (
                <>
                  <Link to="/dashboard" className={`btn-primary flex items-center justify-center px-16 py-8 text-xs ${agotado ? 'opacity-50' : 'bg-[var(--accent)] text-white shadow-[0_0_40px_rgba(255,0,85,0.4)] hover:bg-white hover:text-black'}`}>
                    {agotado ? 'Cuota Agotada' : 'Iniciar Escaneo Libre'}
                  </Link>
                  <Link to="/registro" className="border border-[var(--border-color)] bg-white/5 text-[var(--text-main)] font-black px-16 py-8 rounded-2xl text-xs tracking-[0.3em] uppercase hover:bg-white/10 transition-all flex items-center justify-center">
                    Solicitar Credenciales
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Technical Specification Section */}
        <section className="relative z-10 border-y border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-3xl py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
              {[
                { 
                  id: '01', 
                  title: 'Detección Multimodal', 
                  desc: 'Algoritmos especializados en la identificación de patrones de difusión en imágenes, videos y señales de audio.' 
                },
                { 
                  id: '02', 
                  title: 'Análisis de Metadatos', 
                  desc: 'Inspección profunda de cabeceras EXIF, estructuras de contenedores y firmas de hardware simuladas.' 
                },
                { 
                  id: '03', 
                  title: 'Reportes Certificados', 
                  desc: 'Generación de documentación técnica detallada con hashes criptográficos para validación de evidencia.' 
                }
              ].map((f) => (
                <div key={f.id} className="group relative">
                  <div className="absolute -left-10 top-0 text-[10px] font-black text-[var(--accent)] opacity-30 group-hover:opacity-100 transition-opacity">[{f.id}]</div>
                  <h3 className="text-xl font-black text-[var(--text-main)] mb-6 uppercase tracking-[0.1em]">{f.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed font-bold uppercase tracking-tighter italic group-hover:text-[var(--text-main)]/60 transition-colors">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}
