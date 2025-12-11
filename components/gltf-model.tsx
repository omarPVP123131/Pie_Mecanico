"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import type { Group, Bone, SkinnedMesh } from "three";
import type { GLTF } from "three-stdlib";
import type { LegParams } from "@/lib/types";

interface GLTFModelProps {
  url: string;
  params: LegParams;
  onError?: (error: string | null) => void;
  onLoaded?: () => void;
}

interface ModelBones {
  hip: Bone | null;
  knee: Bone | null;
  ankle: Bone | null;
  foot: Bone | null;
  thigh: Bone | null;
  calf: Bone | null;
  toes: Bone[];
  heel: Bone | null;
}

export function GLTFModel({ url, params, onError, onLoaded }: GLTFModelProps) {
  const groupRef = useRef<Group>(null);
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [loading, setLoading] = useState(true);
  // Offsets y temporales para fallback cuando no se puede reparentar
  const footOffsetRef = useRef<THREE.Vector3 | null>(null);
  const ankleOffsetRef = useRef<THREE.Vector3 | null>(null);
  const tmpV = useRef(new THREE.Vector3());
  const tmpV2 = useRef(new THREE.Vector3());
  const tmpQ = useRef(new THREE.Quaternion());

  const [baseRotationZ, setBaseRotationZ] = useState(0); // Track base rotation for persistence
  const [bones, setBones] = useState<ModelBones>({
    hip: null,
    knee: null,
    ankle: null,
    foot: null,
    thigh: null,
    calf: null,
    toes: [],
    heel: null,
  });

  // Cargar modelo GLTF
  useEffect(() => {
    if (!url) return;

    setLoading(true);
    setGltf(null);
    setBones({
      hip: null,
      knee: null,
      ankle: null,
      foot: null,
      thigh: null,
      calf: null,
      toes: [],
      heel: null,
    });

    const loader = new GLTFLoader();
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
      console.log("[GLTFModel] ✅ Todos los recursos cargados");
    };

    loadingManager.onError = (failedUrl: string) => {
      console.warn("[GLTFModel] ⚠️ Error cargando recurso:", failedUrl);
    };

    loader.manager = loadingManager;

    console.log("[GLTFModel] 🔄 Cargando modelo desde:", url);

    loader.load(
      url,
      (loadedGltf: GLTF) => {
        console.log("[GLTFModel] ✅ GLTF cargado exitosamente");

        // Calcular bounding box ORIGINAL
        const box = new THREE.Box3().setFromObject(loadedGltf.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log("[GLTFModel] 📏 Dimensiones originales:");
        console.log(
          "  - Centro:",
          center.toArray().map((v) => v.toFixed(2))
        );
        console.log(
          "  - Min:",
          box.min.toArray().map((v) => v.toFixed(2))
        );
        console.log(
          "  - Max:",
          box.max.toArray().map((v) => v.toFixed(2))
        );
        console.log(
          "  - Tamaño:",
          size.toArray().map((v) => v.toFixed(2))
        );

        // Detectar si el modelo está invertido (cabeza abajo)
        // Una pierna normal tiene max.y positivo y min.y cerca de 0
        let needsRotation = false;

        if (box.max.y < 0) {
          // Todo el modelo está en Y negativo - definitivamente invertido
          console.log(
            "[GLTFModel] ⚠️ Modelo completamente invertido (Y negativo)"
          );
          needsRotation = true;
        } else if (box.min.y > size.y * 0.3) {
          // El "pie" está muy arriba - probablemente invertido
          console.log("[GLTFModel] ⚠️ Modelo invertido (pie arriba)");
          needsRotation = true;
        } else if (Math.abs(box.max.y) < Math.abs(box.min.y)) {
          // La parte superior es más pequeña que la inferior - invertido
          console.log("[GLTFModel] ⚠️ Modelo invertido (proporciones)");
          needsRotation = true;
        }

        let rotationZ = 0;
        if (needsRotation) {
          console.log("[GLTFModel] 🔄 Rotación de 180° detectada y almacenada");
          rotationZ = Math.PI;
        }

        loadedGltf.scene.updateMatrixWorld(true);

        // Recalcular bounding box después de cualquier rotación
        const finalBox = new THREE.Box3().setFromObject(loadedGltf.scene);
        const finalCenter = finalBox.getCenter(new THREE.Vector3());

        console.log("[GLTFModel] 📏 Después de ajustes:");
        console.log("  - Min Y:", finalBox.min.y.toFixed(2));
        console.log("  - Max Y:", finalBox.max.y.toFixed(2));

        // Centrar en X, Z y colocar el pie en Y=0
        loadedGltf.scene.position.set(
          -finalCenter.x,
          -finalBox.min.y,
          -finalCenter.z
        );

        console.log(
          "[GLTFModel] 📍 Posición final:",
          loadedGltf.scene.position.toArray().map((v) => v.toFixed(2))
        );

        // Procesar el modelo
        const foundBones: ModelBones = {
          hip: null,
          knee: null,
          ankle: null,
          foot: null,
          thigh: null,
          calf: null,
          toes: [],
          heel: null,
        };

        let skeletonFound = false;
        const bonesList: string[] = [];

        loadedGltf.scene.traverse((child) => {
          // Configurar meshes
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const material = mesh.material as THREE.MeshStandardMaterial;

              if (!material.map) {
                material.color.setHex(0xf5d5c0);
              }

              material.metalness = Math.min(material.metalness ?? 0.02, 0.05);
              material.roughness = Math.max(material.roughness ?? 0.95, 0.9);
              material.needsUpdate = true;
            }

            if ((child as any).isSkinnedMesh) {
              const skinnedMesh = child as SkinnedMesh;

              if (skinnedMesh.skeleton) {
                skeletonFound = true;
                console.log(
                  "[GLTFModel] 🦴 Skeleton con",
                  skinnedMesh.skeleton.bones.length,
                  "huesos"
                );

                skinnedMesh.skeleton.bones.forEach((bone) => {
                  bonesList.push(bone.name);
                });
              }
            }
          }

          // Buscar huesos por nombre
          if ((child as any).isBone) {
            const bone = child as Bone;
            const boneName = bone.name.toLowerCase();

            // Cadera
            if (
              boneName.includes("hip") ||
              boneName.includes("pelvis") ||
              boneName.includes("cadera")
            ) {
              foundBones.hip = bone;
              console.log("[GLTFModel] ✅ Cadera:", bone.name);
            }

            // Muslo
            if (
              boneName.includes("thigh") ||
              boneName.includes("femur") ||
              boneName.includes("upleg") ||
              boneName.includes("muslo")
            ) {
              foundBones.thigh = bone;
              console.log("[GLTFModel] ✅ Muslo:", bone.name);
            }

            // Rodilla
            if (boneName.includes("knee") || boneName.includes("rodilla")) {
              foundBones.knee = bone;
              console.log("[GLTFModel] ✅ Rodilla:", bone.name);
            }

            // Pantorrilla
            if (
              boneName.includes("calf") ||
              boneName.includes("shin") ||
              boneName.includes("tibia") ||
              boneName.includes("lowleg") ||
              boneName.includes("pantorrilla")
            ) {
              foundBones.calf = bone;
              console.log("[GLTFModel] ✅ Pantorrilla:", bone.name);
            }

            // Tobillo
            if (boneName.includes("ankle") || boneName.includes("tobillo")) {
              foundBones.ankle = bone;
              console.log("[GLTFModel] ✅ Tobillo:", bone.name);
            }

            // Pie
            if (boneName.includes("foot") || boneName.includes("pie")) {
              foundBones.foot = bone;
              console.log("[GLTFModel] ✅ Pie:", bone.name);
            }

            // Dedos
            if (boneName.includes("toe") || boneName.includes("dedo")) {
              foundBones.toes.push(bone);
              console.log("[GLTFModel] ✅ Dedo:", bone.name);
            }

            // Talón
            if (
              boneName.includes("heel") ||
              boneName.includes("talon") ||
              boneName.includes("calcane")
            ) {
              foundBones.heel = bone;
              console.log("[GLTFModel] ✅ Talón:", bone.name);
            }
          }
        });
        // --- asegurar que el 'foot' siga al 'ankle' ---
        if (foundBones.ankle && foundBones.foot) {
          try {
            // Si possible: attach preserve world transform and make foot child of ankle
            // Object3D.attach está presente en THREE; mantiene la transform mundial del objeto.
            // Lo hacemos sobre la propia bone "ankle".
            foundBones.ankle.attach(foundBones.foot);
            console.log(
              "[GLTFModel] ✨ Reparented 'foot' under 'ankle' (attach) — ahora el pie seguirá al tobillo."
            );
            // clear fallback
            footOffsetRef.current = null;
          } catch (err) {
            // Fallback: calcular offset local del pie respecto al tobillo (en espacio del tobillo)
            // Guardamos ese offset para aplicarlo cada frame si no se pudo reparentar.
            const ankleWorldPos = new THREE.Vector3();
            const footWorldPos = new THREE.Vector3();
            foundBones.ankle.getWorldPosition(ankleWorldPos);
            foundBones.foot.getWorldPosition(footWorldPos);

            // Offset en espacio mundo:
            const offsetWorld = footWorldPos.clone().sub(ankleWorldPos);

            // Convertimos offset a espacio LOCAL del 'ankle' (así lo rotaremos por la orientación del ankle)
            const offsetLocal = offsetWorld.clone();
            foundBones.ankle.worldToLocal(offsetLocal);

            footOffsetRef.current = offsetLocal;
            console.warn(
              "[GLTFModel] ⚠️ No se pudo reparentar foot -> ankle. Usando fallback con offset local:",
              offsetLocal.toArray()
            );
          }
        }

        // Mostrar lista completa de huesos
        if (bonesList.length > 0) {
          console.log("[GLTFModel] 📋 LISTA COMPLETA DE HUESOS:");
          bonesList.forEach((name, idx) => {
            console.log(`  ${idx + 1}. "${name}"`);
          });
        }

        const bonesFound = Object.entries(foundBones).filter(([key, value]) => {
          if (key === "toes") return (value as Bone[]).length > 0;
          return value !== null;
        }).length;

        console.log(
          `[GLTFModel] 📊 Resumen: ${bonesFound}/8 grupos de huesos encontrados`
        );

        // --- Intentar re-parentar: calf -> ankle -> foot ---
        if (foundBones.calf && foundBones.ankle) {
          try {
            // hacer ankle hijo del calf (manteniendo transform mundial)
            foundBones.calf.attach(foundBones.ankle);
            console.log(
              "[GLTFModel] ✨ Reparented 'ankle' under 'calf' (attach)"
            );
            ankleOffsetRef.current = null;
          } catch (err) {
            // fallback: calcular offset local ankle respecto a calf
            const calfWorldPos = new THREE.Vector3();
            const ankleWorldPos = new THREE.Vector3();
            foundBones.calf.getWorldPosition(calfWorldPos);
            foundBones.ankle.getWorldPosition(ankleWorldPos);

            const offsetWorld = ankleWorldPos.clone().sub(calfWorldPos);
            const offsetLocal = offsetWorld.clone();
            foundBones.calf.worldToLocal(offsetLocal);
            ankleOffsetRef.current = offsetLocal;
            console.warn(
              "[GLTFModel] ⚠️ No se pudo reparentar ankle -> calf. Guardado ankleOffset:",
              offsetLocal.toArray()
            );
          }
        }

        if (foundBones.ankle && foundBones.foot) {
          try {
            // hacer foot hijo del ankle
            foundBones.ankle.attach(foundBones.foot);
            console.log(
              "[GLTFModel] ✨ Reparented 'foot' under 'ankle' (attach)"
            );
            footOffsetRef.current = null;
          } catch (err) {
            // fallback: calcular offset local foot respecto a ankle
            const ankleWorldPos = new THREE.Vector3();
            const footWorldPos = new THREE.Vector3();
            foundBones.ankle.getWorldPosition(ankleWorldPos);
            foundBones.foot.getWorldPosition(footWorldPos);

            const offsetWorld = footWorldPos.clone().sub(ankleWorldPos);
            const offsetLocal = offsetWorld.clone();
            foundBones.ankle.worldToLocal(offsetLocal);
            footOffsetRef.current = offsetLocal;
            console.warn(
              "[GLTFModel] ⚠️ No se pudo reparentar foot -> ankle. Guardado footOffset:",
              offsetLocal.toArray()
            );
          }
        }

        setBaseRotationZ(rotationZ); // Store the base rotation
        setBones(foundBones);
        setGltf(loadedGltf);
        setLoading(false);

        if (onError) onError(null);
        if (onLoaded) onLoaded();
      },
      (progress) => {
        const percent =
          progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
        console.log(`[GLTFModel] Progreso: ${percent.toFixed(1)}%`);
      },
      (error) => {
        console.error("[GLTFModel] ❌ Error:", error);
        const errorMsg =
          "Error al cargar el modelo 3D. Verifica que el archivo exista en /public/models/";
        setLoading(false);
        if (onError) onError(errorMsg);
      }
    );

    return () => {
      if (gltf?.scene) {
        gltf.scene.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();

            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [url]);

  // Aplicar parámetros
useEffect(() => {
  if (!groupRef.current || !gltf?.scene) return

  const group = groupRef.current

  // ===== POSICIÓN VERTICAL =====
  group.position.y = params.verticalShift

  // ===== ESCALADO =====
  const scaleX = params.footLength / 26
  const scaleY = (params.tibiaLength + params.femurLength) / 83
  const scaleZ = params.legThickness / 6
  group.scale.set(scaleX, scaleY, scaleZ)

  const rotY = (params.footRotation * Math.PI) / 180
  group.rotation.z = baseRotationZ // Maintain base rotation
  group.rotation.y = rotY

  // ===== CONTROL DE ARTICULACIONES CON POSE NATURAL =====
  const hipRad = (params.hipAngle * Math.PI) / 180
  const kneeRad = (params.kneeAngle * Math.PI) / 180
  const ankleRad = (params.ankleAngle * Math.PI) / 180 // reusamos este valor pero lo aplicaremos al foot
  const stepRad = (params.stepAngle * Math.PI) / 180

  // CADERA - Flexión hacia adelante (positivo = adelante)
  if (bones.hip) {
    bones.hip.rotation.x = hipRad
    bones.hip.rotation.y = 0
    bones.hip.rotation.z = 0
  }

  // MUSLO - Sin rotación adicional (hereda de cadera)
  if (bones.thigh) {
    bones.thigh.rotation.set(0, 0, 0)
  }

  // RODILLA - Flexión hacia atrás (negativo = doblar rodilla)
  if (bones.knee) {
    bones.knee.rotation.x = -kneeRad
    bones.knee.rotation.y = 0
    bones.knee.rotation.z = 0
  }

  // PANTORRILLA - Sin rotación adicional (la pantorrilla queda estática o la animas aparte)
  if (bones.calf) {
    bones.calf.rotation.set(0, 0, 0)
  }

  // ---- ANKLE: dejarlo fijo (sin movimiento) ----
  if (bones.ankle) {
    // NO aplicamos rotaciones de animación al ankle para evitar separación.
    // Solo aseguramos que su orientación base quede limpia (ninguna animación).
    // Si tu modelo necesita alguna corrección inicial, aplícala aquí (por ejemplo offsets), pero NO animar.
    // bones.ankle.rotation.set(0, 0, 0)
  }

  // ---- Si ankle no es hijo del calf y hay ankleOffsetRef -> posicionarlo (fallback),
  //      pero sin aplicar animación al ankle; esto solo mantiene la unión espacial ----
  if (bones.ankle && bones.calf && ankleOffsetRef.current && bones.ankle.parent !== bones.calf) {
    const calfWorldPos = tmpV.current
    const calfWorldQuat = tmpQ.current
    bones.calf.getWorldPosition(calfWorldPos)
    bones.calf.getWorldQuaternion(calfWorldQuat)

    const rotatedOffsetWorld = ankleOffsetRef.current.clone().applyQuaternion(calfWorldQuat)
    const desiredAnkleWorld = calfWorldPos.clone().add(rotatedOffsetWorld)

    if (bones.ankle.parent) {
      bones.ankle.parent.worldToLocal(desiredAnkleWorld)
      bones.ankle.position.copy(desiredAnkleWorld)
    } else {
      bones.ankle.position.copy(desiredAnkleWorld)
    }

    // Mantener la rotación del calf (o una orientación base) — no animamos el ankle.
    const desiredQuat = bones.calf.getWorldQuaternion(new THREE.Quaternion())
    if (bones.ankle.parent) {
      const parentWorldQuat = bones.ankle.parent.getWorldQuaternion(new THREE.Quaternion())
      const localQuat = desiredQuat.clone().premultiply(parentWorldQuat.clone().invert())
      bones.ankle.quaternion.copy(localQuat)
    } else {
      bones.ankle.quaternion.copy(desiredQuat)
    }
  }

  // ---- FOOT: ahora es EL QUE TIENE EL MOVIMIENTO (arriba/abajo + lateral) ----
  if (bones.foot) {
    const footLengthScale = params.footLength / 26
    const archRotation = (params.archHeight - 4) * 0.01

    // Si el foot es hijo directo del ankle (reparent exitoso):
    // aplicamos las rotaciones de animación directamente al foot (no al ankle).
    if (bones.ankle && bones.foot.parent === bones.ankle) {
      // Aplicar dorsiflex/plantarflex en X (usamos ankleRad para mantener parámetro)
      bones.foot.rotation.x = -ankleRad

      // Aplicar balanceo lateral en Z (stepAngle)
      bones.foot.rotation.z = stepRad

      // Aplicar arco encima de la rotación base
      bones.foot.rotateX(archRotation)

      // Escala del pie (ajusta el eje si tu modelo usa otro para la longitud)
      bones.foot.scale.set(1, 1, footLengthScale)
    } else if (bones.ankle && footOffsetRef.current) {
      // Fallback: calcular la nueva posición mundial del foot en base al ankle + offsetLocal,
      // y luego aplicar la rotación de animación al propio foot (en su espacio local).

      const ankleWorldPos = tmpV.current
      const ankleWorldQuat = tmpQ.current
      bones.ankle.getWorldPosition(ankleWorldPos)
      bones.ankle.getWorldQuaternion(ankleWorldQuat)

      const rotatedOffsetWorld = footOffsetRef.current.clone().applyQuaternion(ankleWorldQuat)
      const desiredFootWorld = ankleWorldPos.clone().add(rotatedOffsetWorld)

      if (bones.foot.parent) {
        bones.foot.parent.worldToLocal(desiredFootWorld)
        bones.foot.position.copy(desiredFootWorld)
      } else {
        bones.foot.position.copy(desiredFootWorld)
      }

      // Alineamos rotación del foot copiando la del ankle (convertida a local del parent del foot)
      const desiredQuat = bones.ankle.getWorldQuaternion(new THREE.Quaternion())
      if (bones.foot.parent) {
        const parentWorldQuat = bones.foot.parent.getWorldQuaternion(new THREE.Quaternion())
        const localQuat = desiredQuat.clone().premultiply(parentWorldQuat.clone().invert())
        bones.foot.quaternion.copy(localQuat)
      } else {
        bones.foot.quaternion.copy(desiredQuat)
      }

      // Ahora aplicamos las rotaciones de animación al foot (SIEMPRE sobre su orientación actual local)
      // Para evitar "separación" primero dejamos la posicion/quaternion, luego rotamos en local:
      bones.foot.rotateX(-ankleRad) // arriba/abajo usando el parámetro ankleAngle
      bones.foot.rotateZ(stepRad)   // lateral usando stepAngle

      // Aplicar arco y escala encima de la orientación aplicada
      bones.foot.rotateX(archRotation)
      bones.foot.scale.set(1, 1, footLengthScale)
    } else {
      // Caso por defecto: no hay ankle detectable o offset -> aplicar movimiento local al foot
      bones.foot.rotation.x = -ankleRad
      bones.foot.rotation.z = stepRad
      bones.foot.rotateX(archRotation)
      bones.foot.scale.set(1, 1, footLengthScale)
    }
  }

  // TALÓN - radio del talón
  if (bones.heel) {
    const heelScale = params.heelRadius / 5
    bones.heel.scale.set(heelScale, heelScale, heelScale)
  }

  // DEDOS - Control de visibilidad
  if (bones.toes.length > 0) {
    bones.toes.forEach((toe, idx) => {
      toe.visible = idx < params.toeCount
    })
  }

  // Debug info
  const bonesFound = Object.entries(bones).filter(([key, value]) => {
    if (key === "toes") return (value as Bone[]).length > 0
    return value !== null
  }).length

  if (bonesFound > 0) {
    console.log(`[GLTFModel] 🎮 Controlando ${bonesFound}/8 grupos de huesos (ankle fijo, foot animado)`)
  }
}, [params, gltf, bones, baseRotationZ])

  if (loading) {
    return (
      <group position={[0, 40, 0]}>
        <mesh>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#8b5cf6"
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh position={[0, -5, 0]}>
          <coneGeometry args={[2, 4, 4]} />
          <meshStandardMaterial color="#a78bfa" wireframe />
        </mesh>
      </group>
    );
  }

  if (!gltf?.scene) {
    return (
      <group position={[0, 40, 0]}>
        <mesh>
          <boxGeometry args={[5, 5, 5]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, -6, 0]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}
