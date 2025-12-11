"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import type { LegParams } from "@/lib/types";
import { useStoredParams } from "@/hooks/useStoredParams";
import DataModal from "@/components/data-modal";
import { defaultParams } from "@/lib/defaultParams";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// Componentes importados (asume que existen)
const ControlPanel = dynamic(
  () =>
    import("@/components/control-panel").then((m) => ({
      default: m.ControlPanel,
    })),
  {
    ssr: false,
  }
);
const InfoCard = dynamic(
  () => import("@/components/info-card").then((m) => ({ default: m.InfoCard })),
  { ssr: false }
);

const CanvasScene = dynamic(() => import("@/components/canvas-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-2" />
        <p className="text-sm text-slate-300">Cargando visualización 3D...</p>
      </div>
    </div>
  ),
});

function ErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm z-50">
      <div className="max-w-md p-6 bg-slate-800 border border-red-500/50 shadow-2xl rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-bold text-red-400">
              Error en la Visualización 3D
            </h2>
            <p className="text-sm text-slate-300">
              Ha ocurrido un error al renderizar el modelo. Por favor recarga la
              aplicación.
            </p>
            <button
              onClick={onReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Recargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {

  const stored = useStoredParams(defaultParams);

  const [params, setParams] = useState<LegParams>(defaultParams);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gltfUrl, setGltfUrl] = useState("");
  const [gltfError, setGltfError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const errorCountRef = useRef(0);
  const [showModal, setShowModal] = useState(false);

  // refs para animación y detección
  const animFrameRef = useRef<number | null>(null);
  const prevKneeRef = useRef<number | null>(null);
  const animStateRef = useRef<string | null>(null);

  // 1) efecto: guardado automático cuando params cambian
  useEffect(() => {
    stored.save(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // 2) efecto: guardar gltfUrl cuando cambie
  useEffect(() => {
    if (gltfUrl) stored.saveGltf(gltfUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltfUrl]);

  // 3) efecto: manejar errores globales (mantener separado)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      errorCountRef.current++;
      if (errorCountRef.current > 2) {
        setHasError(true);
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);


  const handleParamChange = (key: keyof LegParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const resetValues = () => {
    setParams(defaultParams);
    setIsAnimating(false);
    setGltfError(null);
    // cancelar animaciones activas si existen
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const animateWalk = () => {
    // evita lanzar varias animaciones simultáneas
    if (isAnimating) return;

    // cancelar cualquier frame previo (por seguridad)
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    setIsAnimating(true);

    // guardamos pose inicial para restaurar después
    const startParams = { ...params };

    // refs/estado locales que sobreviven entre frames
    const state = {
      startTime: performance.now(),
      cycleDuration: 1200, // ms por paso (más lento y natural)
      totalCycles: 2,
      currentCycle: 0,
      // máquina de estados explícita
      phase: "heel-strike" as
        | "heel-strike"
        | "foot-flat"
        | "heel-rise"
        | "toe-off"
        | "swing",
      phaseStart: performance.now(),
      // bloqueo del foot en contacto
      isFootLocked: false,
      // valores target de contacto (se establecen cuando entramos en foot-flat)
      contactAnkle: startParams.ankleAngle ?? -15,
      contactArch: startParams.archHeight ?? 4,
      // prev knee para derivada (velocidad)
      prevKnee: params.kneeAngle,
      // tunables
      timings: {
        heelStrike: 0.18,
        footFlat: 0.55,
        heelRise: 0.78,
        toeOff: 0.95,
      },
      // control de sensibilidad para detectar "rodilla recta"
      kneeStraightThreshold: (startParams.kneeAngle ?? 5) + 4,
      plantSnapStrength: 0.92,
    };

    // helpers
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const clamp = (v: number, a: number, b: number) =>
      Math.max(a, Math.min(b, v));
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // función que calcula fase interna (0..1) dado cycleProgress y timings
    const phaseMix = (cycleProgress: number, start: number, end: number) => {
      if (cycleProgress < start) return 0;
      if (cycleProgress > end) return 1;
      return (cycleProgress - start) / Math.max(1e-6, end - start);
    };

    // loop
    const frame = (now: number) => {
      const cycleDur = state.cycleDuration;
      const cycleProgress = ((now - state.startTime) % cycleDur) / cycleDur; // 0..1 within cycle

      // ---------- targets por fases (guía)
      // Heel strike: dorsiflex ligero para talón
      const heelStrikeT = phaseMix(
        cycleProgress,
        0.0,
        state.timings.heelStrike
      );
      const heelStrikeAngle = lerp(
        startParams.ankleAngle ?? -15,
        -6,
        easeInOut(heelStrikeT)
      );

      // Foot-flat: de dorsiflex a foot-flat (ligera plantarflex)
      const flatT = phaseMix(
        cycleProgress,
        state.timings.heelStrike,
        state.timings.footFlat
      );
      const flatAngle = lerp(-6, 6, easeInOut(flatT));

      // Heel-rise: pequeña transición
      const heelRiseT = phaseMix(
        cycleProgress,
        state.timings.footFlat,
        state.timings.heelRise
      );
      const heelRiseAngle = lerp(6, 10, easeInOut(heelRiseT));

      // Toe-off: plantarflex fuerte
      const toeOffT = phaseMix(
        cycleProgress,
        state.timings.heelRise,
        state.timings.toeOff
      );
      const toeOffAngle = lerp(10, 40, easeInOut(toeOffT));

      // Decide fase nominal según cycleProgress
      let nominalPhase: typeof state.phase = "swing";
      if (cycleProgress <= state.timings.heelStrike)
        nominalPhase = "heel-strike";
      else if (cycleProgress <= state.timings.footFlat)
        nominalPhase = "foot-flat";
      else if (cycleProgress <= state.timings.heelRise)
        nominalPhase = "heel-rise";
      else if (cycleProgress <= state.timings.toeOff) nominalPhase = "toe-off";
      else nominalPhase = "swing";

      // Detectamos la velocidad/derivada de la rodilla para ver si se está enderezando
      const currentKnee = params.kneeAngle;
      const prevKnee = state.prevKnee ?? currentKnee;
      const kneeVel = (currentKnee - prevKnee) / (1 / 60); // approximate deg/sec (asumiendo ~60fps)
      state.prevKnee = currentKnee;

      // Si la rodilla se está enderezando (vel negativa grande) AND nominalPhase es foot-flat o acercándose,
      // consideramos que estamos plantando. También chequeamos umbral de ángulo.
      const kneeIsStraightening = kneeVel < -20; // deg/sec negative = decreasing fast (enderezando)
      const kneeStraightAngleReached =
        currentKnee <= state.kneeStraightThreshold;

      // Si entramos en foot-flat nominal, bloqueamos el foot en pose de contacto.
      if (nominalPhase === "foot-flat" && !state.isFootLocked) {
        state.isFootLocked = true;
        // fijamos los valores de contact a medida que entra foot-flat: esto evitará que suban los dedos
        state.contactAnkle = flatAngle;
        state.contactArch = Math.max(2, (startParams.archHeight ?? 4) - 1.4);
      }

      // Si detectamos planted por rodilla (más robusto), forzamos lock inmediato
      if (
        kneeIsStraightening &&
        kneeStraightAngleReached &&
        !state.isFootLocked
      ) {
        state.isFootLocked = true;
        state.contactAnkle = flatAngle;
        state.contactArch = Math.max(2, (startParams.archHeight ?? 4) - 1.6);
      }

      // Si empezamos toe-off fase, liberamos el lock
      if (nominalPhase === "toe-off" && state.isFootLocked) {
        state.isFootLocked = false;
      }

      // Componer el desiredAnkle según fase pero respetando lock
      let desiredAnkle = startParams.ankleAngle ?? -15;
      if (nominalPhase === "heel-strike") desiredAnkle = heelStrikeAngle;
      else if (nominalPhase === "foot-flat") desiredAnkle = flatAngle;
      else if (nominalPhase === "heel-rise") desiredAnkle = heelRiseAngle;
      else if (nominalPhase === "toe-off") desiredAnkle = toeOffAngle;
      else desiredAnkle = startParams.ankleAngle ?? -15;

      // Si estamos lockeados, forzamos a contactAnkle (mezclando un poco para suavizar)
      if (state.isFootLocked) {
        // mezcla fuerte hacia contactAnkle para "snap suave"
        desiredAnkle = lerp(
          desiredAnkle,
          state.contactAnkle,
          state.plantSnapStrength
        );
      }

      // arch: si foot locked usamos contactArch, si no, usamos interpolación normal
      let desiredArch = startParams.archHeight ?? 4;
      if (state.isFootLocked) {
        desiredArch = lerp(
          desiredArch,
          state.contactArch,
          state.plantSnapStrength
        );
      } else {
        // durante foot-flat (pero no locked) aplanamos un poco
        if (nominalPhase === "foot-flat") {
          const a = Math.max(2, (startParams.archHeight ?? 4) - 1.4);
          const ft = phaseMix(
            cycleProgress,
            state.timings.heelStrike,
            state.timings.footFlat
          );
          desiredArch = lerp(startParams.archHeight ?? 4, a, easeInOut(ft));
        } else {
          desiredArch = startParams.archHeight ?? 4;
        }
      }

      // otros targets (knee, hip, step, vertical) — similares a tu versión mejorada
      // Knee: mayor en swing
      const kneeOsc = Math.max(0, Math.sin((cycleProgress - 0.12) * Math.PI));
      const desiredKnee = lerp(
        startParams.kneeAngle ?? 5,
        70,
        clamp(kneeOsc, 0, 1)
      );

      const stepYaw = 12;
      const desiredStep =
        Math.sin(cycleProgress * Math.PI * 2 + Math.PI / 2) * stepYaw;
      const desiredVertical =
        Math.max(0, Math.sin((cycleProgress - 0.25) * Math.PI)) * 8;

      // Suavizado por frame al aplicar params (para evitar saltos)
      setParams((prev) => {
        const tSmooth = 0.14;
        return {
          ...prev,
          ankleAngle: lerp(
            prev.ankleAngle,
            clamp(desiredAnkle, -90, 60),
            tSmooth
          ),
          archHeight: lerp(
            prev.archHeight,
            clamp(desiredArch, 2, 8),
            tSmooth * 1.1
          ),
          kneeAngle: lerp(prev.kneeAngle, clamp(desiredKnee, 0, 90), tSmooth),
          stepAngle: lerp(prev.stepAngle, clamp(desiredStep, -35, 35), tSmooth),
          verticalShift: lerp(prev.verticalShift, desiredVertical, tSmooth),
          hipAngle: lerp(
            prev.hipAngle,
            startParams.hipAngle ??
              180 + Math.sin(cycleProgress * Math.PI * 2) * 8,
            tSmooth * 0.6
          ),
        };
      });

      // terminar o seguir
      const totalElapsed = now - state.startTime;
      if (totalElapsed < cycleDur * state.totalCycles) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        // restauración suave al finalizar
        const restoreStart = performance.now();
        const restoreDur = 450;
        const restoreLoop = (now2: number) => {
          const e = now2 - restoreStart;
          const p = clamp(e / restoreDur, 0, 1);
          const eased = easeInOut(p);
          setParams((prev) => ({
            ...prev,
            kneeAngle: lerp(prev.kneeAngle, startParams.kneeAngle, eased),
            ankleAngle: lerp(prev.ankleAngle, startParams.ankleAngle, eased),
            hipAngle: lerp(prev.hipAngle, startParams.hipAngle, eased),
            stepAngle: lerp(prev.stepAngle, startParams.stepAngle, eased),
            verticalShift: lerp(
              prev.verticalShift,
              startParams.verticalShift,
              eased
            ),
            archHeight: lerp(prev.archHeight, startParams.archHeight, eased),
          }));
          if (e < restoreDur) {
            animFrameRef.current = requestAnimationFrame(restoreLoop);
          } else {
            // reset exacto
            setParams((prev) => ({ ...prev, ...startParams }));
            setIsAnimating(false);
            animFrameRef.current = null;
            prevKneeRef.current = null;
            animStateRef.current = null;
          }
        };
        animFrameRef.current = requestAnimationFrame(restoreLoop);
      }
    };

    // lanzar loop
    animFrameRef.current = requestAnimationFrame(frame);
  };

  if (hasError) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 items-center justify-center">
        <ErrorFallback onReset={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Canvas 3D */}
      <div className="flex-1 relative">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          }
        >
          <CanvasScene
            params={params}
            gltfUrl={gltfUrl}
            setGltfUrl={setGltfUrl}
            gltfError={gltfError}
            setGltfError={setGltfError}
          />
        </Suspense>

        {/* Info Card Overlay */}
        <InfoCard params={params} />

        {/* Error Display */}
        {gltfError && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-xl max-w-md z-50">
            <p className="text-sm font-semibold">Error al cargar modelo 3D:</p>
            <p className="text-xs mt-1">{gltfError}</p>
            <button
              onClick={() => setGltfError(null)}
              className="mt-2 text-xs underline hover:text-red-100"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
      <ControlPanel
        params={params}
        onParamChange={handleParamChange}
        onReset={resetValues}
        onAnimate={animateWalk}
        isAnimating={isAnimating}
        gltfUrl={gltfUrl}
        setGltfUrl={setGltfUrl}
        onClearError={() => setGltfError(null)}
        onOpenData={() => setShowModal(true)} // <-- pasar callback
      />

      {/* Modal renderizado en el nivel de la página */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
       
        <DataModal
              open={showModal}
              onClose={() => setShowModal(false)}
              params={stored.params}
              gltfUrl={stored.gltfUrl || gltfUrl}
              defaultParams={defaultParams}
              onExport={() => {
                /* reutiliza tu exportData o similar */
              }}
            />
      </Dialog>
    </div>
  
  );
}
