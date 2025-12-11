// walking-animation.ts - Sistema de animación de ciclo de marcha

import type { LegParams } from "@/lib/types"

export interface WalkingPhase {
  hipAngle: number
  kneeAngle: number
  ankleAngle: number
  footRotation: number
  stepAngle: number
  verticalShift: number
}

export class WalkingAnimator {
  private startTime: number = 0
  private isPlaying: boolean = false
  private cycleDuration: number = 2000 // 2 segundos por ciclo completo
  private onUpdate: (params: Partial<LegParams>) => void
  private animationId: number | null = null

  constructor(onUpdate: (params: Partial<LegParams>) => void) {
    this.onUpdate = onUpdate
  }

  // Función de easing suave (ease in-out cubic)
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // Función de easing específica para rodilla (más natural)
  private easeKnee(t: number): number {
    // Rodilla se flexiona más rápido y se extiende gradualmente
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  // Calcular la fase del ciclo de marcha
  private calculateWalkingPhase(progress: number): WalkingPhase {
    // Progress va de 0 a 1 durante el ciclo completo
    
    // FASE 1: Contacto inicial (0-0.1)
    // FASE 2: Apoyo medio (0.1-0.3)
    // FASE 3: Despegue (0.3-0.5)
    // FASE 4: Balanceo inicial (0.5-0.65)
    // FASE 5: Balanceo medio (0.65-0.85)
    // FASE 6: Balanceo final (0.85-1.0)

    let hipAngle: number
    let kneeAngle: number
    let ankleAngle: number
    let footRotation: number
    let stepAngle: number
    let verticalShift: number

    if (progress < 0.1) {
      // CONTACTO INICIAL
      const t = progress / 0.1
      hipAngle = this.lerp(-10, -5, this.easeInOutCubic(t))
      kneeAngle = this.lerp(5, 10, t)
      ankleAngle = this.lerp(-5, 0, t)
      footRotation = 0
      stepAngle = this.lerp(-5, 0, t)
      verticalShift = this.lerp(0, 0.5, t)
    } else if (progress < 0.3) {
      // APOYO MEDIO
      const t = (progress - 0.1) / 0.2
      hipAngle = this.lerp(-5, 10, this.easeInOutCubic(t))
      kneeAngle = this.lerp(10, 15, this.easeKnee(t))
      ankleAngle = this.lerp(0, 10, t)
      footRotation = 0
      stepAngle = this.lerp(0, 3, t)
      verticalShift = this.lerp(0.5, 1, t)
    } else if (progress < 0.5) {
      // DESPEGUE
      const t = (progress - 0.3) / 0.2
      hipAngle = this.lerp(10, 20, this.easeInOutCubic(t))
      kneeAngle = this.lerp(15, 40, this.easeKnee(t))
      ankleAngle = this.lerp(10, 20, t)
      footRotation = 0
      stepAngle = this.lerp(3, 10, t)
      verticalShift = this.lerp(1, 2, t)
    } else if (progress < 0.65) {
      // BALANCEO INICIAL - Pierna se eleva
      const t = (progress - 0.5) / 0.15
      hipAngle = this.lerp(20, 30, this.easeInOutCubic(t))
      kneeAngle = this.lerp(40, 70, this.easeKnee(t))
      ankleAngle = this.lerp(20, 10, t)
      footRotation = 0
      stepAngle = this.lerp(10, 5, t)
      verticalShift = this.lerp(2, 4, t)
    } else if (progress < 0.85) {
      // BALANCEO MEDIO - Pierna pasa adelante
      const t = (progress - 0.65) / 0.2
      hipAngle = this.lerp(30, 10, this.easeInOutCubic(t))
      kneeAngle = this.lerp(70, 50, this.easeKnee(t))
      ankleAngle = this.lerp(10, -5, t)
      footRotation = 0
      stepAngle = this.lerp(5, 0, t)
      verticalShift = this.lerp(4, 2, t)
    } else {
      // BALANCEO FINAL - Preparación para contacto
      const t = (progress - 0.85) / 0.15
      hipAngle = this.lerp(10, -10, this.easeInOutCubic(t))
      kneeAngle = this.lerp(50, 5, this.easeKnee(t))
      ankleAngle = this.lerp(-5, -5, t)
      footRotation = 0
      stepAngle = this.lerp(0, -5, t)
      verticalShift = this.lerp(2, 0, t)
    }

    return {
      hipAngle,
      kneeAngle,
      ankleAngle,
      footRotation,
      stepAngle,
      verticalShift
    }
  }

  // Interpolación lineal
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  // Actualizar animación
  private update = () => {
    if (!this.isPlaying) return

    const currentTime = Date.now()
    const elapsed = currentTime - this.startTime
    const progress = (elapsed % this.cycleDuration) / this.cycleDuration

    const phase = this.calculateWalkingPhase(progress)
    
    this.onUpdate({
      hipAngle: phase.hipAngle,
      kneeAngle: phase.kneeAngle,
      ankleAngle: phase.ankleAngle,
      footRotation: phase.footRotation,
      stepAngle: phase.stepAngle,
      verticalShift: phase.verticalShift
    })

    this.animationId = requestAnimationFrame(this.update)
  }

  // Iniciar animación
  start() {
    if (this.isPlaying) return

    this.isPlaying = true
    this.startTime = Date.now()
    this.update()
  }

  // Detener animación
  stop() {
    this.isPlaying = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  // Verificar si está reproduciendo
  isAnimating(): boolean {
    return this.isPlaying
  }

  // Cambiar velocidad (ajustar duración del ciclo)
  setSpeed(speedMultiplier: number) {
    // speedMultiplier: 1.0 = normal, 2.0 = doble velocidad, 0.5 = mitad de velocidad
    this.cycleDuration = 2000 / speedMultiplier
  }
}

// Hook React para usar el animador
import { useRef, useEffect, useState } from 'react'

export function useWalkingAnimation(onParamChange: (key: keyof LegParams, value: number) => void) {
  const animatorRef = useRef<WalkingAnimator | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Crear animador
    animatorRef.current = new WalkingAnimator((params) => {
      // Actualizar cada parámetro
      Object.entries(params).forEach(([key, value]) => {
        onParamChange(key as keyof LegParams, value as number)
      })
    })

    return () => {
      // Limpiar al desmontar
      if (animatorRef.current) {
        animatorRef.current.stop()
      }
    }
  }, [onParamChange])

  const startAnimation = () => {
    if (animatorRef.current) {
      animatorRef.current.start()
      setIsAnimating(true)
    }
  }

  const stopAnimation = () => {
    if (animatorRef.current) {
      animatorRef.current.stop()
      setIsAnimating(false)
    }
  }

  const toggleAnimation = () => {
    if (isAnimating) {
      stopAnimation()
    } else {
      startAnimation()
    }
  }

  const setSpeed = (speed: number) => {
    if (animatorRef.current) {
      animatorRef.current.setSpeed(speed)
    }
  }

  return {
    isAnimating,
    startAnimation,
    stopAnimation,
    toggleAnimation,
    setSpeed
  }
}

// Ejemplo de uso en componente:
/*
function MyComponent() {
  const [params, setParams] = useState<LegParams>({ ... })
  
  const handleParamChange = (key: keyof LegParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const { isAnimating, toggleAnimation, setSpeed } = useWalkingAnimation(handleParamChange)

  return (
    <div>
      <button onClick={toggleAnimation}>
        {isAnimating ? 'Detener' : 'Iniciar'} Animación
      </button>
      <input 
        type="range" 
        min="0.5" 
        max="2" 
        step="0.1"
        onChange={(e) => setSpeed(Number(e.target.value))}
      />
    </div>
  )
}
*/

// Presets de poses estáticas
export const POSE_PRESETS = {
  standing: {
    hipAngle: 0,
    kneeAngle: 0,
    ankleAngle: 0,
    footRotation: 0,
    stepAngle: 0,
    verticalShift: 0
  },
  walking_contact: {
    hipAngle: -10,
    kneeAngle: 5,
    ankleAngle: -5,
    footRotation: 0,
    stepAngle: -5,
    verticalShift: 0
  },
  walking_midstance: {
    hipAngle: 10,
    kneeAngle: 15,
    ankleAngle: 10,
    footRotation: 0,
    stepAngle: 3,
    verticalShift: 1
  },
  walking_pushoff: {
    hipAngle: 20,
    kneeAngle: 40,
    ankleAngle: 20,
    footRotation: 0,
    stepAngle: 10,
    verticalShift: 2
  },
  walking_swing: {
    hipAngle: 30,
    kneeAngle: 70,
    ankleAngle: 10,
    footRotation: 0,
    stepAngle: 5,
    verticalShift: 4
  },
  sitting: {
    hipAngle: 90,
    kneeAngle: 90,
    ankleAngle: 0,
    footRotation: 0,
    stepAngle: 0,
    verticalShift: 0
  },
  squatting: {
    hipAngle: 70,
    kneeAngle: 120,
    ankleAngle: 30,
    footRotation: 0,
    stepAngle: 0,
    verticalShift: 0
  }
}

export type PosePreset = keyof typeof POSE_PRESETS