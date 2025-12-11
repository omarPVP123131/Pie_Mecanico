"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LegParams } from "@/lib/types"

export function InfoCard({ params }: { params: LegParams }) {
  const totalLength = params.femurLength + params.tibiaLength
  const maxReach = Math.sqrt(params.femurLength ** 2 + params.tibiaLength ** 2)

  return (
    <Card className="absolute top-6 left-6 p-5 bg-slate-900/90 backdrop-blur-md shadow-2xl max-w-[320px] border-2 border-purple-500/30">
      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 flex items-center gap-2">
        <span>🦿</span> Pierna Mecánica
      </h3>

      <div className="space-y-3 text-sm text-slate-300">
        <div className="space-y-1">
          <p className="font-semibold text-purple-300 text-xs uppercase tracking-wide">Controles de Vista:</p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <span>
                <strong className="text-white">Click + Arrastrar:</strong> Rotar cámara
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <span>
                <strong className="text-white">Scroll:</strong> Zoom in/out
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <span>
                <strong className="text-white">Click derecho:</strong> Desplazar vista
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400">•</span>
              <span>
                <strong className="text-white">Panel derecho:</strong> Parámetros
              </span>
            </li>
          </ul>
        </div>

        <div className="pt-3 border-t border-purple-500/30 space-y-2">
          <p className="font-semibold text-purple-300 text-xs uppercase tracking-wide">Estadísticas:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-950/30 p-2 rounded border border-purple-500/20">
              <p className="text-xs text-slate-400">Longitud Total</p>
              <p className="text-sm font-bold text-purple-400">{totalLength.toFixed(1)} cm</p>
            </div>
            <div className="bg-purple-950/30 p-2 rounded border border-purple-500/20">
              <p className="text-xs text-slate-400">Alcance Máx.</p>
              <p className="text-sm font-bold text-purple-400">{maxReach.toFixed(1)} cm</p>
            </div>
            <div className="bg-purple-950/30 p-2 rounded border border-purple-500/20">
              <p className="text-xs text-slate-400">Elevación</p>
              <p className="text-sm font-bold text-purple-400">{params.verticalShift.toFixed(1)} cm</p>
            </div>
            <div className="bg-purple-950/30 p-2 rounded border border-purple-500/20">
              <p className="text-xs text-slate-400">Ángulo Rodilla</p>
              <p className="text-sm font-bold text-purple-400">{params.kneeAngle.toFixed(0)}°</p>
            </div>
          </div>
        </div>

      <div className="pt-3 border-t border-purple-500/30">
  <div className="flex flex-col gap-2 mt-2">
    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
      Omar Palomares Velasco
    </Badge>

    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
      Diego Israel Morales Cervantes
    </Badge>

    <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
      Hugo Abraham Salinas Garcia
    </Badge>
  </div>
</div>

      </div>
    </Card>
  )
}
