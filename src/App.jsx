import React, { useState, useEffect, useMemo } from 'react';
import { Search, Save, Edit3, Calendar, User, RefreshCw, Clock, FileText, ArrowLeft, XCircle } from 'lucide-react';

// ⚠️ VERIFICA TU URL DE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbyV29a_POlzxLR9wdKTazoZts9I5oHVofEG8lsTduTqM_w8Js3k9uGhaOwvWZhuGK0r/exec"; 

const formatFechaHora = (fechaRaw) => {
  if (!fechaRaw) return { fecha: "S/F", hora: "" };
  const str = String(fechaRaw).trim();
  const parts = str.split(' '); 
  let fDate = parts[0] || "S/F"; 
  let fTime = parts[1] || "";    
  fDate = fDate.replace(/-/g, '/'); 
  fTime = fTime.replace(/\./g, ':'); 
  return { fecha: fDate, hora: fTime };
};

const App = () => {
  // Estados Principales
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de Edición
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Estados de LECTURA (Nuevo)
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'reader'
  const [readingFile, setReadingFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=read`);
      const json = await response.json();
      if (json.success) {
        const sortedData = json.data.sort((a, b) => {
             const dateA = String(a.fecha || '');
             const dateB = String(b.fecha || '');
             return dateB.localeCompare(dateA);
        });
        setFiles(sortedData);
      } else {
        console.error("Error API:", json.message);
      }
    } catch (error) {
      console.error("Error red:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fileId) => {
    setSaving(true);
    try {
      const payload = JSON.stringify({ action: 'update', id: fileId, resumen: editValue });
      // Usamos fetch con body stringify simple para evitar CORS preflight complex
      await fetch(API_URL, { method: 'POST', body: payload });
      
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, resumen: editValue } : f));
      setEditingId(null);
    } catch (error) {
      alert("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // --- 📜 NUEVA FUNCIÓN: ABRIR LECTOR ---
  const handleOpenReader = async (file) => {
    if (!file.txt_id) {
      alert("Este registro no tiene un archivo de texto asociado.");
      return;
    }
    
    setReadingFile(file);
    setViewMode('reader');
    setLoadingText(true);
    setTextContent("");

    try {
      // Llamamos a la API pidiendo el texto
      const response = await fetch(`${API_URL}?action=getText&id=${file.txt_id}`);
      const json = await response.json();
      
      if (json.success) {
        setTextContent(json.text);
      } else {
        setTextContent("❌ Error: No se pudo cargar el contenido.\n" + json.message);
      }
    } catch (error) {
      setTextContent("❌ Error de conexión al intentar leer el archivo.");
    } finally {
      setLoadingText(false);
    }
  };

  // --- 🔙 FUNCIÓN: CERRAR LECTOR ---
  const handleCloseReader = () => {
    setViewMode('list');
    setReadingFile(null);
    setTextContent("");
  };

  // Filtro seguro
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    try {
        const lower = String(searchTerm).toLowerCase();
        return files.filter(f => {
            const safeSearch = (val) => String(val || "").toLowerCase().includes(lower);
            return (safeSearch(f.id) || safeSearch(f.contacto) || safeSearch(f.resumen));
        });
    } catch (e) { return files; }
  }, [files, searchTerm]);

  const isGem = (text) => String(text || "").trim().startsWith('(GEM)');

  // ==========================================
  // 📺 VISTA: LECTOR DE TEXTO (PANTALLA 2)
  // ==========================================
  if (viewMode === 'reader' && readingFile) {
    const { fecha, hora } = formatFechaHora(readingFile.fecha);
    const displayName = readingFile.contacto || readingFile.id;

    return (
      <div className="min-h-screen bg-white font-sans flex flex-col">
        {/* Header Lector */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-20 flex items-center gap-3">
          <button onClick={handleCloseReader} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 truncate">{displayName}</h2>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {fecha} {hora && `• ${hora}`}
            </p>
          </div>
        </div>

        {/* Contenido Texto */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {loadingText ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <RefreshCw size={32} className="animate-spin mb-3" />
              <p>Descargando transcripción...</p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                {textContent || "El archivo está vacío."}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 📺 VISTA: LISTA PRINCIPAL (PANTALLA 1)
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-6">
      {/* HEADER */}
      <div className="bg-white shadow-sm px-4 py-3 sticky top-0 z-20 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            📱 Visor de Negocio
          </h1>
          <button onClick={fetchData} className="p-2 bg-blue-50 rounded-full text-blue-700 active:bg-blue-100">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar contacto..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-base shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
        </div>
      </div>

      {/* LISTA */}
      <div className="p-3 space-y-3">
        {loading && files.length === 0 && <div className="text-center py-10 text-gray-500 animate-pulse">Cargando...</div>}

        {!loading && filteredFiles.map(file => {
            const editing = editingId === file.id;
            const hasGem = isGem(file.resumen);
            const displayName = file.contacto || file.id; 
            const { fecha, hora } = formatFechaHora(file.fecha);

            return (
              <div key={file.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md">
                <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-start">
                  <div className="w-[85%]">
                    <div className="flex items-center gap-1 text-gray-900 font-bold text-base mb-2">
                      <User size={16} className="text-blue-600" />
                      <span className="truncate">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-100 self-start inline-flex px-2 py-1 rounded-md border border-blue-200">
                      <Calendar size={14} className="text-blue-800" />
                      <span className="text-blue-900 font-extrabold text-sm tracking-wide">{fecha}</span>
                      {hora && <span className="text-blue-900 font-bold text-sm font-mono border-l border-blue-300 pl-2 ml-1">{hora}</span>}
                    </div>
                  </div>
                  
                  {hasGem ? (
                    <div className="flex flex-col items-center bg-orange-50 p-1 rounded border border-orange-100 min-w-[35px]">
                        <span className="h-3 w-3 rounded-full bg-orange-500 mb-1 animate-pulse"></span>
                        <span className="text-[9px] font-black text-orange-700">REV</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center bg-green-50 p-1 rounded border border-green-100 min-w-[35px]">
                        <span className="h-3 w-3 rounded-full bg-green-500 mb-1"></span>
                        <span className="text-[9px] font-black text-green-700">OK</span>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  {editing ? (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <label className="block text-xs font-bold text-blue-600 mb-2 uppercase">Editando Nota:</label>
                      <textarea 
                        className="w-full p-3 border border-blue-300 rounded-lg min-h-[120px] text-gray-900 text-base focus:ring-2 focus:ring-blue-500 outline-none mb-3 shadow-inner"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button onClick={() => handleSave(file.id)} disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-base shadow-lg active:scale-95 transition-transform">
                          {saving ? 'Guardando...' : 'GUARDAR'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-base rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => { setEditingId(file.id); setEditValue(file.resumen || ""); }}>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed cursor-pointer p-3 -m-2 rounded hover:bg-blue-50 transition-colors ${hasGem ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {file.resumen || <span className="italic opacity-50 text-xs">(Toca para añadir notas...)</span>}
                      </p>
                      
                      {/* BARRA DE ACCIONES INFERIOR */}
                      <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                         {/* Botón VER TRANSCRIPCIÓN (Solo si hay TXT) */}
                         {file.txt_id ? (
                           <button 
                             onClick={(e) => {
                               e.stopPropagation(); // Evita que se abra el editor al hacer clic aquí
                               handleOpenReader(file);
                             }}
                             className="text-blue-600 text-xs font-bold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 active:bg-blue-200"
                           >
                             <FileText size={14}/> Ver Transcripción
                           </button>
                         ) : <span/>}

                         <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                          <Edit3 size={12}/> Editar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default App;