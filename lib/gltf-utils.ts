// gltf-utils.ts - Helper utilities para gestión de archivos GLTF/GLB

import React from "react"

export interface GLTFValidation {
  isValid: boolean
  isGLB: boolean
  hasEmbeddedTextures: boolean
  externalFiles: ExternalFile[]
  errors: string[]
  warnings: string[]
  metadata: GLTFMetadata
}

export interface ExternalFile {
  type: 'buffer' | 'image'
  uri: string
  fileName: string
  found: boolean
}

export interface GLTFMetadata {
  version: string
  generator?: string
  meshCount: number
  materialCount: number
  textureCount: number
  animationCount: number
}

/**
 * Analiza un archivo GLTF/GLB y retorna información detallada
 */
export async function analyzeGLTFFile(file: File): Promise<GLTFValidation> {
  const isGLB = file.name.toLowerCase().endsWith('.glb')
  
  if (isGLB) {
    return analyzeGLB(file)
  } else {
    return analyzeGLTFJSON(file)
  }
}

/**
 * Analiza un archivo GLB binario
 */
async function analyzeGLB(file: File): Promise<GLTFValidation> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const view = new DataView(arrayBuffer)
    
    // Verificar magic number (0x46546C67 = "glTF")
    const magic = view.getUint32(0, true)
    if (magic !== 0x46546C67) {
      return {
        isValid: false,
        isGLB: true,
        hasEmbeddedTextures: false,
        externalFiles: [],
        errors: ['Archivo GLB inválido: magic number incorrecto'],
        warnings: [],
        metadata: getDefaultMetadata()
      }
    }
    
    // Leer versión
    const version = view.getUint32(4, true)
    
    return {
      isValid: true,
      isGLB: true,
      hasEmbeddedTextures: true,
      externalFiles: [],
      errors: [],
      warnings: [],
      metadata: {
        version: version.toString(),
        meshCount: 0, // Requiere parseo completo
        materialCount: 0,
        textureCount: 0,
        animationCount: 0
      }
    }
  } catch (error) {
    return {
      isValid: false,
      isGLB: true,
      hasEmbeddedTextures: false,
      externalFiles: [],
      errors: [`Error al leer GLB: ${error}`],
      warnings: [],
      metadata: getDefaultMetadata()
    }
  }
}

/**
 * Analiza un archivo GLTF JSON
 */
async function analyzeGLTFJSON(file: File): Promise<GLTFValidation> {
  try {
    const text = await file.text()
    const gltf = JSON.parse(text)
    
    const externalFiles: ExternalFile[] = []
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validar estructura básica
    if (!gltf.asset) {
      errors.push('Falta el campo "asset" requerido')
    }
    
    // Analizar buffers
    if (gltf.buffers) {
      gltf.buffers.forEach((buffer: any, index: number) => {
        if (buffer.uri) {
          if (buffer.uri.startsWith('data:')) {
            // Buffer embebido
          } else {
            // Buffer externo
            externalFiles.push({
              type: 'buffer',
              uri: buffer.uri,
              fileName: buffer.uri.split('/').pop() || buffer.uri,
              found: false
            })
          }
        } else {
          warnings.push(`Buffer ${index} no tiene URI`)
        }
      })
    }
    
    // Analizar imágenes/texturas
    if (gltf.images) {
      gltf.images.forEach((image: any, index: number) => {
        if (image.uri) {
          if (image.uri.startsWith('data:')) {
            // Textura embebida
          } else {
            // Textura externa
            externalFiles.push({
              type: 'image',
              uri: image.uri,
              fileName: image.uri.split('/').pop() || image.uri,
              found: false
            })
          }
        } else if (!image.bufferView) {
          warnings.push(`Imagen ${index} no tiene URI ni bufferView`)
        }
      })
    }
    
    // Extraer metadata
    const metadata: GLTFMetadata = {
      version: gltf.asset?.version || '2.0',
      generator: gltf.asset?.generator,
      meshCount: gltf.meshes?.length || 0,
      materialCount: gltf.materials?.length || 0,
      textureCount: gltf.textures?.length || 0,
      animationCount: gltf.animations?.length || 0
    }
    
    return {
      isValid: errors.length === 0,
      isGLB: false,
      hasEmbeddedTextures: externalFiles.length === 0,
      externalFiles,
      errors,
      warnings,
      metadata
    }
  } catch (error) {
    return {
      isValid: false,
      isGLB: false,
      hasEmbeddedTextures: false,
      externalFiles: [],
      errors: [`Error al parsear JSON: ${error}`],
      warnings: [],
      metadata: getDefaultMetadata()
    }
  }
}

/**
 * Verifica si todos los archivos externos están disponibles
 */
export async function validateExternalFiles(
  validation: GLTFValidation,
  availableFiles: File[]
): Promise<GLTFValidation> {
  const updatedFiles = validation.externalFiles.map(extFile => {
    const found = availableFiles.some(f => 
      f.name === extFile.fileName || 
      f.name.endsWith(extFile.fileName)
    )
    return { ...extFile, found }
  })
  
  const missingFiles = updatedFiles.filter(f => !f.found)
  const newWarnings = missingFiles.length > 0
    ? [`Faltan ${missingFiles.length} archivos externos`]
    : []
  
  return {
    ...validation,
    externalFiles: updatedFiles,
    warnings: [...validation.warnings, ...newWarnings]
  }
}

/**
 * Genera instrucciones de instalación para archivos GLTF
 */
export function generateInstallInstructions(
  validation: GLTFValidation,
  fileName: string
): string {
  if (validation.isGLB) {
    return `
✅ Archivo GLB detectado - ¡Listo para usar!

📁 Estructura recomendada:
/public
  /models
    ${fileName}

📝 Código de uso:
\`\`\`tsx
<GLTFModel url="/models/${fileName}" params={params} />
\`\`\`
`
  }
  
  const instructions = [`
📁 Estructura de archivos necesaria:
/public
  /models
    /${fileName.replace('.gltf', '')}
      ├── ${fileName}
`]
  
  // Agregar archivos externos
  const buffers = validation.externalFiles.filter(f => f.type === 'buffer')
  const images = validation.externalFiles.filter(f => f.type === 'image')
  
  if (buffers.length > 0) {
    instructions.push('      ├── Buffers:')
    buffers.forEach(buf => {
      instructions.push(`      │   ├── ${buf.fileName} ${buf.found ? '✅' : '❌'}`)
    })
  }
  
  if (images.length > 0) {
    instructions.push('      └── Texturas:')
    images.forEach((img, i) => {
      const isLast = i === images.length - 1
      instructions.push(`          ${isLast ? '└' : '├'}── ${img.fileName} ${img.found ? '✅' : '❌'}`)
    })
  }
  
  instructions.push(`
📝 Código de uso:
\`\`\`tsx
<GLTFModel 
  url="/models/${fileName.replace('.gltf', '')}/${fileName}" 
  params={params} 
/>
\`\`\`
`)
  
  if (!validation.hasEmbeddedTextures) {
    instructions.push(`
⚠️ Recomendación: Convierte a GLB para facilitar el manejo
https://products.aspose.app/3d/conversion/gltf-to-glb
`)
  }
  
  return instructions.join('\n')
}

/**
 * Genera código React listo para usar
 */
export function generateReactCode(
  modelUrl: string,
  validation: GLTFValidation
): string {
  const comments = validation.warnings.length > 0
    ? `// ⚠️ Advertencias:\n${validation.warnings.map(w => `//   - ${w}`).join('\n')}\n\n`
    : ''
  
  return `${comments}import { GLTFModel } from '@/components/GLTFModel'

function LegViewer() {
  const params = {
    footRotation: 0,
    hipAngle: 0,
    stepAngle: 0,
    verticalShift: 0,
    footLength: 26,
    tibiaLength: 42,
    femurLength: 41,
    legThickness: 6
  }

  return (
    <GLTFModel 
      url="${modelUrl}"
      params={params}
      onError={(error) => {
        if (error) console.error('Error cargando modelo:', error)
      }}
    />
  )
}

export default LegViewer
`
}

/**
 * Crea un objeto URL para archivo local
 */
export function createModelURL(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Limpia URLs de objetos creados
 */
export function revokeModelURL(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * Formatea el tamaño de archivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Valida extensión de archivo
 */
export function isValidModelFile(fileName: string): boolean {
  return /\.(gltf|glb)$/i.test(fileName)
}

/**
 * Extrae el nombre base del archivo sin extensión
 */
export function getModelBaseName(fileName: string): string {
  return fileName.replace(/\.(gltf|glb)$/i, '')
}

function getDefaultMetadata(): GLTFMetadata {
  return {
    version: 'unknown',
    meshCount: 0,
    materialCount: 0,
    textureCount: 0,
    animationCount: 0
  }
}

// Hook React para gestión de archivos GLTF
export function useGLTFManager() {
  const [validation, setValidation] = React.useState<GLTFValidation | null>(null)
  const [modelUrl, setModelUrl] = React.useState<string>('')
  const [loading, setLoading] = React.useState(false)
  
  const loadFile = async (file: File) => {
    setLoading(true)
    try {
      const result = await analyzeGLTFFile(file)
      setValidation(result)
      
      if (result.isValid) {
        const url = createModelURL(file)
        setModelUrl(url)
      }
    } catch (error) {
      console.error('Error loading file:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const reset = () => {
    if (modelUrl) {
      revokeModelURL(modelUrl)
    }
    setModelUrl('')
    setValidation(null)
  }
  
  return {
    validation,
    modelUrl,
    loading,
    loadFile,
    reset
  }
}

// Exportar todo
export default {
  analyzeGLTFFile,
  validateExternalFiles,
  generateInstallInstructions,
  generateReactCode,
  createModelURL,
  revokeModelURL,
  formatFileSize,
  isValidModelFile,
  getModelBaseName
}