// Utilidades de exportación SIN dependencias externas (APIs nativas del navegador).

function descargarBlob(nombreArchivo: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// CSV a partir de un array de objetos planos.
export function exportarCSV(nombre: string, filas: Record<string, unknown>[]) {
  const datos = filas && filas.length ? filas : [{ vacio: 'sin datos' }]
  const cols = Object.keys(datos[0])
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const cuerpo = [cols.join(','), ...datos.map(f => cols.map(c => esc((f as Record<string, unknown>)[c])).join(','))].join('\n')
  // BOM para que Excel respete acentos.
  descargarBlob(`${nombre}.csv`, new Blob(['\uFEFF' + cuerpo], { type: 'text/csv;charset=utf-8;' }))
}

// JSON con formato legible.
export function exportarJSON(nombre: string, data: unknown) {
  descargarBlob(`${nombre}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
}

// SVG crudo (vectorial).
export function exportarSVG(svg: SVGSVGElement, nombre: string) {
  const xml = new XMLSerializer().serializeToString(svg)
  descargarBlob(`${nombre}.svg`, new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
}

// PNG rasterizado a partir de un <svg>, con fondo oscuro.
export function exportarSVGaPNG(svg: SVGSVGElement, nombre: string, escala = 2) {
  const vb = svg.viewBox?.baseVal
  const w = vb && vb.width ? vb.width : (svg.clientWidth || 360)
  const h = vb && vb.height ? vb.height : (svg.clientHeight || 200)

  const clon = svg.cloneNode(true) as SVGSVGElement
  clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clon.setAttribute('width', String(w))
  clon.setAttribute('height', String(h))

  const xml = new XMLSerializer().serializeToString(clon)
  const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * escala)
    canvas.height = Math.round(h * escala)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(b => { if (b) descargarBlob(`${nombre}.png`, b) })
  }
  img.onerror = () => console.error('No se pudo rasterizar el SVG a PNG')
  img.src = svg64
}
