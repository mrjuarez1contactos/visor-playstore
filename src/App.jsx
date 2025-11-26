import React, { useState, useEffect, useMemo } from 'react';
import { Search, Save, Edit3, Calendar, User, RefreshCw, Clock } from 'lucide-react';

// ⚠️ VERIFICA TU URL (Debe terminar en /exec)
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
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=read`);
      const json = await response.json();
      if (json.success) {
        setFiles(json.data);
      } else {
        console.error("Error API:", json.message);
      }
    } catch (error) {
      console.error("Error red:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 🛠️ FUNCIÓN DE GUARDADO MEJORADA ---
  const handleSave = async (fileId) => {
    setSaving(true);
    try {
      const payload = JSON.stringify({ 
          action: 'update', 
          id: fileId, 
          resumen: editValue 
      });

      const response = await fetch(API_URL, { 
          method: 'POST', 
          // Enviamos como texto plano para que Google no bloquee por CORS
          body: payload 
      });
      
      const result = await response.json();

      if (result.success) {
          // ✅ ÉXITO: Actualizamos la App
          setFiles(prev => prev.map(f => {
              if (f.id === fileId) return { ...f, resumen: editValue };
              return f;
          }));
          setEditingId(null);
          // alert("¡Guardado correctamente!"); // Opcional: quitar si molesta
      } else {
          // ❌ ERROR DEL SERVIDOR: Avisamos al usuario
          alert(`NO SE GUARDÓ EN SHEETS.\nError: ${result.message}\nID Buscado: ${result.debug_id_buscado || 'N/A'}`);
      }

    } catch (error) {
      alert("Error de conexión. Revisa tu internet.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-6">
      {/* HEADER */}
      <div className="bg-white shadow-sm px-4 py-3 sticky top-0 z-20 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            📱 Visor de Negocio
          </h1>
          <button onClick={fetchData} className="p-2 bg-blue-50 rounded-full text-blue-700">
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
                      {hora && (
                        <>
                          <span className="text-blue-300">|</span>
                          <Clock size={14} className="text-blue-800" />
                          <span className="text-blue-900 font-bold text-sm font-mono">{hora}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {hasGem ? (
                    <div className="flex flex-col items-center bg-orange-50 p-1 rounded border border-orange-100">
                        <span className="h-3 w-3 rounded-full bg-orange-500 mb-1 shadow-sm animate-pulse"></span>
                        <span className="text-[9px] font-black text-orange-700">REV</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center bg-green-50 p-1 rounded border border-green-100">
                        <span className="h-3 w-3 rounded-full bg-green-500 mb-1 shadow-sm"></span>
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
                        <button onClick={() => handleSave(file.id)} disabled={saving} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-base flex justify-center items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                          {saving ? 'Guardando...' : <><Save size={18}/> GUARDAR</>}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-3 bg-white border border-gray-300 text-gray-600 font-bold text-base rounded-lg active:bg-gray-100">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => { setEditingId(file.id); setEditValue(file.resumen || ""); }}>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed cursor-pointer p-3 -m-2 rounded hover:bg-blue-50 transition-colors ${hasGem ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {file.resumen || <span className="italic opacity-50 text-xs">(Toca para añadir notas...)</span>}
                      </p>
                      <div className="mt-3 pt-2 border-t border-dashed border-gray-200 flex justify-end items-center">
                         <span className="text-blue-600 text-xs font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                          <Edit3 size={12}/> Tocar para Editar
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