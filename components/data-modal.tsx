import React, { useMemo, useState } from "react"

type LegParams = {
  footLength: number
  archHeight: number
  heelRadius: number
  toeCount: number
  tibiaLength: number
  femurLength: number
  legThickness: number
  kneeAngle: number
  ankleAngle: number
  hipAngle: number
  footRotation: number
  stepAngle: number
  verticalShift: number
  springStiffness: number
  dampingFactor: number
}

type Props = {
  open: boolean
  onClose: () => void
  params: LegParams
  gltfUrl?: string
  defaultParams: LegParams
  onExport?: () => void
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 hover:bg-slate-800/30 px-2 rounded transition-colors">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="text-sm font-mono text-slate-200 font-semibold">{value}</div>
    </div>
  )
}

export default function DataModal({ open, onClose, params, gltfUrl = "", defaultParams, onExport }: Props) {
  const [activeTab, setActiveTab] = useState<'data' | 'rubric' | 'graphs' | 'math' | 'export'>('data')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'json' | 'txt'>('txt')
  const [includeGraphs, setIncludeGraphs] = useState(true)
  const [includeRubric, setIncludeRubric] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [teamMembers, setTeamMembers] = useState("")
  const [reflection, setReflection] = useState("")

  // Valores derivados
  const archLength = useMemo(() => params.footLength - params.heelRadius - 10, [params.footLength, params.heelRadius])
  const h = useMemo(() => params.heelRadius + archLength / 2, [params.heelRadius, archLength])
  const a = useMemo(() => {
    const half = archLength / 2
    return half !== 0 ? +(params.archHeight / Math.pow(half, 2)).toFixed(6) : 0
  }, [params.archHeight, archLength])

  // Funciones matemáticas del diseño
  const functions = useMemo(() => [
    {
      name: "Función del Arco (Parabólica)",
      type: "Cuadrática",
      equation: `y = ${a}(x - ${h.toFixed(2)})²`,
      description: "Define la curvatura del arco del pie",
      domain: `[${params.heelRadius}, ${params.footLength - 10}]`,
      purpose: "Simular la forma natural del arco plantar"
    },
    {
      name: "Función del Talón (Circular)",
      type: "Trigonométrica",
      equation: `x² + y² = ${params.heelRadius}²`,
      description: "Define la forma circular del talón",
      domain: `[0, ${params.heelRadius}]`,
      purpose: "Crear la base redondeada del pie"
    },
    {
      name: "Trayectoria de Pisada",
      type: "Lineal/Angular",
      equation: `θ = ${params.stepAngle}°, r = ${params.tibiaLength + params.femurLength}`,
      description: "Define el movimiento angular de la pisada",
      domain: `θ ∈ [0°, ${params.stepAngle}°]`,
      purpose: "Simular el ciclo de marcha"
    }
  ], [a, h, params])

  // Coordenadas polares
  const polarCoords = useMemo(() => {
    const footCenter = { x: h, y: 0 }
    const footRadius = Math.sqrt(Math.pow(params.footLength/2, 2) + Math.pow(params.archHeight, 2))
    
    return {
      center: footCenter,
      radius: footRadius.toFixed(3),
      angle: params.footRotation,
      equation: `r = ${footRadius.toFixed(3)}, θ = ${params.footRotation}°`,
      cartesianTopolar: `r = √(x² + y²), θ = arctan(y/x)`,
      polarToCartesian: `x = r·cos(θ), y = r·sin(θ)`
    }
  }, [h, params.footLength, params.archHeight, params.footRotation])

  // Transformaciones geométricas
  const transformations = useMemo(() => [
    {
      type: "Traslación",
      description: "Movimiento vertical del pie",
      formula: `T(x, y) = (x, y + ${params.verticalShift})`,
      applied: params.verticalShift !== 0,
      value: `${params.verticalShift} cm`
    },
    {
      type: "Rotación (Pie)",
      description: "Rotación del pie sobre su eje",
      formula: `R(θ) donde θ = ${params.footRotation}°`,
      applied: params.footRotation !== 0,
      value: `${params.footRotation}°`
    },
    {
      type: "Rotación (Tobillo)",
      description: "Ángulo de flexión del tobillo",
      formula: `R(θ) donde θ = ${params.ankleAngle}°`,
      applied: params.ankleAngle !== 0,
      value: `${params.ankleAngle}°`
    },
    {
      type: "Rotación (Rodilla)",
      description: "Ángulo de flexión de la rodilla",
      formula: `R(θ) donde θ = ${params.kneeAngle}°`,
      applied: params.kneeAngle !== 0,
      value: `${params.kneeAngle}°`
    }
  ], [params])

  // Comparación con valores por defecto
  const differences = useMemo(() => {
    const diffs: Array<{param: string, current: number, default: number, change: number}> = []
    Object.keys(params).forEach(key => {
      const k = key as keyof LegParams
      if (typeof params[k] === 'number' && typeof defaultParams[k] === 'number') {
        const curr = params[k] as number
        const def = defaultParams[k] as number
        if (Math.abs(curr - def) > 0.001) {
          diffs.push({
            param: key,
            current: curr,
            default: def,
            change: ((curr - def) / def * 100)
          })
        }
      }
    })
    return diffs
  }, [params, defaultParams])

  // Rúbrica EXACTA según el documento original
  const rubric = useMemo(() => {
    const hasFunctions = functions.length >= 3
    const hasTranslation = transformations.some(t => t.type.includes("Traslación") && t.applied)
    const hasRotation = transformations.some(t => t.type.includes("Rotación") && t.applied)
    const hasPolar = polarCoords.radius !== "0.000"
    const hasCalculations = !isNaN(a) && !isNaN(h) && a !== 0
    
    return {
      fase1_1: {
        criterion: "1. El informe incluye al menos 3 funciones diferentes (ej: lineal, cuadrática, trigonométrica) que definen el perfil del pie.",
        mark: hasFunctions ? "Sí" : "Parcialmente",
        points: hasFunctions ? 3 : 2,
        obs: hasFunctions 
          ? `✓ Incluye ${functions.length} funciones: parabólica (arco), circular (talón), angular (pisada)`
          : "Necesita documentar 3 funciones matemáticas distintas"
      },
      fase1_2: {
        criterion: "2. Se explica claramente el proceso de traslación de las funciones para posicionarlas correctamente en el plano.",
        mark: hasTranslation ? "Sí" : "Parcialmente",
        points: hasTranslation ? 3 : 2,
        obs: hasTranslation 
          ? `✓ Traslación vertical aplicada: ${params.verticalShift} cm`
          : "Documentar el proceso de traslación en el informe"
      },
      fase1_3: {
        criterion: "3. Se explica claramente el proceso de rotación de las funciones para lograr la curvatura deseada (ej: el movimiento del pie).",
        mark: hasRotation ? "Sí" : "Parcialmente",
        points: hasRotation ? 3 : 2,
        obs: hasRotation 
          ? `✓ Rotaciones aplicadas: pie=${params.footRotation}°, tobillo=${params.ankleAngle}°, rodilla=${params.kneeAngle}°`
          : "Documentar el proceso de rotación en el informe"
      },
      fase1_4: {
        criterion: "4. Se incluye y explica el uso de al menos una función o punto en coordenadas polares (ej: para definir la rotación o una trayectoria circular).",
        mark: hasPolar ? "Sí" : "Parcialmente",
        points: hasPolar ? 3 : 2,
        obs: hasPolar 
          ? `✓ Coordenadas polares: r=${polarCoords.radius} cm, θ=${polarCoords.angle}°`
          : "Incluir conversión a coordenadas polares en el informe"
      },
      fase1_5: {
        criterion: "5. Los cálculos y gráficos matemáticos son precisos y están presentados de forma ordenada.",
        mark: hasCalculations ? "Sí" : "Parcialmente",
        points: hasCalculations ? 3 : 2,
        obs: hasCalculations 
          ? `✓ Cálculos realizados: a=${a}, h=${h.toFixed(3)} cm, L=${archLength.toFixed(3)} cm`
          : "Generar gráficos con software como GeoGebra o Desmos"
      },
      fase2_6: {
        criterion: "6. La maqueta es tridimensional y estable.",
        mark: gltfUrl ? "Parcialmente" : "No",
        points: gltfUrl ? 2 : 1,
        obs: gltfUrl ? "Modelo 3D digital disponible. Construir maqueta física" : "Construir maqueta física tridimensional"
      },
      fase2_7: {
        criterion: "7. La forma de la maqueta se apega fielmente a las curvas definidas por las funciones matemáticas del diseño.",
        mark: hasFunctions ? "Parcialmente" : "No",
        points: hasFunctions ? 2 : 1,
        obs: "Verificar correspondencia entre maqueta física y funciones matemáticas"
      },
      fase2_8: {
        criterion: "8. Los materiales utilizados son apropiados y la construcción es ordenada y resistente.",
        mark: "No",
        points: 1,
        obs: "Documentar materiales utilizados (cartón, madera, plástico, etc.)"
      },
      fase2_9: {
        criterion: "9. La maqueta incluye un elemento móvil que simula el movimiento de la pisada (ej: una palanca que levanta el talón).",
        mark: params.springStiffness > 0 ? "Parcialmente" : "No",
        points: params.springStiffness > 0 ? 2 : 1,
        obs: params.springStiffness > 0 
          ? "Sistema de resortes simulado digitalmente. Implementar físicamente"
          : "Incluir mecanismo móvil en la maqueta física"
      },
      fase2_10: {
        criterion: "10. El trabajo en equipo fue efectivo y todos los integrantes participaron.",
        mark: "Parcialmente",
        points: 2,
        obs: "Documentar contribuciones de cada integrante del equipo"
      },
      fase3_11: {
        criterion: "11. La presentación escrita (informe) es clara y todos los miembros del equipo participan.",
        mark: "Parcialmente",
        points: 2,
        obs: "Completar informe escrito con participación de todos los miembros"
      },
      fase3_12: {
        criterion: "12. Se explica la conexión entre las matemáticas (funciones) y la forma física del pie.",
        mark: hasCalculations ? "Sí" : "Parcialmente",
        points: hasCalculations ? 3 : 2,
        obs: hasCalculations 
          ? "✓ Conexión matemática documentada con ecuaciones y parámetros"
          : "Explicar cómo las funciones definen la forma del pie"
      },
      fase3_13: {
        criterion: "13. Se muestra cómo se utilizaron las transformaciones geométricas (traslación y rotación) en el diseño.",
        mark: (hasTranslation && hasRotation) ? "Sí" : "Parcialmente",
        points: (hasTranslation && hasRotation) ? 3 : 2,
        obs: "Documentar todas las transformaciones geométricas aplicadas"
      },
      fase3_14: {
        criterion: "14. El informe final está completo, incluye todos los gráficos, cálculos y una reflexión sobre el proceso.",
        mark: "Parcialmente",
        points: 2,
        obs: "Incluir: gráficos, cálculos, fotos de maqueta y reflexión del proceso"
      },
      fase3_15: {
        criterion: "15. Se respeta el tiempo de entrega (1 semana). 12 diciembre 2025",
        mark: new Date() <= new Date('2025-12-12T23:59:59') ? "Sí" : "No",
        points: new Date() <= new Date('2025-12-12T23:59:59') ? 3 : 1,
        obs: `Fecha límite: 12 diciembre 2025. Hoy: ${new Date().toLocaleDateString('es-ES')}`
      }
    }
  }, [params, functions, transformations, polarCoords, a, h, archLength, gltfUrl])

  // Calcular puntuación total
  const totalScore = useMemo(() => {
    return Object.values(rubric).reduce((sum, item) => sum + item.points, 0)
  }, [rubric])

  // Función de exportación mejorada con PDF
  const handleExport = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    
    if (exportFormat === 'pdf') {
      generatePDF()
      return
    }
    
    if (exportFormat === 'json') {
      const exportData = {
        metadata: {
          exported: new Date().toISOString(),
          project: "Pierna Mecánica - Proyecto Matemáticas",
          deadline: "12 diciembre 2025",
          version: "2.0"
        },
        teamMembers: teamMembers.split(',').map(m => m.trim()).filter(Boolean),
        parameters: params,
        derived: { archLength, h, a },
        functions,
        polarCoordinates: polarCoords,
        transformations,
        gltfUrl,
        rubric: Object.entries(rubric).map(([key, val]) => ({
          id: key,
          ...val
        })),
        totalScore,
        maxScore: 45,
        differences,
        reflection
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pierna-mecanica-${timestamp}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      // Exportar como texto
      let content = `═══════════════════════════════════════════════════════════
   INFORME TÉCNICO - PIERNA MECÁNICA BIOMECÁNICA
   Proyecto de Integración: Matemáticas y Diseño 3D
═══════════════════════════════════════════════════════════

INFORMACIÓN DEL PROYECTO
────────────────────────────────────────────────────────────
Fecha de generación: ${new Date().toLocaleString('es-ES')}
Fecha límite: 12 diciembre 2025
Equipo: ${teamMembers || 'Por completar'}

═══════════════════════════════════════════════════════════
FASE 1: PLANIFICACIÓN Y DISEÑO MATEMÁTICO
═══════════════════════════════════════════════════════════

1. FUNCIONES MATEMÁTICAS DEL DISEÑO
────────────────────────────────────────────────────────────
`
      functions.forEach((fn, idx) => {
        content += `
${idx + 1}. ${fn.name} (${fn.type})
   Ecuación: ${fn.equation}
   Descripción: ${fn.description}
   Dominio: ${fn.domain}
   Propósito: ${fn.purpose}
`
      })

      content += `

2. PARÁMETROS DIMENSIONALES
────────────────────────────────────────────────────────────
Dimensiones del pie:
  • Longitud total del pie: ${params.footLength} cm
  • Altura del arco plantar: ${params.archHeight} cm
  • Radio del talón: ${params.heelRadius} cm
  • Número de dedos: ${params.toeCount}

Dimensiones de la pierna:
  • Longitud de la tibia: ${params.tibiaLength} cm
  • Longitud del fémur: ${params.femurLength} cm
  • Grosor de la pierna: ${params.legThickness} cm
  • Longitud total: ${(params.tibiaLength + params.femurLength + params.footLength).toFixed(2)} cm

Ángulos articulares:
  • Ángulo de rodilla: ${params.kneeAngle}°
  • Ángulo de tobillo: ${params.ankleAngle}°
  • Ángulo de cadera: ${params.hipAngle}°

3. CÁLCULOS MATEMÁTICOS DERIVADOS
────────────────────────────────────────────────────────────
Longitud del arco parabólico: ${archLength.toFixed(3)} cm
Parámetro h (centro de la parábola): ${h.toFixed(3)} cm
Constante parabólica a: ${a}

Ecuación principal del arco del pie:
  y = ${a}(x - ${h.toFixed(2)})²

Esta ecuación cuadrática modela la curvatura natural del arco 
plantar, donde:
  - El vértice está en x = ${h.toFixed(2)} cm
  - La altura máxima es ${params.archHeight} cm
  - La constante 'a' controla la apertura de la parábola

4. COORDENADAS POLARES
────────────────────────────────────────────────────────────
Sistema de coordenadas polares para el pie:
  Centro: (${polarCoords.center.x.toFixed(2)}, ${polarCoords.center.y.toFixed(2)})
  Radio: r = ${polarCoords.radius} cm
  Ángulo: θ = ${polarCoords.angle}°

Fórmulas de conversión:
  Cartesiano → Polar: ${polarCoords.cartesianTopolar}
  Polar → Cartesiano: ${polarCoords.polarToCartesian}

Ecuación en coordenadas polares:
  ${polarCoords.equation}

5. TRANSFORMACIONES GEOMÉTRICAS
────────────────────────────────────────────────────────────
`
      transformations.forEach((t, idx) => {
        content += `
${idx + 1}. ${t.type}
   Fórmula: ${t.formula}
   Estado: ${t.applied ? '✓ Aplicada' : '○ No aplicada'}
   Valor: ${t.value}
   Descripción: ${t.description}
`
      })

      if (differences.length > 0) {
        content += `

6. MODIFICACIONES RESPECTO A VALORES ESTÁNDAR
────────────────────────────────────────────────────────────
`
        differences.forEach(d => {
          content += `${d.param}: ${d.default.toFixed(2)} → ${d.current.toFixed(2)} (${d.change > 0 ? '+' : ''}${d.change.toFixed(1)}%)\n`
        })
      }

      content += `

═══════════════════════════════════════════════════════════
FASE 2: CONSTRUCCIÓN DE LA MAQUETA
═══════════════════════════════════════════════════════════

MATERIALES UTILIZADOS:
────────────────────────────────────────────────────────────
[Por completar por el equipo]
  • Material principal:
  • Material secundario:
  • Adhesivos:
  • Herramientas:

PROCESO DE CONSTRUCCIÓN:
────────────────────────────────────────────────────────────
[Por completar por el equipo]
1. 
2. 
3. 

ELEMENTO MÓVIL (MECANISMO DE PISADA):
────────────────────────────────────────────────────────────
${params.springStiffness > 0 ? `Sistema de amortiguación simulado:
  • Rigidez del resorte (k): ${params.springStiffness}
  • Factor de amortiguamiento: ${params.dampingFactor}
  
[Implementar físicamente en la maqueta]` : '[Por implementar]'}

═══════════════════════════════════════════════════════════
FASE 3: EVALUACIÓN Y RESULTADOS
═══════════════════════════════════════════════════════════

PUNTUACIÓN SEGÚN RÚBRICA
────────────────────────────────────────────────────────────
Puntuación obtenida: ${totalScore}/45 puntos (${((totalScore/45)*100).toFixed(1)}%)

Clasificación: ${
  totalScore >= 40 ? 'EXCELENTE ★★★★★' :
  totalScore >= 35 ? 'MUY BUENO ★★★★' :
  totalScore >= 30 ? 'BUENO ★★★' :
  totalScore >= 25 ? 'SATISFACTORIO ★★' :
  'NECESITA MEJORAR ★'
}

DETALLE POR CRITERIO:
────────────────────────────────────────────────────────────
`

      Object.entries(rubric).forEach(([key, val]) => {
        content += `
${val.criterion}
  Estado: ${val.mark} (${val.points}/3 puntos)
  Observación: ${val.obs}
`
      })

      if (reflection) {
        content += `

═══════════════════════════════════════════════════════════
REFLEXIÓN SOBRE EL PROCESO
═══════════════════════════════════════════════════════════

${reflection}

`
      }

      content += `
═══════════════════════════════════════════════════════════
RECOMENDACIONES PARA COMPLETAR EL PROYECTO
═══════════════════════════════════════════════════════════

1. ASPECTOS MATEMÁTICOS:
   □ Generar gráficos de todas las funciones usando GeoGebra o Desmos
   □ Incluir tabla de valores para cada función
   □ Mostrar cálculos paso a paso de las transformaciones
   □ Agregar diagrama de coordenadas polares

2. CONSTRUCCIÓN FÍSICA:
   □ Completar la maqueta tridimensional
   □ Documentar materiales y proceso con fotografías
   □ Implementar el mecanismo móvil de pisada
   □ Verificar estabilidad y resistencia

3. INFORME FINAL:
   □ Incluir portada con nombres del equipo
   □ Añadir introducción y objetivos
   □ Insertar todos los gráficos generados
   □ Incluir fotografías del proceso de construcción
   □ Agregar esta reflexión sobre el aprendizaje
   □ Conclusiones del proyecto

4. PRESENTACIÓN:
   □ Preparar presentación oral (5-10 minutos)
   □ Ensayar con todos los integrantes
   □ Llevar la maqueta física
   □ Preparar respuestas a posibles preguntas

═══════════════════════════════════════════════════════════
ANEXOS Y REFERENCIAS
═══════════════════════════════════════════════════════════

Para generar los gráficos matemáticos, visita:
  • GeoGebra: https://www.geogebra.org/calculator
  • Desmos: https://www.desmos.com/calculator

Recursos adicionales sobre biomecánica del pie:
  • [Agregar referencias bibliográficas]

═══════════════════════════════════════════════════════════
Documento generado automáticamente por el sistema de 
diseño de pierna mecánica biomecánica.
Versión 2.0 - ${new Date().toLocaleDateString('es-ES')}
═══════════════════════════════════════════════════════════
`

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `informe-pierna-mecanica-${timestamp}.txt`
      link.click()
      URL.revokeObjectURL(url)
    }

    if (onExport) onExport()
  }

  // Generar PDF
  const generatePDF = () => {
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Informe Pierna Mecánica</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', sans-serif; 
      padding: 40px; 
      line-height: 1.6; 
      color: #333;
      background: white;
    }
    .header { 
      text-align: center; 
      border-bottom: 4px solid #6366f1; 
      padding-bottom: 20px; 
      margin-bottom: 30px;
    }
    h1 { color: #6366f1; font-size: 28px; margin-bottom: 10px; }
    h2 { 
      color: #4f46e5; 
      font-size: 20px; 
      margin: 30px 0 15px 0; 
      padding: 10px; 
      background: #eef2ff;
      border-left: 5px solid #6366f1;
    }
    h3 { color: #6366f1; font-size: 16px; margin: 20px 0 10px 0; }
    .info-box { 
      background: #f9fafb; 
      border: 2px solid #e5e7eb; 
      padding: 15px; 
      margin: 15px 0; 
      border-radius: 8px;
    }
    .score { 
      text-align: center; 
      font-size: 48px; 
      font-weight: bold; 
      color: #10b981; 
      margin: 20px 0;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 15px 0;
      font-size: 12px;
    }
    th, td { 
      border: 1px solid #d1d5db; 
      padding: 10px; 
      text-align: left;
    }
    th { background: #eef2ff; color: #4f46e5; font-weight: bold; }
    .equation { 
      background: #fef3c7; 
      padding: 10px; 
      font-family: 'Courier New', monospace; 
      border-left: 4px solid #f59e0b;
      margin: 10px 0;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 2px solid #e5e7eb; 
      text-align: center; 
      color: #6b7280;
      font-size: 12px;
    }
    ul { margin: 10px 0 10px 20px; }
    li { margin: 5px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🦿 INFORME TÉCNICO</h1>
    <h2 style="background: none; border: none; padding: 0;">Pierna Mecánica Biomecánica</h2>
    <p><strong>Proyecto de Integración: Matemáticas y Diseño 3D</strong></p>
    <p>Fecha: ${new Date().toLocaleDateString('es-ES')} | Entrega: 12 diciembre 2025</p>
    ${teamMembers ? `<p><strong>Equipo:</strong> ${teamMembers}</p>` : ''}
  </div>

  <div class="score">
    ${totalScore}/45 puntos
    <div style="font-size: 18px; color: #6b7280;">${((totalScore/45)*100).toFixed(1)}% - ${
      totalScore >= 40 ? 'EXCELENTE' :
      totalScore >= 35 ? 'MUY BUENO' :
      totalScore >= 30 ? 'BUENO' : 'SATISFACTORIO'
    }</div>
  </div>

  <h2>📊 FASE 1: Planificación y Diseño Matemático</h2>

  <h3>1. Funciones Matemáticas del Diseño</h3>
  ${functions.map((fn, idx) => `
    <div class="info-box">
      <strong>${idx + 1}. ${fn.name} (${fn.type})</strong><br>
      <div class="equation">${fn.equation}</div>
      <em>${fn.description}</em><br>
      Dominio: ${fn.domain}<br>
      Propósito: ${fn.purpose}
    </div>
  `).join('')}

  <h3>2. Parámetros Dimensionales</h3>
  <div class="grid">
    <div>
      <strong>Dimensiones del pie:</strong>
      <ul>
        <li>Longitud total: ${params.footLength} cm</li>
        <li>Altura del arco: ${params.archHeight} cm</li>
        <li>Radio del talón: ${params.heelRadius} cm</li>
        <li>Número de dedos: ${params.toeCount}</li>
      </ul>
    </div>
    <div>
      <strong>Dimensiones de la pierna:</strong>
      <ul>
        <li>Tibia: ${params.tibiaLength} cm</li>
        <li>Fémur: ${params.femurLength} cm</li>
        <li>Grosor: ${params.legThickness} cm</li>
        <li>Total: ${(params.tibiaLength + params.femurLength + params.footLength).toFixed(2)} cm</li>
      </ul>
    </div>
  </div>

  <h3>3. Cálculos Matemáticos Derivados</h3>
  <div class="info-box">
    <strong>Ecuación principal del arco:</strong>
    <div class="equation">y = ${a}(x - ${h.toFixed(2)})²</div>
    <ul>
      <li>Longitud del arco: ${archLength.toFixed(3)} cm</li>
      <li>Parámetro h (centro): ${h.toFixed(3)} cm</li>
      <li>Constante parabólica a: ${a}</li>
    </ul>
  </div>

  <h3>4. Coordenadas Polares</h3>
  <div class="info-box">
    <strong>Sistema polar:</strong> r = ${polarCoords.radius} cm, θ = ${polarCoords.angle}°<br><br>
    <strong>Conversiones:</strong><br>
    Cartesiano → Polar: ${polarCoords.cartesianTopolar}<br>
    Polar → Cartesiano: ${polarCoords.polarToCartesian}
  </div>

  <h3>5. Transformaciones Geométricas</h3>
  <table>
    <tr>
      <th>Tipo</th>
      <th>Fórmula</th>
      <th>Estado</th>
      <th>Valor</th>
    </tr>
    ${transformations.map(t => `
      <tr>
        <td><strong>${t.type}</strong></td>
        <td style="font-family: monospace;">${t.formula}</td>
        <td>${t.applied ? '✓ Aplicada' : '○ No aplicada'}</td>
        <td>${t.value}</td>
      </tr>
    `).join('')}
  </table>

  <h2>🔨 FASE 2: Construcción de la Maqueta</h2>
  
  <div class="info-box">
    <h3>Materiales y Construcción</h3>
    <p><em>[Sección a completar por el equipo con fotos y descripción del proceso]</em></p>
    <ul>
      <li>Material principal:</li>
      <li>Material secundario:</li>
      <li>Adhesivos utilizados:</li>
      <li>Herramientas necesarias:</li>
    </ul>
  </div>

  ${params.springStiffness > 0 ? `
  <div class="info-box">
    <h3>Sistema de Amortiguación</h3>
    <ul>
      <li>Rigidez del resorte (k): ${params.springStiffness}</li>
      <li>Factor de amortiguamiento: ${params.dampingFactor}</li>
    </ul>
    <p><em>Sistema simulado digitalmente - Implementar físicamente en la maqueta</em></p>
  </div>
  ` : ''}

  <h2>📋 FASE 3: Evaluación Según Rúbrica</h2>

  <table>
    <tr>
      <th style="width: 50%;">Criterio</th>
      <th>Sí (3)</th>
      <th>Parcial (2)</th>
      <th>No (1)</th>
      <th>Puntos</th>
    </tr>
    ${Object.values(rubric).map(val => `
      <tr>
        <td>${val.criterion}</td>
        <td style="text-align: center;">${val.mark === 'Sí' ? '✓' : ''}</td>
        <td style="text-align: center;">${val.mark === 'Parcialmente' ? '✓' : ''}</td>
        <td style="text-align: center;">${val.mark === 'No' ? '✓' : ''}</td>
        <td style="text-align: center; font-weight: bold;">${val.points}</td>
      </tr>
    `).join('')}
  </table>

  ${reflection ? `
  <h2>💭 Reflexión sobre el Proceso</h2>
  <div class="info-box">
    <p>${reflection}</p>
  </div>
  ` : ''}

  <h2>✅ Recomendaciones para Completar el Proyecto</h2>
  <div class="grid">
    <div>
      <h3>Aspectos Matemáticos:</h3>
      <ul>
        <li>Generar gráficos con GeoGebra/Desmos</li>
        <li>Incluir tabla de valores</li>
        <li>Mostrar cálculos paso a paso</li>
        <li>Diagrama de coordenadas polares</li>
      </ul>
    </div>
    <div>
      <h3>Construcción Física:</h3>
      <ul>
        <li>Completar maqueta 3D</li>
        <li>Documentar con fotografías</li>
        <li>Implementar mecanismo móvil</li>
        <li>Verificar estabilidad</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <p><strong>Documento generado automáticamente</strong></p>
    <p>Sistema de diseño de pierna mecánica biomecánica v2.0</p>
    <p>${new Date().toLocaleString('es-ES')}</p>
  </div>
</body>
</html>
`

    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => {
        setTimeout(() => {
          win.print()
          URL.revokeObjectURL(url)
        }, 250)
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-7xl max-h-[92vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 border border-purple-500/30 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 border-b border-purple-500/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🦿</span>
                Análisis Completo — Pierna Mecánica
              </h3>
              <p className="text-sm text-slate-300 mt-2">
                Proyecto de Integración Matemática • Entrega: 12 diciembre 2025
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-slate-800/80 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 font-medium"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {[
              { id: 'data', label: '📊 Datos', icon: '📊' },
             /*  { id: 'math', label: '📐 Matemáticas', icon: '📐' },
              { id: 'graphs', label: '📈 Gráficos', icon: '📈' },
              { id: 'rubric', label: '📋 Rúbrica', icon: '📋' },
              { id: 'export', label: '💾 Exportar', icon: '💾' } */
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(92vh-200px)] p-6">
          
          {/* Tab: Datos */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Resumen rápido */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4 rounded-xl border border-purple-500/20">
                <h4 className="text-lg font-bold text-purple-300 mb-3">📈 Resumen Rápido</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Puntuación Total</div>
                    <div className="text-2xl font-bold text-white">{totalScore}<span className="text-sm text-slate-400">/45</span></div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Porcentaje</div>
                    <div className="text-2xl font-bold text-white">{((totalScore/45)*100).toFixed(0)}<span className="text-sm text-slate-400">%</span></div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Longitud Total</div>
                    <div className="text-2xl font-bold text-white">{(params.femurLength + params.tibiaLength + params.footLength).toFixed(0)}<span className="text-sm text-slate-400">cm</span></div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Constante (a)</div>
                    <div className="text-2xl font-bold text-white">{a.toFixed(4)}</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <div className="text-xs text-slate-400">Días restantes</div>
                    <div className="text-2xl font-bold text-white">
                      {Math.max(0, Math.ceil((new Date('2025-12-12').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Parámetros principales */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>⚙️</span> Parámetros Principales
                  </h4>
                  <div className="space-y-1">
                    {gltfUrl && <Row label="🎨 Modelo 3D" value="Disponible" />}
                    <Row label="📏 Longitud pie" value={`${params.footLength} cm`} />
                    <Row label="🌉 Altura arco" value={`${params.archHeight} cm`} />
                    <Row label="⚪ Radio talón" value={`${params.heelRadius} cm`} />
                    <Row label="👣 Dedos" value={params.toeCount} />
                    <Row label="🦴 Tibia" value={`${params.tibiaLength} cm`} />
                    <Row label="🦴 Fémur" value={`${params.femurLength} cm`} />
                    <Row label="📐 Grosor" value={`${params.legThickness} cm`} />
                  </div>
                </div>

                {/* Ángulos */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>📐</span> Ángulos y Rotaciones
                  </h4>
                  <div className="space-y-1">
                    <Row label="🔄 Rodilla" value={`${params.kneeAngle}°`} />
                    <Row label="🔄 Tobillo" value={`${params.ankleAngle}°`} />
                    <Row label="🔄 Cadera" value={`${params.hipAngle}°`} />
                    <Row label="🔄 Rotación pie" value={`${params.footRotation}°`} />
                    <Row label="👟 Ángulo de paso" value={`${params.stepAngle}°`} />
                    <Row label="⬆️ Shift vertical" value={`${params.verticalShift} cm`} />
                  </div>
                </div>

                {/* Cálculos derivados */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>🔬</span> Cálculos Matemáticos
                  </h4>
                  <div className="space-y-1">
                    <Row label="📊 Longitud arco" value={`${archLength.toFixed(3)} cm`} />
                    <Row label="📍 Parámetro h" value={`${h.toFixed(3)} cm`} />
                    <Row label="📈 Constante a" value={a.toFixed(6)} />
                    <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-purple-300 mb-1">Ecuación del arco:</div>
                      <div className="font-mono text-sm text-white">
                        y = {a}(x - {h.toFixed(2)})²
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sistema físico */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>🔧</span> Sistema de Amortiguación
                  </h4>
                  <div className="space-y-1">
                    <Row label="💪 Rigidez (k)" value={params.springStiffness} />
                    <Row label="🌊 Damping (c)" value={params.dampingFactor} />
                    <Row label="📅 Fecha" value={new Date().toLocaleDateString('es-ES')} />
                    <Row label="🕐 Hora" value={new Date().toLocaleTimeString('es-ES')} />
                  </div>
                </div>
              </div>

              {/* Cambios respecto a valores por defecto */}
              {differences.length > 0 && (
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>🔄</span> Modificaciones Realizadas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {differences.map((d, idx) => (
                      <div key={idx} className="bg-slate-900/50 p-3 rounded-lg">
                        <div className="text-sm text-slate-400 mb-1">{d.param}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 line-through">{d.default.toFixed(2)}</span>
                          <span className="text-white font-bold">{d.current.toFixed(2)}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            d.change > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {d.change > 0 ? '+' : ''}{d.change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Matemáticas */}
          {activeTab === 'math' && (
            <div className="space-y-6">
              {/* Funciones */}
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-xl font-bold text-purple-300 mb-4">📐 Funciones Matemáticas del Diseño</h4>
                <div className="space-y-4">
                  {functions.map((fn, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="text-lg font-semibold text-white">{idx + 1}. {fn.name}</h5>
                          <div className="text-xs text-purple-400 mt-1">Tipo: {fn.type}</div>
                        </div>
                        <span className="text-2xl">{idx === 0 ? '📊' : idx === 1 ? '⭕' : '↗️'}</span>
                      </div>
                      <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30 mb-2">
                        <div className="font-mono text-yellow-200 text-lg">{fn.equation}</div>
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <div><strong>Descripción:</strong> {fn.description}</div>
                        <div><strong>Dominio:</strong> {fn.domain}</div>
                        <div><strong>Propósito:</strong> {fn.purpose}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordenadas Polares */}
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-xl font-bold text-purple-300 mb-4">🔵 Coordenadas Polares</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h5 className="text-white font-semibold mb-3">Sistema Polar del Pie</h5>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div><strong>Radio (r):</strong> {polarCoords.radius} cm</div>
                      <div><strong>Ángulo (θ):</strong> {polarCoords.angle}°</div>
                      <div className="bg-purple-900/20 p-2 rounded mt-2">
                        <div className="font-mono text-purple-200">{polarCoords.equation}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h5 className="text-white font-semibold mb-3">Fórmulas de Conversión</h5>
                    <div className="space-y-2 text-sm">
                      <div className="bg-blue-900/20 p-2 rounded">
                        <div className="text-blue-300 font-semibold mb-1">Cartesiano → Polar:</div>
                        <div className="font-mono text-blue-200 text-xs">{polarCoords.cartesianTopolar}</div>
                      </div>
                      <div className="bg-green-900/20 p-2 rounded">
                        <div className="text-green-300 font-semibold mb-1">Polar → Cartesiano:</div>
                        <div className="font-mono text-green-200 text-xs">{polarCoords.polarToCartesian}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transformaciones */}
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-xl font-bold text-purple-300 mb-4">🔄 Transformaciones Geométricas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transformations.map((t, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      t.applied ? 'bg-green-900/20 border-green-500/30' : 'bg-slate-900/50 border-slate-700/30'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-white font-semibold">{t.type}</h5>
                        <span className="text-xl">{t.applied ? '✓' : '○'}</span>
                      </div>
                      <div className="text-sm text-slate-300 space-y-1">
                        <div className="bg-slate-950/50 p-2 rounded font-mono text-xs">{t.formula}</div>
                        <div><strong>Valor:</strong> {t.value}</div>
                        <div className="text-xs text-slate-400">{t.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Gráficos */}
          {activeTab === 'graphs' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/20">
                <h4 className="text-lg font-bold text-blue-300 mb-2">📈 Guía para Generar Gráficos</h4>
                <p className="text-sm text-slate-300">
                  Usa las ecuaciones y datos a continuación para crear gráficos profesionales con GeoGebra o Desmos
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico 1: Arco parabólico */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h5 className="text-lg font-bold text-purple-300 mb-3">1️⃣ Gráfico del Arco Parabólico</h5>
                  <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30 mb-3">
                    <div className="font-mono text-yellow-200">y = {a}(x - {h.toFixed(2)})²</div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div><strong>Para GeoGebra/Desmos:</strong></div>
                    <div className="bg-slate-900/50 p-2 rounded font-mono text-xs">
                      f(x) = {a}*(x - {h.toFixed(2)})^2<br/>
                      Dominio: {params.heelRadius} ≤ x ≤ {params.footLength - 10}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      💡 Ajusta la ventana de visualización para ver toda la curva
                    </div>
                  </div>
                </div>

                {/* Gráfico 2: Talón circular */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h5 className="text-lg font-bold text-purple-300 mb-3">2️⃣ Gráfico del Talón (Circular)</h5>
                  <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30 mb-3">
                    <div className="font-mono text-yellow-200">x² + y² = {params.heelRadius}²</div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div><strong>Para GeoGebra/Desmos:</strong></div>
                    <div className="bg-slate-900/50 p-2 rounded font-mono text-xs">
                      x^2 + y^2 = {Math.pow(params.heelRadius, 2).toFixed(2)}<br/>
                      O usar: sqrt({params.heelRadius}^2 - x^2)
                    </div>
                  </div>
                </div>

                {/* Gráfico 3: Coordenadas polares */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h5 className="text-lg font-bold text-purple-300 mb-3">3️⃣ Representación en Polares</h5>
                  <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30 mb-3">
                    <div className="font-mono text-yellow-200">r = {polarCoords.radius}, θ = {polarCoords.angle}°</div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div><strong>Para GeoGebra/Desmos:</strong></div>
                    <div className="bg-slate-900/50 p-2 rounded font-mono text-xs">
                      r = {polarCoords.radius}<br/>
                      θ = {polarCoords.angle * Math.PI / 180} (en radianes)
                    </div>
                  </div>
                </div>

                {/* Tabla de valores */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h5 className="text-lg font-bold text-purple-300 mb-3">📊 Tabla de Valores Sugerida</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-900/50">
                          <th className="p-2 border border-slate-700">x</th>
                          <th className="p-2 border border-slate-700">y (arco)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 0.25, 0.5, 0.75, 1].map(factor => {
                          const x = params.heelRadius + (archLength * factor)
                          const y = a * Math.pow(x - h, 2)
                          return (
                            <tr key={factor}>
                              <td className="p-2 border border-slate-700 text-center">{x.toFixed(2)}</td>
                              <td className="p-2 border border-slate-700 text-center">{y.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Enlaces útiles */}
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                <h5 className="text-white font-semibold mb-3">🔗 Herramientas Recomendadas</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/50 p-3 rounded">
                    <div className="text-blue-300 font-semibold">GeoGebra</div>
                    <div className="text-slate-400 text-xs">https://www.geogebra.org/calculator</div>
                    <div className="text-slate-500 text-xs mt-1">✓ Funciones 2D y 3D</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded">
                    <div className="text-green-300 font-semibold">Desmos</div>
                    <div className="text-slate-400 text-xs">https://www.desmos.com/calculator</div>
                    <div className="text-slate-500 text-xs mt-1">✓ Interfaz sencilla</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Rúbrica */}
          {activeTab === 'rubric' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-xl border border-green-500/20">
                <h4 className="text-lg font-bold text-green-300 mb-2">Evaluación Global</h4>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-white">{totalScore}</div>
                  <div>
                    <div className="text-sm text-slate-300">de 45 puntos posibles</div>
                    <div className="text-xs text-slate-400">
                      {totalScore >= 40 ? '🌟 EXCELENTE' : totalScore >= 35 ? '✅ MUY BUENO' : totalScore >= 30 ? '👍 BUENO' : '📝 SATISFACTORIO'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${(totalScore / 45) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-1 text-right">{((totalScore/45)*100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50">
                      <th className="p-3 text-left text-slate-300 font-semibold border border-slate-700">Criterio</th>
                      <th className="p-3 text-center text-slate-300 font-semibold w-20 border border-slate-700">Sí<br/>(3)</th>
                      <th className="p-3 text-center text-slate-300 font-semibold w-28 border border-slate-700">Parcial<br/>(2)</th>
                      <th className="p-3 text-center text-slate-300 font-semibold w-20 border border-slate-700">No<br/>(1)</th>
                      <th className="p-3 text-center text-slate-300 font-semibold w-24 border border-slate-700">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Fase 1 */}
                    <tr className="bg-purple-900/20">
                      <td colSpan={5} className="p-2 font-bold text-purple-300 border border-slate-700">
                        FASE 1: Planificación y Diseño (Matemático)
                      </td>
                    </tr>
                    {Object.entries(rubric).slice(0, 5).map(([key, val], idx) => (
                      <tr key={key} className="hover:bg-slate-800/30 transition-colors border-b border-slate-700">
                        <td className="p-3 text-slate-200 text-xs border border-slate-700">{val.criterion}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Sí" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Parcialmente" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "No" ? "✓" : ""}</td>
                        <td className="p-3 text-center border border-slate-700">
                          <span className={`px-2 py-1 rounded font-bold text-sm ${
                            val.points === 3 ? 'bg-green-500/20 text-green-400' :
                            val.points === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {val.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fase 2 */}
                    <tr className="bg-blue-900/20">
                      <td colSpan={5} className="p-2 font-bold text-blue-300 border border-slate-700">
                        FASE 2: Construcción Física (Maqueta)
                      </td>
                    </tr>
                    {Object.entries(rubric).slice(5, 10).map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-800/30 transition-colors border-b border-slate-700">
                        <td className="p-3 text-slate-200 text-xs border border-slate-700">{val.criterion}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Sí" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Parcialmente" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "No" ? "✓" : ""}</td>
                        <td className="p-3 text-center border border-slate-700">
                          <span className={`px-2 py-1 rounded font-bold text-sm ${
                            val.points === 3 ? 'bg-green-500/20 text-green-400' :
                            val.points === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {val.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Fase 3 */}
                    <tr className="bg-green-900/20">
                      <td colSpan={5} className="p-2 font-bold text-green-300 border border-slate-700">
                        FASE 3: Presentación Final e Informe
                      </td>
                    </tr>
                    {Object.entries(rubric).slice(10).map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-800/30 transition-colors border-b border-slate-700">
                        <td className="p-3 text-slate-200 text-xs border border-slate-700">{val.criterion}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Sí" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "Parcialmente" ? "✓" : ""}</td>
                        <td className="p-3 text-center text-2xl border border-slate-700">{val.mark === "No" ? "✓" : ""}</td>
                        <td className="p-3 text-center border border-slate-700">
                          <span className={`px-2 py-1 rounded font-bold text-sm ${
                            val.points === 3 ? 'bg-green-500/20 text-green-400' :
                            val.points === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {val.points}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Observaciones */}
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-lg font-bold text-purple-300 mb-3">💡 Observaciones Detalladas</h4>
                <div className="space-y-2 text-sm">
                  {Object.values(rubric).map((val, idx) => val.obs && val.obs.includes('✓') && (
                    <div key={idx} className="flex items-start gap-2 text-green-400">
                      <span>✓</span>
                      <span>{val.obs}</span>
                    </div>
                  ))}
                  {Object.values(rubric).map((val, idx) => val.obs && !val.obs.includes('✓') && (
                    <div key={idx} className="flex items-start gap-2 text-yellow-400">
                      <span>⚠</span>
                      <span>{val.obs}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-lg font-bold text-purple-300 mb-3">📈 Recomendaciones para Mejorar</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {totalScore < 40 && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>Completar la construcción física de la maqueta con materiales apropiados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>Generar gráficos detallados de las funciones matemáticas utilizadas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>Documentar el proceso de trabajo en equipo y las contribuciones individuales</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>Implementar el elemento móvil en la maqueta física</span>
                      </li>
                    </>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>Los cálculos matemáticos están correctamente implementados</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Exportar */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/20">
                <h4 className="text-lg font-bold text-blue-300 mb-2">💾 Exportación de Datos</h4>
                <p className="text-sm text-slate-300">
                  Exporta todos los datos del proyecto en diferentes formatos para incluir en tu informe
                </p>
              </div>

              {/* Información del equipo */}
              <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                <h4 className="text-md font-bold text-purple-300 mb-4">👥 Información del Equipo</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Integrantes del equipo (separados por comas)</label>
                    <input
                      type="text"
                      value={teamMembers}
                      onChange={(e) => setTeamMembers(e.target.value)}
                      placeholder="Juan Pérez, María García, Carlos López..."
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Reflexión sobre el proceso (opcional)</label>
                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Describe tu experiencia, aprendizajes y desafíos durante el proyecto..."
                      rows={4}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opciones de formato */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-md font-bold text-purple-300 mb-4">📄 Formato de Exportación</h4>
                  <div className="space-y-3">
                    {[
                      { value: 'txt', label: 'Texto Plano (.txt)', icon: '📝', desc: 'Formato legible, fácil de copiar y pegar' },
                      { value: 'json', label: 'JSON (.json)', icon: '🔧', desc: 'Datos estructurados para procesamiento' },
                      { value: 'pdf', label: 'PDF (.pdf)', icon: '📄', desc: 'Documento profesional listo para imprimir' }
                    ].map(format => (
                      <label
                        key={format.value}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          exportFormat === format.value
                            ? 'bg-purple-500/20 border-purple-500'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={format.value}
                          checked={exportFormat === format.value}
                          onChange={(e) => setExportFormat(e.target.value as any)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-white font-semibold">
                            <span>{format.icon}</span>
                            {format.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{format.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Opciones de contenido */}
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="text-md font-bold text-purple-300 mb-4">📦 Contenido a Incluir</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 cursor-not-allowed opacity-60">
                      <input type="checkbox" checked disabled className="w-4 h-4" />
                      <div>
                        <div className="text-white font-semibold">Parámetros del modelo</div>
                        <div className="text-xs text-slate-400">Todas las dimensiones y ángulos</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 cursor-not-allowed opacity-60">
                      <input type="checkbox" checked disabled className="w-4 h-4" />
                      <div>
                        <div className="text-white font-semibold">Funciones matemáticas</div>
                        <div className="text-xs text-slate-400">Ecuaciones y cálculos derivados</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeRubric}
                        onChange={(e) => setIncludeRubric(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="text-white font-semibold">Evaluación (rúbrica)</div>
                        <div className="text-xs text-slate-400">Puntuación y observaciones</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeGraphs}
                        onChange={(e) => setIncludeGraphs(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="text-white font-semibold">Información de gráficos</div>
                        <div className="text-xs text-slate-400">Referencias para generar gráficos</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={includePhotos}
                        onChange={(e) => setIncludePhotos(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="text-white font-semibold">Espacios para fotos</div>
                        <div className="text-xs text-slate-400">Placeholders para documentación visual</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4">
                <button
                  onClick={handleExport}
                  className="flex-1 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">{exportFormat === 'pdf' ? '🖨️' : '⬇️'}</span>
                  {exportFormat === 'pdf' ? 'Generar e Imprimir PDF' : `Descargar ${exportFormat.toUpperCase()}`}
                </button>
                
                <button
                  onClick={() => {
                    const data = JSON.stringify({
                      params,
                      functions,
                      transformations,
                      polarCoords,
                      derived: { archLength, h, a },
                      rubric,
                      totalScore
                    }, null, 2)
                    navigator.clipboard.writeText(data)
                    alert('✓ Datos copiados al portapapeles')
                  }}
                  className="px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <span>📋</span>
                  Copiar
                </button>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold text-white mb-2">Consejos para completar tu informe:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Usa los datos exportados como base para tu documento</li>
                      <li>• Genera gráficos con GeoGebra o Desmos usando las ecuaciones proporcionadas</li>
                      <li>• Incluye fotografías del proceso de construcción de la maqueta</li>
                      <li>• Documenta las contribuciones de cada miembro del equipo</li>
                      <li>• Añade una introducción y conclusiones personales</li>
                      <li>• Revisa la ortografía y formato antes de entregar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

   
      </div>
    </div>
  )
}