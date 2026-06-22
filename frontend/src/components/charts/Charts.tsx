import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { exportarCSV, exportarJSON, exportarSVG, exportarSVGaPNG } from '../../utils/exportar'

const COLORES = ['#ff0055', '#22d3ee', '#f59e0b', '#10b981', '#a855f7', '#3b82f6', '#ec4899', '#84cc16']

export type Punto = { label: string; value: number; color?: string }

// ─────────────────────────── DONA / TORTA (con leyenda integrada en el SVG) ──
export function Dona({ data }: { data: Punto[] }) {
  const W = 360, H = 210, cx = 100, cy = 105, r = 72, sw = 26
  const C = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  const tot = total || 1
  let offset = 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 240 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      {data.map((d, i) => {
        const dash = (d.value / tot) * C
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color || COLORES[i % COLORES.length]} strokeWidth={sw}
            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`} />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff" fontSize="34" fontWeight="900">{total}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700" letterSpacing="2">TOTAL</text>
      {data.map((d, i) => {
        const y = 46 + i * 22
        const pct = total ? Math.round((d.value / total) * 100) : 0
        return (
          <g key={`l-${i}`}>
            <rect x={210} y={y - 9} width={11} height={11} rx={2} fill={d.color || COLORES[i % COLORES.length]} />
            <text x={228} y={y} fill="rgba(255,255,255,0.8)" fontSize="11" fontWeight="700">{d.label}</text>
            <text x={350} y={y} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="11" fontWeight="800">{pct}%</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────── BARRAS VERTICALES ──
export function Barras({ data, color = '#ff0055', alto = 220 }: { data: Punto[]; color?: string; alto?: number }) {
  const W = 360, H = alto
  const max = Math.max(1, ...data.map(d => d.value))
  const n = data.length || 1
  const padL = 8, padR = 8, padTop = 22, padBot = 40
  const bw = (W - padL - padR) / n
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((d, i) => {
        const h = (d.value / max) * (H - padTop - padBot)
        const w = bw * 0.66
        const x = padL + i * bw + (bw - w) / 2
        const y = H - padBot - h
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(h, 1)} rx={4} fill={d.color || color} opacity={0.9} />
            <text x={x + w / 2} y={y - 5} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">{d.value}</text>
            <text x={x + w / 2} y={H - padBot + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="700">
              {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ──────────────────────────────────────────── LÍNEA / ÁREA (series temporales) ──
export function Linea({ data, color = '#22d3ee', alto = 200 }: { data: Punto[]; color?: string; alto?: number }) {
  const W = 360, H = alto
  const max = Math.max(1, ...data.map(d => d.value))
  const n = data.length
  const padL = 8, padR = 8, padTop = 16, padBot = 26
  const innerW = W - padL - padR
  const innerH = H - padTop - padBot
  const px = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const py = (v: number) => padTop + innerH - (v / max) * innerH
  const pts = data.map((d, i) => `${px(i).toFixed(1)},${py(d.value).toFixed(1)}`).join(' ')
  const area = n > 0 ? `${padL},${padTop + innerH} ${pts} ${px(n - 1)},${padTop + innerH}` : ''
  const gid = 'grad-' + useId().replace(/:/g, '')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {n > 0 && <polygon points={area} fill={`url(#${gid})`} />}
      {n > 0 && <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
      {n > 0 && <text x={padL} y={H - 7} fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700">{data[0].label.slice(5)}</text>}
      {n > 1 && <text x={W - padR} y={H - 7} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="700">{data[n - 1].label.slice(5)}</text>}
      <text x={W - padR} y={padTop + 2} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="9" fontWeight="800">máx {max}</text>
    </svg>
  )
}

// ───────────────────────── TARJETA con menú de exportación (PNG / SVG / CSV / JSON) ──
type Formato = 'png' | 'svg' | 'csv' | 'json'

export function TarjetaReporte({
  titulo, nombre, data, formatos = ['png', 'svg', 'csv', 'json'], children,
}: {
  titulo: string
  nombre: string
  data: Record<string, unknown>[]
  formatos?: Formato[]
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const getSvg = () => ref.current?.querySelector('svg') as SVGSVGElement | null

  const acciones: Record<Formato, () => void> = {
    png: () => { const s = getSvg(); if (s) exportarSVGaPNG(s, nombre) },
    svg: () => { const s = getSvg(); if (s) exportarSVG(s, nombre) },
    csv: () => exportarCSV(nombre, data),
    json: () => exportarJSON(nombre, data),
  }

  return (
    <div className="cyber-card p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">{titulo}</h3>
        <div className="relative">
          <button
            onClick={() => setAbierto(v => !v)}
            className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
            title="Exportar"
          >
            <Download size={15} />
          </button>
          {abierto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
              <div className="absolute right-0 mt-1 z-50 bg-[#0e0e12] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[110px]">
                {formatos.map(f => (
                  <button
                    key={f}
                    onClick={() => { acciones[f](); setAbierto(false) }}
                    className="block w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  )
}
