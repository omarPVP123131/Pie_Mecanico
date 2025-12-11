"use client"

import { Suspense, useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import {
  OrbitControls,
  Environment,
  ContactShadows,
  PerspectiveCamera,
  GizmoHelper,
  GizmoViewcube,
} from "@react-three/drei"
import type { LegParams } from "@/lib/types"

interface CanvasSceneProps {
  params: LegParams
  gltfUrl: string
  setGltfUrl: (url: string) => void
  gltfError: string | null
  setGltfError: (error: string | null) => void
}

// Importación dinámica del modelo
import dynamic from "next/dynamic"

const GLTFModel = dynamic(() => import("@/components/gltf-model").then((mod) => ({ default: mod.GLTFModel })), {
  ssr: false,
})

function LoadingFallback() {
  return (
    <group position={[0, 20, 0]}>
      <mesh>
        <boxGeometry args={[5, 5, 5]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, -6, 0]}>
        <coneGeometry args={[3, 6, 4]} />
        <meshStandardMaterial color="#a78bfa" wireframe />
      </mesh>
      <mesh position={[0, 9, 0]}>
        <sphereGeometry args={[2, 8, 8]} />
        <meshStandardMaterial color="#c4b5fd" wireframe />
      </mesh>
    </group>
  )
}

function ErrorFallback() {
  return (
    <group position={[0, 20, 0]}>
      <mesh>
        <boxGeometry args={[8, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -8, 0]}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshStandardMaterial color="#dc2626" wireframe />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <torusGeometry args={[4, 1, 8, 16]} />
        <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

export default function CanvasScene({ params, gltfUrl, setGltfUrl, gltfError, setGltfError }: CanvasSceneProps) {
  const [modelStatus, setModelStatus] = useState<"loading" | "loaded" | "error">("loading")

  // Auto-detectar modelo GLB al montar
  useEffect(() => {
    const findModel = async () => {
      // Si ya hay una URL, no buscar
      if (gltfUrl) {
        setModelStatus("loaded")
        return
      }

      setModelStatus("loading")

      const modelPaths = ["/models/leg1.glb", "/models/leg2.glb", "/models/leg3.glb", "/models/leg.glb"]

      for (const path of modelPaths) {
        try {
          console.log(`[CanvasScene] Buscando modelo: ${path}`)
          const response = await fetch(path, { method: "HEAD" })

          if (response.ok) {
            console.log(`[CanvasScene] ✅ Modelo encontrado: ${path}`)
            setGltfUrl(path)
            setGltfError(null)
            setModelStatus("loaded")
            return
          }
        } catch (error) {
          console.log(`[CanvasScene] No encontrado: ${path}`)
        }
      }

      // No se encontró ningún modelo
      console.warn("[CanvasScene] ❌ No se encontró ningún modelo GLB")
      setGltfError("No se encontró ningún modelo 3D. Coloca tu archivo GLB en /public/models/")
      setModelStatus("error")
    }

    findModel()
  }, [])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={(state) => {
        state.gl.setClearColor(0x0f172a, 1)
      }}
    >
      {/* Cámara posicionada para ver la pierna completa */}
      <PerspectiveCamera makeDefault position={[60, 40, 60]} fov={50} />

      {/* OrbitControls apuntando al centro de la pierna (aprox Y=20) */}
<OrbitControls
  makeDefault
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  minDistance={30}
  maxDistance={120}
  target={[0, 20, 0]}
  maxPolarAngle={Math.PI * 0.9}
  minPolarAngle={Math.PI * 0.1}
/>

      {/* Luces mejoradas */}
      <ambientLight intensity={0.5} />

      {/* Luz principal */}
      <directionalLight
        position={[40, 60, 40]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={60}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />

      {/* Luz de relleno */}
      <directionalLight position={[-30, 30, -30]} intensity={0.4} />

      {/* Luz de acento */}
      <pointLight position={[0, 40, 0]} intensity={0.6} color="#a78bfa" />
      <pointLight position={[0, 10, 20]} intensity={0.3} color="#c4b5fd" />

      <Environment preset="sunset" />

      {/* Modelo 3D */}
      <Suspense fallback={<LoadingFallback />}>
        {modelStatus === "loading" && <LoadingFallback />}

        {modelStatus === "loaded" && gltfUrl && (
          <GLTFModel
            url={gltfUrl}
            params={params}
            onError={(error) => {
              setGltfError(error)
              if (error) {
                setModelStatus("error")
              }
            }}
            onLoaded={() => {
              console.log("[CanvasScene] ✅ Modelo cargado y visible")
              setModelStatus("loaded")
            }}
          />
        )}

        {modelStatus === "error" && <ErrorFallback />}
      </Suspense>

      {/* Sombras de contacto en el suelo (Y=0) */}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={100} blur={2} far={40} color="#000000" />

      {/* Grid en el suelo (Y=0) */}
      <gridHelper args={[100, 25, "#8b5cf6", "#334155"]} position={[0, 0, 0]} />

      {/* Plano de referencia en el suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.4} roughness={1} />
      </mesh>

      {/* Ejes de referencia en el origen */}
      <axesHelper args={[10]} position={[0, 0, 0]} />

<GizmoHelper alignment="bottom-right" margin={[80, 80]}>
  <GizmoViewcube />
</GizmoHelper>

    </Canvas>
  )
}
