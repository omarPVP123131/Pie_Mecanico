"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  RotateCcw,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import type { LegParams } from "@/lib/types";
import DataModal from "./data-modal";
import { useStored } from "@/context/StoredParamsContext";
import { defaultParams } from "@/lib/defaultParams";

type ControlPanelProps = {
  params: LegParams;
  onParamChange: (key: keyof LegParams, value: number) => void;
  onReset: () => void;
  onAnimate: () => void;
  isAnimating: boolean;
  gltfUrl: string;
  setGltfUrl: (value: string) => void;
  onClearError: () => void;
  onOpenData?: () => void; // <-- opcional, para abrir modal en page.tsx
};

export function ControlPanel({
  params,
  onParamChange,
  onReset,
  onAnimate,
  isAnimating,
  gltfUrl,
  setGltfUrl,
  onClearError,
  onOpenData, // <-- extraído de props
}: ControlPanelProps) {
  const [modelStatus, setModelStatus] = useState<
    "loading" | "found" | "not-found" | "error"
  >("loading");
  const [foundModel, setFoundModel] = useState<string>("");


  // Sincronizar con el estado del canvas
  useEffect(() => {
    if (gltfUrl) {
      setModelStatus("found");
      setFoundModel(gltfUrl);
    }
  }, [gltfUrl]);

  
  return (
    <div className="w-[420px] bg-slate-900/95 backdrop-blur-md overflow-y-auto shadow-2xl border-l border-purple-500/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Panel de Control
          </h1>
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Model Status */}
        <Card className="p-4 border-purple-500/30 bg-purple-950/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-purple-300">
                Estado del Modelo 3D
              </Label>
              {modelStatus === "loading" && (
                <Badge
                  variant="outline"
                  className="border-blue-500/50 bg-blue-950/30 text-blue-300"
                >
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Buscando...
                </Badge>
              )}
              {modelStatus === "found" && (
                <Badge
                  variant="outline"
                  className="border-green-500/50 bg-green-950/30 text-green-300"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Cargado
                </Badge>
              )}
              {(modelStatus === "not-found" || modelStatus === "error") && (
                <Badge
                  variant="outline"
                  className="border-amber-500/50 bg-amber-950/30 text-amber-300"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  No encontrado
                </Badge>
              )}
            </div>

            {modelStatus === "found" && foundModel && (
              <div className="bg-green-950/30 border border-green-500/30 rounded p-3">
                <p className="text-xs text-green-200 font-semibold mb-1">
                  ✅ Modelo detectado
                </p>
                <p className="text-xs text-green-300 font-mono break-all">
                  {foundModel}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Usa los controles para ajustar las articulaciones
                </p>
              </div>
            )}

            {(modelStatus === "not-found" || modelStatus === "error") &&
              !foundModel && (
                <div className="bg-amber-950/30 border border-amber-500/30 rounded p-3">
                  <p className="text-xs text-amber-200 font-semibold mb-2">
                    ⚠️ No se encontró modelo 3D
                  </p>
                  <p className="text-xs text-amber-300 mb-2">
                    Coloca tu archivo GLB en:
                  </p>
                  <div className="bg-slate-950/50 p-2 rounded font-mono text-xs text-slate-300 space-y-1">
                    <div>/public/models/leg1.glb</div>
                    <div>/public/models/leg2.glb</div>
                    <div>/public/models/leg.glb</div>
                  </div>
                </div>
              )}
          </div>
        </Card>

        {/* Articulaciones - Controles Principales */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-purple-400 border-b-2 border-purple-500 pb-1 flex-1">
              🦴 Control de Articulaciones
            </h2>
            <Badge
              variant="outline"
              className="border-purple-500/50 text-purple-300 text-xs"
            >
              Principal
            </Badge>
          </div>

          <ControlSlider
            label="Ángulo de Cadera"
            value={params.hipAngle}
            onChange={(v) => onParamChange("hipAngle", v)}
            min={-30}
            max={180}
            step={1}
            unit="°"
            formula="Flexión de cadera"
            color="blue"
          />

          <ControlSlider
            label="Ángulo de Rodilla"
            value={params.kneeAngle}
            onChange={(v) => onParamChange("kneeAngle", v)}
            min={0}
            max={140}
            step={1}
            unit="°"
            formula="Flexión de rodilla"
            color="green"
          />

          <ControlSlider
            label="Ángulo de Tobillo"
            value={params.ankleAngle}
            onChange={(v) => onParamChange("ankleAngle", v)}
            min={-90}
            max={45}
            step={1}
            unit="°"
            formula="Dorsiflexión/plantarflexión"
            color="purple"
          />
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Transformaciones */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-purple-400 border-b-2 border-purple-500 pb-1 flex-1">
              🔄 Transformaciones
            </h2>
          </div>

          <ControlSlider
            label="Rotación del Pie"
            value={params.footRotation}
            onChange={(v) => onParamChange("footRotation", v)}
            min={-45}
            max={45}
            step={1}
            unit="°"
            formula="Rotación en Y"
          />

          <ControlSlider
            label="Ángulo de Pisada"
            value={params.stepAngle}
            onChange={(v) => onParamChange("stepAngle", v)}
            min={-45}
            max={45}
            step={1}
            unit="°"
            formula="Rotación Z en tobillo"
          />

          <ControlSlider
            label="Elevación Vertical"
            value={params.verticalShift}
            onChange={(v) => onParamChange("verticalShift", v)}
            min={0}
            max={20}
            step={0.5}
            unit="cm"
            formula="Traslación en Y"
          />
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Dimensiones del Pie */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-purple-400 border-b-2 border-purple-500 pb-1 flex-1">
              🦶 Dimensiones del Pie
            </h2>
            <Badge
              variant="outline"
              className="border-purple-500/50 text-purple-300 text-xs"
            >
              Morfología
            </Badge>
          </div>

          <ControlSlider
            label="Longitud del Pie"
            value={params.footLength}
            onChange={(v) => onParamChange("footLength", v)}
            min={20}
            max={35}
            step={0.5}
            unit="cm"
          />

          <ControlSlider
            label="Altura del Arco"
            value={params.archHeight}
            onChange={(v) => onParamChange("archHeight", v)}
            min={2}
            max={8}
            step={0.2}
            unit="cm"
          />

          <ControlSlider
            label="Radio del Talón"
            value={params.heelRadius}
            onChange={(v) => onParamChange("heelRadius", v)}
            min={3}
            max={7}
            step={0.2}
            unit="cm"
          />
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Dimensiones de la Pierna */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-purple-400 border-b-2 border-purple-500 pb-1 flex-1">
              🦵 Dimensiones de Pierna
            </h2>
          </div>

          <ControlSlider
            label="Longitud de Tibia"
            value={params.tibiaLength}
            onChange={(v) => onParamChange("tibiaLength", v)}
            min={30}
            max={50}
            step={1}
            unit="cm"
          />

          <ControlSlider
            label="Longitud de Fémur"
            value={params.femurLength}
            onChange={(v) => onParamChange("femurLength", v)}
            min={35}
            max={55}
            step={1}
            unit="cm"
          />

          <ControlSlider
            label="Grosor General"
            value={params.legThickness}
            onChange={(v) => onParamChange("legThickness", v)}
            min={4}
            max={10}
            step={0.5}
            unit="cm"
          />
        </div>

        <Separator className="bg-purple-500/30" />

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onAnimate}
            disabled={isAnimating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
          >
            <Play className="mr-2 h-4 w-4" />
            {isAnimating ? "Animando..." : "Animar Ciclo de Marcha"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onReset}
              variant="outline"
              className="bg-slate-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-950/50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetear
            </Button>

           
           <Button
      onClick={onOpenData}
      variant="outline"
      className="bg-slate-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-950/50"
    >
      <Download className="mr-2 h-4 w-4" />
      Datos
    </Button>
         
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  formula,
  color = "purple",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  formula?: string;
  color?: "purple" | "blue" | "green" | "amber";
}) {
  const colorClasses = {
    purple: "border-purple-500/50 text-purple-400",
    blue: "border-blue-500/50 text-blue-400",
    green: "border-green-500/50 text-green-400",
    amber: "border-amber-500/50 text-amber-400",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-slate-300">{label}</Label>
        <span
          className={`text-sm font-bold ${colorClasses[color].split(" ")[1]}`}
        >
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      {formula && (
        <p
          className={`text-xs text-slate-500 font-mono bg-slate-950/30 p-2 rounded border-l-2 ${colorClasses[color]}`}
        >
          {formula}
        </p>
      )}
    </div>
  );
}
