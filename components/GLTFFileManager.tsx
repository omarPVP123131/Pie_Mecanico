import React, { useState, useRef } from 'react';
import { Upload, FileCheck, AlertTriangle, CheckCircle, XCircle, Folder, File, Image, Package } from 'lucide-react';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface GLTFAnalysis {
  isValid: boolean;
  isGLB: boolean;
  hasEmbeddedTextures: boolean;
  externalFiles: string[];
  missingFiles: string[];
  buffers: string[];
  textures: string[];
  estimatedSize: number;
}

export default function GLTFFileManager() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [analysis, setAnalysis] = useState<GLTFAnalysis | null>(null);
  const [mainFile, setMainFile] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeGLTF = async (file: File): Promise<GLTFAnalysis> => {
    const text = await file.text();
    const isGLB = file.name.endsWith('.glb');
    
    if (isGLB) {
      return {
        isValid: true,
        isGLB: true,
        hasEmbeddedTextures: true,
        externalFiles: [],
        missingFiles: [],
        buffers: [],
        textures: [],
        estimatedSize: file.size
      };
    }

    try {
      const gltf = JSON.parse(text);
      const externalFiles: string[] = [];
      const buffers: string[] = [];
      const textures: string[] = [];

      // Analizar buffers
      if (gltf.buffers) {
        gltf.buffers.forEach((buffer: any) => {
          if (buffer.uri && !buffer.uri.startsWith('data:')) {
            buffers.push(buffer.uri);
            externalFiles.push(buffer.uri);
          }
        });
      }

      // Analizar texturas
      if (gltf.images) {
        gltf.images.forEach((image: any) => {
          if (image.uri && !image.uri.startsWith('data:')) {
            textures.push(image.uri);
            externalFiles.push(image.uri);
          }
        });
      }

      return {
        isValid: true,
        isGLB: false,
        hasEmbeddedTextures: externalFiles.length === 0,
        externalFiles,
        missingFiles: [],
        buffers,
        textures,
        estimatedSize: file.size
      };
    } catch (e) {
      return {
        isValid: false,
        isGLB: false,
        hasEmbeddedTextures: false,
        externalFiles: [],
        missingFiles: [],
        buffers: [],
        textures: [],
        estimatedSize: 0
      };
    }
  };

  const handleFiles = async (fileList: FileList) => {
    const newFiles: FileInfo[] = [];
    let mainGltfFile: File | null = null;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const url = URL.createObjectURL(file);
      
      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type || 'unknown',
        url
      });

      if (file.name.endsWith('.gltf') || file.name.endsWith('.glb')) {
        mainGltfFile = file;
        setMainFile(url);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);

    if (mainGltfFile) {
      const result = await analyzeGLTF(mainGltfFile);
      
      // Verificar archivos faltantes
      const uploadedNames = newFiles.map(f => f.name);
      const missing = result.externalFiles.filter(ext => {
        const fileName = ext.split('/').pop() || ext;
        return !uploadedNames.includes(fileName);
      });

      setAnalysis({ ...result, missingFiles: missing });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) return <Package className="w-4 h-4 text-purple-400" />;
    if (fileName.endsWith('.bin')) return <File className="w-4 h-4 text-blue-400" />;
    if (fileName.match(/\.(png|jpg|jpeg|webp)$/i)) return <Image className="w-4 h-4 text-green-400" />;
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const generateCode = () => {
    if (!mainFile) return '';
    
    return `// Código generado automáticamente
import { GLTFModel } from '@/components/GLTFModel'

function MyComponent() {
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
      url="${mainFile}"
      params={params}
      onError={(error) => console.error(error)}
    />
  )
}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Gestor de Archivos GLTF/GLB
          </h1>
          <p className="text-slate-400">Sistema inteligente de carga y validación de modelos 3D</p>
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            isDragging 
              ? 'border-purple-400 bg-purple-950/50 scale-105' 
              : 'border-purple-500/30 bg-slate-800/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            title='MOdelo'
            multiple
            accept=".gltf,.glb,.bin,.png,.jpg,.jpeg,.webp"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          
          <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-purple-400' : 'text-slate-600'}`} />
          
          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragging ? '¡Suelta los archivos aquí!' : 'Arrastra archivos o haz clic'}
          </h3>
          
          <p className="text-slate-400 mb-6">
            Soporta .gltf, .glb, .bin, y texturas (.png, .jpg, .webp)
          </p>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors"
          >
            Seleccionar Archivos
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              {analysis.isValid ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <h3 className="text-xl font-semibold text-white">Análisis del Modelo</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Tipo de archivo</p>
                <p className="text-white font-semibold">{analysis.isGLB ? 'GLB (Binario)' : 'GLTF (JSON)'}</p>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Texturas embebidas</p>
                <p className="text-white font-semibold">
                  {analysis.hasEmbeddedTextures ? '✅ Sí' : '❌ No'}
                </p>
              </div>
            </div>

            {analysis.externalFiles.length > 0 && (
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4 mb-4">
                <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  Archivos externos requeridos ({analysis.externalFiles.length})
                </h4>
                <ul className="space-y-1 text-sm">
                  {analysis.buffers.length > 0 && (
                    <>
                      <li className="text-slate-400 font-semibold mt-2">Buffers:</li>
                      {analysis.buffers.map((buf, i) => (
                        <li key={i} className="text-blue-200 pl-4">• {buf}</li>
                      ))}
                    </>
                  )}
                  {analysis.textures.length > 0 && (
                    <>
                      <li className="text-slate-400 font-semibold mt-2">Texturas:</li>
                      {analysis.textures.map((tex, i) => (
                        <li key={i} className="text-blue-200 pl-4">• {tex}</li>
                      ))}
                    </>
                  )}
                </ul>
              </div>
            )}

            {analysis.missingFiles.length > 0 && (
              <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
                <h4 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Archivos faltantes ({analysis.missingFiles.length})
                </h4>
                <ul className="space-y-1 text-sm">
                  {analysis.missingFiles.map((file, i) => (
                    <li key={i} className="text-red-200">❌ {file}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.isGLB && (
              <div className="bg-green-950/30 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="text-green-200 font-semibold">
                    ✨ Formato GLB detectado - Todo está incluido en un solo archivo
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Archivos Cargados ({files.length})
            </h3>
            
            <div className="space-y-2">
              {files.map((file, i) => (
                <div key={i} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-slate-400 text-xs">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  {file.name === mainFile.split('/').pop() && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full font-semibold">
                      Principal
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Code */}
        {mainFile && analysis?.isValid && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Código Generado</h3>
              <button
                onClick={() => copyToClipboard(generateCode())}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Copiar Código
              </button>
            </div>
            
            <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm text-green-300 font-mono">
              {generateCode()}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-lg font-semibold text-white mb-3">📋 Recomendaciones</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <span><strong>Usa GLB</strong> cuando sea posible - todo en un archivo, sin problemas de rutas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <span><strong>Para GLTF:</strong> sube todos los archivos (.gltf, .bin, texturas) juntos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <span><strong>Estructura de carpetas:</strong> mantén las texturas en la misma carpeta o en /textures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">•</span>
              <span><strong>Conversión:</strong> usa Blender o herramientas online para convertir a GLB</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}