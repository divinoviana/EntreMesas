import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { createRoot } from 'react-dom/client'

/** QR Code gerado localmente (sem enviar a URL para serviços externos). */
export function QR({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <div className="bg-white p-2 rounded-lg inline-block">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  )
}

/**
 * Abre uma janela imprimível com o QR da mesa (gerado via canvas → PNG).
 * Útil para imprimir o adesivo da mesa.
 */
export function printTableQR(value: string, label: string) {
  const holder = document.createElement('div')
  holder.style.position = 'fixed'
  holder.style.left = '-9999px'
  document.body.appendChild(holder)

  const root = createRoot(holder)
  root.render(<QRCodeCanvas value={value} size={420} level="M" includeMargin />)
  setTimeout(() => {
    const canvas = holder.querySelector('canvas') as HTMLCanvasElement | null
    const dataUrl = canvas?.toDataURL('image/png') ?? ''
    const w = window.open('', '_blank', 'width=480,height=640')
    if (w) {
      w.document.write(`
        <html><head><title>QR — Mesa ${label}</title>
        <style>
          body{font-family:Inter,system-ui,sans-serif;text-align:center;padding:32px;color:#0b0f14}
          h1{font-size:42px;margin:0 0 4px} p{color:#555;margin:0 0 18px}
          img{width:340px;height:340px} .tag{margin-top:18px;font-weight:700}
        </style></head>
        <body onload="window.print()">
          <h1>Mesa ${label}</h1>
          <p>Aponte a câmera para ver sua conta em tempo real</p>
          <img src="${dataUrl}" />
          <div class="tag">🍻 EntreMesas</div>
        </body></html>`)
      w.document.close()
    }
    root.unmount()
    holder.remove()
  }, 120)
}
