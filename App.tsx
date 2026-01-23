import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Calculator, 
  CreditCard, 
  Share2, 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Copy,
  HelpCircle,
  ArrowRight,
  Save,
  Download,
  Link as LinkIcon,
  XCircle,
  CheckSquare,
  Square,
  Sparkles,
  PartyPopper,
  Building2,
  MessageCircle,
  Phone,
  Printer,
  FileText,
  Import,
  Lock,
  Eye,
  Wallet,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Attendee, Config, Expense, PaymentStatus } from './types';
import { DEFAULT_CONFIG, DEFAULT_EXPENSES, generateInitialAttendees } from './constants';

// --- Constants for Contextual Upselling ---
const AD_KEYWORDS: Record<string, { text: string; link: string }> = {
  karts: { text: "🏎️ ¿Buscando Karts? Tenemos circuito exclusivo.", link: "https://wa.me/34678288284?text=Hola,%20me%20interesa%20el%20circuito%20de%20Karts" },
  cena: { text: "🍽️ ¿Cena con espectáculo? Menús desde 35€.", link: "https://wa.me/34678288284?text=Hola,%20busco%20cena%20para%20despedida" },
  barco: { text: "⛵ Alquiler de Barco privado con patrón.", link: "https://wa.me/34678288284?text=Hola,%20info%20sobre%20barcos" },
  alojamiento: { text: "🏠 Casas rurales para grupos grandes disponibles.", link: "https://wa.me/34678288284?text=Hola,%20busco%20casa%20rural" },
  paintball: { text: "🔫 Paintball: El clásico que nunca falla.", link: "https://wa.me/34678288284?text=Hola,%20info%20paintball" },
  tupper: { text: "😈 Tuppersex divertido y elegante.", link: "https://wa.me/34678288284?text=Hola,%20info%20tuppersex" },
};

// --- Helper: State Encoding/Decoding for URL Sharing ---

const encodeState = (data: any) => {
  try {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const binString = Array.from(bytes, (byte) =>
      String.fromCodePoint(byte)
    ).join("");
    return btoa(binString);
  } catch (e) {
    console.error("Error encoding state", e);
    return "";
  }
};

const decodeState = (str: string) => {
  try {
    const binString = atob(str);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (e) {
    console.error("Error decoding state", e);
    return null;
  }
};

const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Ensure it's not visible but part of DOM
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      alert("✅ ¡Copiado al portapapeles!");
    } else {
      prompt("❌ No se pudo copiar autom. Copia el link aquí:", text);
    }
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
    prompt("❌ No se pudo copiar autom. Copia el link aquí:", text);
  }

  document.body.removeChild(textArea);
};

// --- Components ---

const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string 
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
      active 
        ? 'border-blue-600 text-blue-600 bg-blue-50' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ProTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg my-4 text-sm text-yellow-800 flex gap-3 items-start">
    <div className="shrink-0 mt-0.5">💡</div>
    <div className="flex-1">{children}</div>
  </div>
);

const StatusBadge: React.FC<{ status: PaymentStatus; isHonoree: boolean; isFree: boolean }> = ({ status, isHonoree, isFree }) => {
  if (isHonoree && isFree) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">GRATIS</span>;
  }
  switch (status) {
    case 'PAID':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">PAGADO</span>;
    case 'DEPOSIT':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">SEÑAL</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">PENDIENTE</span>;
  }
};

// --- Report Component (For Print) ---
const FinalReport = ({ config, calculation, attendees, onClose }: any) => {
  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 max-w-5xl mx-auto">
       {/* Actions Bar - Hidden on Print */}
       <div className="no-print flex justify-between items-center mb-12 bg-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm sticky top-4 z-50">
         <button onClick={onClose} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors">
           <ArrowLeft className="w-5 h-5" /> Volver a editar
         </button>
         <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
           <Printer className="w-5 h-5" /> Imprimir / Guardar PDF
         </button>
       </div>

       {/* Report Content */}
       <div className="bg-white border-b-4 border-gray-900 pb-8 mb-8 flex justify-between items-end">
         <div>
            <h1 className="text-4xl font-black uppercase tracking-wider text-gray-900">Despedida PRO</h1>
            <p className="text-gray-500 mt-2 text-lg font-light">Informe Final de Gastos</p>
         </div>
         <div className="text-right">
             <p className="text-sm text-gray-400">Fecha de emisión</p>
             <p className="text-lg font-medium">{new Date().toLocaleDateString()}</p>
         </div>
       </div>
       
       {/* Totals Grid */}
       <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="p-6 rounded-xl border-2 border-gray-100 text-center">
             <p className="text-xs uppercase text-gray-400 font-bold tracking-widest mb-2">Coste Total Evento</p>
             <p className="text-4xl font-bold text-gray-900">{calculation.totalTripCost.toFixed(2)}€</p>
          </div>
          <div className="p-6 rounded-xl border-2 border-gray-100 text-center">
             <p className="text-xs uppercase text-gray-400 font-bold tracking-widest mb-2">Asistentes</p>
             <p className="text-4xl font-bold text-gray-900">{config.totalPeople}</p>
          </div>
          <div className="p-6 rounded-xl border-2 border-blue-100 bg-blue-50 text-center">
             <p className="text-xs uppercase text-blue-400 font-bold tracking-widest mb-2">Media / Persona</p>
             <p className="text-4xl font-bold text-blue-600">{(calculation.payingCount > 0 ? calculation.totalTripCost / calculation.payingCount : 0).toFixed(2)}€</p>
          </div>
       </div>

       {/* Balance Table */}
       <div className="mb-12">
        <h3 className="text-lg font-bold mb-4 uppercase text-gray-900 tracking-wide">Desglose por Asistente</h3>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-4 text-left font-semibold rounded-tl-lg">Nombre</th>
                <th className="p-4 text-right font-semibold">Gasto Asignado</th>
                <th className="p-4 text-right font-semibold">Pagado (Adelanto)</th>
                <th className="p-4 text-right font-semibold">Balance Final</th>
                <th className="p-4 text-center font-semibold rounded-tr-lg">Estado</th>
              </tr>
          </thead>
          <tbody>
              {attendees.map((att: any, idx: number) => {
                  const cost = calculation.finalCosts[att.id];
                  const paid = calculation.attendeePaid[att.id] || 0;
                  const balance = calculation.attendeeBalance[att.id];
                  return (
                    <tr key={att.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="p-4 font-medium text-gray-900">
                        {att.name} {att.isHonoree && '👑'}
                      </td>
                      <td className="p-4 text-right text-gray-600">{cost.toFixed(2)}€</td>
                      <td className="p-4 text-right text-gray-400">{paid > 0 ? paid.toFixed(2) + '€' : '-'}</td>
                      <td className="p-4 text-right font-bold text-base">
                        {balance > 0.01 ? (
                          <span className="text-green-600">+ {balance.toFixed(2)}€ (Recibe)</span>
                        ) : balance < -0.01 ? (
                          <span className="text-red-600"> {balance.toFixed(2)}€ (Debe)</span>
                        ) : (
                          <span className="text-gray-300">0.00€</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {att.status === 'PAID' 
                          ? <span className="text-green-800 font-bold text-[10px] uppercase border border-green-200 bg-green-100 px-2 py-1 rounded-full">Pagado</span> 
                          : att.status === 'DEPOSIT' 
                            ? <span className="text-yellow-800 font-bold text-[10px] uppercase border border-yellow-200 bg-yellow-100 px-2 py-1 rounded-full">Señal</span> 
                            : <span className="text-red-800 font-bold text-[10px] uppercase border border-red-200 bg-red-100 px-2 py-1 rounded-full">Pendiente</span>}
                      </td>
                    </tr>
                  )
              })}
          </tbody>
        </table>
       </div>
       
       <div className="grid md:grid-cols-2 gap-8 mt-auto pt-8 border-t border-gray-200">
         <div className="p-6 border border-gray-200 rounded-xl bg-gray-50">
            <h4 className="font-bold text-gray-900 mb-3 text-lg">Instrucciones de Pago</h4>
            <p className="text-sm text-gray-600 mb-2">Por favor, realizar los pagos pendientes lo antes posible para confirmar las reservas.</p>
            <div className="text-sm text-gray-800 font-mono bg-white p-3 rounded border border-gray-200 inline-block">
               Concepto: <strong>NOMBRE - DESPEDIDA</strong>
            </div>
         </div>
         <div className="text-right text-gray-400 text-xs flex flex-col justify-end">
            <p className="mb-1">Este documento es informativo.</p>
            <p>Generado con <strong>Calculadora Despedidas PRO</strong></p>
         </div>
       </div>
    </div>
  )
}

// --- Landing Pages ---

const LandingIntro: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-3xl"></div>
    </div>

    <div className="max-w-2xl text-center space-y-8 relative z-10">
      <div className="inline-block p-4 bg-white rounded-2xl shadow-sm mb-4 border border-red-100 rotate-3 transform transition-transform hover:rotate-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
        ¿Organizar una despedida? <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
          Menudo dolor de cabeza.
        </span>
      </h1>
      
      <div className="space-y-4 text-lg text-slate-600 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="flex items-center justify-center gap-2">❌ Excel complicados que nadie entiende.</p>
        <p className="flex items-center justify-center gap-2">❌ "¿Cuánto pago si no voy a la cena?"</p>
        <p className="flex items-center justify-center gap-2">❌ Perseguir a la gente para que pague.</p>
        <p className="flex items-center justify-center gap-2">❌ Acabar poniendo dinero de tu bolsillo.</p>
      </div>

      <button 
        onClick={onNext}
        className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto shadow-md shadow-indigo-200"
      >
        Ver la Solución <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const LandingSolutions: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative">
     <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-green-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[30%] bg-blue-200/30 rounded-full blur-3xl"></div>
    </div>

    <div className="max-w-4xl text-center space-y-10 relative z-10">
      <div className="inline-block p-4 bg-white rounded-2xl shadow-sm mb-4 border border-green-100 -rotate-3 transform transition-transform hover:-rotate-6">
        <Sparkles className="w-16 h-16 text-emerald-500 mx-auto" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
        La Calculadora Definitiva <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
          Sin dramas. Sin errores.
        </span>
      </h1>

      <div className="grid md:grid-cols-2 gap-6 text-left mt-8">
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
             <Calculator className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">⚡ Cálculo Automático</h3>
          <p className="text-slate-500">Separa gastos fijos y variables. Si alguien no va a los karts, no los paga. Todo transparente.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
             <PartyPopper className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">👑 Homenajeado Gratis</h3>
          <p className="text-slate-500">Calcula automáticamente el reparto de su parte entre el resto de asistentes. ¡Como debe ser!</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
             <Share2 className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">📲 Listo para WhatsApp</h3>
          <p className="text-slate-500">Genera un mensaje resumen perfecto con los importes exactos para copiar y pegar en el grupo.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
             <LinkIcon className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="font-bold text-xl mb-2 text-slate-800">🔗 Comparte el Link</h3>
          <p className="text-slate-500">Guarda tu progreso y comparte el enlace con otros organizadores para que vean los números.</p>
        </div>
      </div>

      <button 
        onClick={onStart}
        className="mt-8 bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto shadow-md shadow-blue-200"
      >
        Empezar Ahora <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'intro' | 'solutions' | 'app'>('intro');
  const [activeTab, setActiveTab] = useState<'config' | 'expenses' | 'attendees' | 'summary' | 'agency' | 'tips'>('config');
  
  // State
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [attendees, setAttendees] = useState<Attendee[]>(() => generateInitialAttendees(DEFAULT_CONFIG.totalPeople));
  const [shareUrl, setShareUrl] = useState<string>('');
  
  // New States
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showReport, setShowReport] = useState(false); // To toggle the report view

  // --- Initialization & Local Storage ---
  
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    
    // Check for Read Only Mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'view') {
      setIsReadOnly(true);
    }

    if (hash) {
      const data = decodeState(hash);
      if (data) {
        if (data.config) setConfig(data.config);
        if (data.expenses) setExpenses(data.expenses);
        if (data.attendees) setAttendees(data.attendees);
        setView('app'); 
        return;
      }
    }

    // If no hash, check Local Storage
    const savedState = localStorage.getItem('despedidas_pro_state');
    if (savedState) {
       try {
         const data = JSON.parse(savedState);
         if (data.config) setConfig(data.config);
         if (data.expenses) setExpenses(data.expenses);
         if (data.attendees) setAttendees(data.attendees);
         setView('app');
       } catch (e) {
         console.error("Error loading local storage", e);
       }
    }
  }, []);

  // Save to Local Storage on change
  useEffect(() => {
    if (!isReadOnly && view === 'app') {
      const stateToSave = { config, expenses, attendees };
      localStorage.setItem('despedidas_pro_state', JSON.stringify(stateToSave));
    }
  }, [config, expenses, attendees, isReadOnly, view]);


  // --- Effects for Syncing Data ---

  useEffect(() => {
    setAttendees(prev => {
      const currentCount = prev.length;
      const targetCount = config.totalPeople;

      if (currentCount === targetCount) return prev;

      if (targetCount > currentCount) {
        const newAttendees = [...prev];
        const honoree = newAttendees.pop(); 
        for (let i = currentCount; i < targetCount; i++) {
          newAttendees.push({
            id: `att_${Date.now()}_${i}`,
            name: `Persona ${i}`,
            isHonoree: false,
            participation: {},
            status: 'PENDING'
          });
        }
        if (honoree) newAttendees.push(honoree);
        return newAttendees;
      } else {
        const honoree = prev[prev.length - 1];
        const sliced = prev.slice(0, targetCount - 1);
        return [...sliced, honoree];
      }
    });
  }, [config.totalPeople]);

  useEffect(() => {
    setAttendees(prev => {
      return prev.map(p => {
        const newParticipation = { ...p.participation };
        expenses.forEach(e => {
          if (newParticipation[e.id] === undefined) {
            newParticipation[e.id] = true;
          }
        });
        return { ...p, participation: newParticipation };
      });
    });
  }, [expenses.length]); 

  // --- Logic & Calculations ---

  const calculation = useMemo(() => {
    const payingAttendees = attendees.filter(a => !a.isHonoree);
    const payingCount = payingAttendees.length;
    const honoree = attendees.find(a => a.isHonoree);

    const expenseDetails = expenses.map(exp => {
      const participants = attendees.filter(a => a.participation[exp.id]);
      const count = participants.length;
      const costPerPerson = count > 0 ? exp.totalCost / count : 0;
      return { ...exp, count, costPerPerson };
    });

    const attendeeBaseCosts: Record<string, number> = {};
    const attendeePaid: Record<string, number> = {}; 
    let totalDirectCostAll = 0;

    attendees.forEach(att => attendeePaid[att.id] = 0);

    expenseDetails.forEach(exp => {
      if (exp.payerId && attendeePaid[exp.payerId] !== undefined) {
        attendeePaid[exp.payerId] += exp.totalCost;
      }
      attendees.forEach(att => {
        if (att.participation[exp.id]) {
           const myCost = exp.costPerPerson;
           attendeeBaseCosts[att.id] = (attendeeBaseCosts[att.id] || 0) + myCost;
        }
      });
      totalDirectCostAll += exp.totalCost;
    });

    let honoreeShareTotal = 0;
    if (honoree) {
      honoreeShareTotal = attendeeBaseCosts[honoree.id] || 0;
    }

    const subTotal = totalDirectCostAll;
    const unexpectedAmount = subTotal * (config.unexpectedPercent / 100);

    const finalCosts: Record<string, number> = {};
    const attendeeBalance: Record<string, number> = {};
    
    attendees.forEach(att => {
      if (att.isHonoree && config.isHonoreeFree) {
        finalCosts[att.id] = 0;
      } else {
        let myTotal = attendeeBaseCosts[att.id] || 0;
        if (config.isHonoreeFree && payingCount > 0) {
           myTotal += (honoreeShareTotal / payingCount);
        }
        if (payingCount > 0) {
          myTotal += (unexpectedAmount / payingCount);
        }
        finalCosts[att.id] = myTotal;
      }
      attendeeBalance[att.id] = (attendeePaid[att.id] || 0) - finalCosts[att.id];
    });

    const totalTripCost = subTotal + unexpectedAmount;

    return {
      expenseDetails,
      attendeeBaseCosts,
      honoreeShareTotal,
      unexpectedAmount,
      finalCosts,
      attendeePaid,
      attendeeBalance,
      totalTripCost,
      payingCount
    };
  }, [config, expenses, attendees]);

  // --- Handlers ---

  const updateExpense = (id: string, field: keyof Expense, value: any) => {
    if (isReadOnly) return;
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addExpense = (category: 'FIXED' | 'VARIABLE') => {
    if (isReadOnly) return;
    const newExp: Expense = {
      id: `ex_new_${Date.now()}`,
      name: category === 'FIXED' ? 'Nuevo Gasto Fijo' : 'Nueva Actividad',
      totalCost: 0,
      category,
      payerId: '' 
    };
    setExpenses(prev => [...prev, newExp]);
  };

  const removeExpense = (id: string) => {
    if (isReadOnly) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const toggleParticipation = (attendeeId: string, expenseId: string) => {
    if (isReadOnly) return;
    setAttendees(prev => prev.map(a => {
      if (a.id !== attendeeId) return a;
      return {
        ...a,
        participation: {
          ...a.participation,
          [expenseId]: !a.participation[expenseId]
        }
      };
    }));
  };

  const setAllParticipation = (participate: boolean) => {
    if (isReadOnly) return;
    if (!window.confirm(participate ? "¿Marcar todas las casillas para todos los asistentes?" : "¿Desmarcar todo? Tendrás que ir uno a uno.")) return;
    
    setAttendees(prev => {
      return prev.map(a => {
        const newPart = { ...a.participation };
        expenses.forEach(e => {
          newPart[e.id] = participate;
        });
        return { ...a, participation: newPart };
      });
    });
  };

  const updateAttendeeName = (id: string, name: string) => {
    if (isReadOnly) return;
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  };

  const updateAttendeeStatus = (id: string, status: PaymentStatus) => {
    if (isReadOnly) return;
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleImportNames = () => {
    if (!importText.trim()) return;
    const names = importText.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;

    const newTotal = names.length + 1; 
    setConfig(prev => ({ ...prev, totalPeople: newTotal }));

    const newAttendees: Attendee[] = [];
    names.forEach((name, idx) => {
       newAttendees.push({
         id: `att_imp_${Date.now()}_${idx}`,
         name: name,
         isHonoree: false,
         participation: {},
         status: 'PENDING'
       });
    });
    newAttendees.push({
      id: 'att_honoree',
      name: 'Homenajeado/a',
      isHonoree: true,
      participation: {},
      status: 'PENDING'
    });

    const syncedAttendees = newAttendees.map(p => {
        const newParticipation: Record<string, boolean> = {};
        expenses.forEach(e => newParticipation[e.id] = true);
        return { ...p, participation: newParticipation };
    });

    setAttendees(syncedAttendees);
    setShowImportModal(false);
    setImportText('');
    alert(`✅ Se han importado ${names.length} personas.`);
  };

  const handleReset = () => {
    if (window.confirm("⚠️ ¿Estás seguro? \n\nSe borrarán todos los datos actuales y volverás a la pantalla de inicio.")) {
      localStorage.removeItem('despedidas_pro_state');
      // Using deep copy to avoid reference issues with constants
      setConfig({...DEFAULT_CONFIG});
      setExpenses(JSON.parse(JSON.stringify(DEFAULT_EXPENSES)));
      setAttendees(generateInitialAttendees(DEFAULT_CONFIG.totalPeople));
      
      setView('intro');
      setShareUrl('');
      
      // Clear URL
      window.history.pushState(null, document.title, window.location.pathname + window.location.search);
      
      // Force scroll top
      window.scrollTo(0,0);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Copiado al portapapeles!");
      }).catch(() => {
        fallbackCopyTextToClipboard(text);
      });
    } else {
      fallbackCopyTextToClipboard(text);
    }
  };

  const generateWhatsAppMessage = () => {
    let msg = `🎉 *DESPEDIDA DE SOLTERO/A* 🎉\n\n`;
    msg += `💰 *RESUMEN FINAL*\n`;
    msg += `Total Despedida: ${calculation.totalTripCost.toFixed(2)}€\n`;
    
    if (config.isHonoreeFree) {
      msg += `(El homenajeado/a NO paga, su parte está repartida)\n`;
    }
    msg += `\n------------------\n\n`;
    msg += `🧾 *BALANCE POR PERSONA*\n`;
    attendees.forEach(att => {
      const paid = calculation.attendeePaid[att.id] || 0;
      const balance = calculation.attendeeBalance[att.id];
      const statusIcon = att.status === 'PAID' ? '✅' : att.status === 'DEPOSIT' ? '⏳' : '🔴';
      
      if (att.isHonoree && config.isHonoreeFree) {
        msg += `🤴👸 *${att.name}*: GRATIS\n`;
      } else {
        msg += `${statusIcon} *${att.name}*\n`;
        if (paid > 0) msg += `   Pagó por el grupo: ${paid.toFixed(2)}€\n`;
        
        if (balance > 0) {
           msg += `   👉 *RECIBE: ${balance.toFixed(2)}€*\n`;
        } else {
           msg += `   👉 *DEBE: ${Math.abs(balance).toFixed(2)}€*\n`;
           if (att.status === 'DEPOSIT') {
             const remaining = Math.max(0, Math.abs(balance) - config.depositAmount);
             msg += `   (Menos señal, falta: ${remaining.toFixed(2)}€)\n`;
           }
        }
        msg += '\n';
      }
    });
    msg += `------------------\n`;
    msg += `🏦 *CUENTA PARA PAGOS*\n`;
    msg += `Bizum: [PONER TELEFONO]\n`;
    msg += `Concepto: TU NOMBRE - DESPEDIDA\n`;
    return msg;
  };

  // --- Sharing Handlers ---

  const generateShareUrl = (readOnlyMode = false) => {
    const data = { config, expenses, attendees };
    const hash = encodeState(data);
    let url = `${window.location.origin}${window.location.pathname}`;
    if (readOnlyMode) {
      url += `?mode=view`;
    }
    url += `#${hash}`;
    if (!readOnlyMode) window.location.hash = hash; 
    return url;
  };

  const handleCopyLink = () => {
    const url = generateShareUrl(false);
    setShareUrl(url);
    copyToClipboard(url);
  };
  
  const handleCopyReadOnlyLink = () => {
    const url = generateShareUrl(true);
    setShareUrl(url);
    copyToClipboard(url);
  };

  const handleWhatsAppShare = () => {
    const url = generateShareUrl(true);
    const text = `He creado la tabla de gastos para la despedida. Podéis ver lo que paga cada uno aquí:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenReport = () => {
    setShowReport(true);
  };

  // --- Views ---

  if (showReport) {
    return <FinalReport 
      config={config} 
      calculation={calculation} 
      attendees={attendees} 
      onClose={() => setShowReport(false)} 
    />;
  }

  if (view === 'intro') return <LandingIntro onNext={() => setView('solutions')} />;
  if (view === 'solutions') return <LandingSolutions onStart={() => setView('app')} />;

  const renderConfig = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {isReadOnly && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 text-orange-800 flex items-center gap-2">
           <Lock className="w-5 h-5"/>
           <span>Estás en <strong>Modo Solo Lectura</strong>. No puedes editar nada.</span>
        </div>
      )}

      <ProTip>
        <strong>¿Cuántos sois realmente?</strong> Pon el número total (incluyendo al novio/a). Si alguien duda, cuéntalo, es mejor que sobre dinero (se devuelve) a que falte y tengas que pedir 5€ extra luego.
      </ProTip>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Configuración General
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Total Personas (incl. novio/a)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                min="2"
                disabled={isReadOnly}
                className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-lg disabled:opacity-50"
                value={config.totalPeople}
                onChange={(e) => setConfig({...config, totalPeople: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <div className="flex items-end">
             <button 
                onClick={() => setShowImportModal(true)}
                disabled={isReadOnly}
                className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
             >
               <Import className="w-5 h-5" /> Importar Nombres
             </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Noches</label>
            <input 
              type="number" 
              disabled={isReadOnly}
              className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg disabled:opacity-50"
              value={config.nights}
              onChange={(e) => setConfig({...config, nights: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">¿Homenajeado/a Gratis?</label>
            <select 
              disabled={isReadOnly}
              className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg disabled:opacity-50"
              value={config.isHonoreeFree ? "yes" : "no"}
              onChange={(e) => setConfig({...config, isHonoreeFree: e.target.value === "yes"})}
            >
              <option value="yes">SÍ (Repartir gastos)</option>
              <option value="no">NO (Paga su parte)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">% Imprevistos (Fondo)</label>
            <div className="relative">
              <input 
                type="number" 
                disabled={isReadOnly}
                className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg pr-8 disabled:opacity-50"
                value={config.unexpectedPercent}
                onChange={(e) => setConfig({...config, unexpectedPercent: parseFloat(e.target.value) || 0})}
              />
              <span className="absolute right-3 top-3.5 text-gray-500 font-medium">%</span>
            </div>
          </div>
          
           <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Señal Inicial (€)</label>
            <div className="relative">
              <input 
                type="number" 
                disabled={isReadOnly}
                className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-lg pr-8 disabled:opacity-50"
                value={config.depositAmount}
                onChange={(e) => setConfig({...config, depositAmount: parseFloat(e.target.value) || 0})}
              />
              <span className="absolute right-3 top-3.5 text-gray-500 font-medium">€</span>
            </div>
            <p className="text-xs text-gray-500">Para reservar plaza.</p>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-semibold">Resumen actual:</p>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Asistentes que pagan: <b>{calculation.payingCount}</b></li>
            <li>El homenajeado <b>{config.isHonoreeFree ? 'no paga nada' : 'paga como uno más'}</b>.</li>
          </ul>
        </div>

        {/* Reset Button Section */}
        <div className="border-t border-gray-100 pt-6 mt-6">
          <button 
            onClick={handleReset}
            className="text-red-500 hover:text-red-700 text-sm flex items-center gap-2 font-medium w-full justify-center p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Borrar datos y empezar de cero
          </button>
        </div>
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold">Importar Lista</h3>
               <button onClick={() => setShowImportModal(false)}><XCircle className="w-6 h-6 text-gray-400"/></button>
             </div>
             <p className="text-sm text-gray-600">Pega aquí la lista de nombres (desde WhatsApp o Excel). Uno por línea.</p>
             <textarea 
               className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm"
               placeholder="Juan&#10;María&#10;Pedro..."
               value={importText}
               onChange={(e) => setImportText(e.target.value)}
             />
             <button 
               onClick={handleImportNames}
               className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
             >
               Importar Nombres
             </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-8">
      {isReadOnly && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 text-orange-800 flex items-center gap-2">
           <Lock className="w-5 h-5"/>
           <span>Modo Solo Lectura. No puedes añadir ni borrar gastos.</span>
        </div>
      )}

      <ProTip>
         <strong>¿No sabes el precio exacto?</strong> Tira siempre por lo alto. Si la cena son 35€, pon 40€ por las bebidas extra. Siempre es mejor devolver dinero al final que pedirlo con resaca.
      </ProTip>

      {['FIXED', 'VARIABLE'].map((cat) => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">
              {cat === 'FIXED' ? 'Gastos Fijos (Alojamiento, Transporte...)' : 'Gastos Variables (Actividades, Comidas...)'}
            </h3>
            {!isReadOnly && (
              <button 
                onClick={() => addExpense(cat as 'FIXED' | 'VARIABLE')}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Añadir
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold min-w-[200px]">Concepto</th>
                  <th className="px-6 py-3 font-semibold w-32">Total (€)</th>
                  <th className="px-6 py-3 font-semibold min-w-[150px]">Pagado por...</th>
                  <th className="px-6 py-3 font-semibold w-24 text-center">Pers.</th>
                  <th className="px-6 py-3 font-semibold w-32 text-right">€/Pers</th>
                  {!isReadOnly && <th className="px-6 py-3 font-semibold w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calculation.expenseDetails.filter(e => e.category === cat).map((exp) => {
                  // Contextual Ad Check
                  const lowerName = exp.name.toLowerCase();
                  const matchedAd = Object.keys(AD_KEYWORDS).find(k => lowerName.includes(k));
                  
                  return (
                    <React.Fragment key={exp.id}>
                      <tr className="hover:bg-gray-50 group">
                        <td className="px-6 py-3">
                          <input 
                            type="text" 
                            disabled={isReadOnly}
                            value={exp.name}
                            onChange={(e) => updateExpense(exp.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 font-medium text-gray-900 placeholder-gray-400 disabled:opacity-75"
                            placeholder="Nombre del gasto..."
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="number" 
                            disabled={isReadOnly}
                            value={exp.totalCost === 0 ? '' : exp.totalCost}
                            onChange={(e) => updateExpense(exp.id, 'totalCost', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-yellow-50 border border-yellow-200 rounded text-right font-mono disabled:bg-gray-100 disabled:text-gray-600"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-3">
                           <select
                              disabled={isReadOnly}
                              value={exp.payerId || ""}
                              onChange={(e) => updateExpense(exp.id, 'payerId', e.target.value)}
                              className="w-full p-2 bg-white border border-gray-200 rounded text-xs disabled:bg-gray-100"
                           >
                             <option value="">Bote / Organizador</option>
                             {attendees.map(att => (
                               <option key={att.id} value={att.id}>{att.name}</option>
                             ))}
                           </select>
                        </td>
                        <td className="px-6 py-3 text-center text-gray-500">
                          {exp.count}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-gray-700">
                          {exp.costPerPerson.toFixed(2)}€
                        </td>
                        {!isReadOnly && (
                          <td className="px-6 py-3 text-right">
                            <button 
                              onClick={() => removeExpense(exp.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Eliminar gasto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                      {/* Contextual Ad Row */}
                      {matchedAd && (
                         <tr>
                           <td colSpan={6} className="bg-indigo-50 px-6 py-2">
                             <a 
                               href={AD_KEYWORDS[matchedAd].link}
                               target="_blank"
                               rel="noreferrer" 
                               className="flex items-center gap-2 text-indigo-700 text-xs font-bold hover:underline"
                             >
                               <Sparkles className="w-3 h-3 text-indigo-500" />
                               {AD_KEYWORDS[matchedAd].text}
                               <ArrowRight className="w-3 h-3" />
                             </a>
                           </td>
                         </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {calculation.expenseDetails.filter(e => e.category === cat).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">
                      No hay gastos registrados en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-4 rounded-xl shadow-lg">
          <p className="text-blue-100 text-sm mb-1">Total Gastos Directos</p>
          <p className="text-3xl font-bold">{(calculation.totalTripCost - calculation.unexpectedAmount).toFixed(2)}€</p>
        </div>
        <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg">
          <p className="text-indigo-100 text-sm mb-1">Parte del Homenajeado</p>
          <p className="text-3xl font-bold">{calculation.honoreeShareTotal.toFixed(2)}€</p>
          <p className="text-xs text-indigo-200 mt-1">
            {config.isHonoreeFree ? 'Se reparte entre el resto' : 'Lo paga él/ella mism@'}
          </p>
        </div>
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg">
          <p className="text-emerald-100 text-sm mb-1">Fondo Imprevistos ({config.unexpectedPercent}%)</p>
          <p className="text-3xl font-bold">{calculation.unexpectedAmount.toFixed(2)}€</p>
        </div>
      </div>
    </div>
  );

  const renderAttendees = () => (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 text-orange-800 flex items-center gap-2">
           <Lock className="w-5 h-5"/>
           <span>Solo Lectura. No puedes cambiar nombres ni asistencia.</span>
        </div>
      )}

      <ProTip>
        <strong>¡Personaliza!</strong> Desmarca las casillas si alguien no viene a la cena o llega el sábado. El cálculo se ajusta solo.
      </ProTip>

      {!isReadOnly && (
        <div className="flex justify-end gap-2 mb-2 no-print">
          <button onClick={() => setAllParticipation(false)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 border border-gray-200 px-3 py-1 rounded bg-white">
            <Square className="w-3 h-3" /> Desmarcar todo
          </button>
          <button onClick={() => setAllParticipation(true)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-500 border border-gray-200 px-3 py-1 rounded bg-white">
            <CheckSquare className="w-3 h-3" /> Marcar todo
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
        
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-gray-200 bg-gray-100 min-w-[150px] sticky left-0 z-40 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.1)] align-bottom pb-4">Asistente</th>
                {expenses.map(exp => (
                  <th key={exp.id} className="px-1 py-2 border-b border-gray-200 w-10 text-center bg-gray-100 align-bottom h-40" title={exp.name}>
                    {/* Vertical text layout */}
                    <div className="h-full flex flex-col justify-end items-center pb-2">
                       <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-xs font-medium text-gray-600 truncate max-h-32 leading-4">
                         {exp.name}
                       </div>
                       <div className="text-[9px] text-gray-400 font-normal mt-1 border-t border-gray-300 w-full pt-1">
                          {exp.totalCost}€
                       </div>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 font-bold border-b border-gray-200 bg-blue-50 text-right min-w-[100px] sticky right-0 z-40 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.1)] text-blue-900 align-bottom pb-4">
                  A PAGAR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendees.map((att) => (
                <tr key={att.id} className={`hover:bg-blue-50/50 transition-colors ${att.isHonoree ? 'bg-purple-50 hover:bg-purple-100/50' : ''}`}>
                  <td className="px-4 py-2 border-r border-gray-100 sticky left-0 z-30 bg-inherit shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      {att.isHonoree && <span className="text-purple-600 text-xs">👑</span>}
                      <input 
                        type="text" 
                        disabled={isReadOnly}
                        value={att.name}
                        onChange={(e) => updateAttendeeName(att.id, e.target.value)}
                        className={`bg-transparent border-b border-transparent focus:border-blue-500 focus:ring-0 p-0 w-full text-sm font-medium ${att.isHonoree ? 'text-purple-900' : 'text-gray-900'} disabled:opacity-100`}
                      />
                    </div>
                  </td>
                  {expenses.map(exp => {
                    const isActive = att.participation[exp.id];
                    return (
                      <td key={exp.id} className="px-1 py-2 text-center border-r border-gray-50">
                        <button
                          onClick={() => toggleParticipation(att.id, exp.id)}
                          disabled={isReadOnly}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-all mx-auto ${
                            isActive 
                              ? 'bg-blue-500 text-white shadow-sm scale-100' 
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200 scale-90'
                          } ${isReadOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {isActive && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right font-bold text-lg sticky right-0 z-30 bg-inherit shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.05)] border-l border-gray-200 text-blue-900">
                    {calculation.finalCosts[att.id]?.toFixed(0)}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSummary = () => {
    const whatsAppText = generateWhatsAppMessage();
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <ProTip>
            <strong>¿Quién ha pagado?</strong> Ahora puedes asignar los pagos en la pestaña "Gastos" para que este balance sea exacto.
          </ProTip>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-500" />
                Balance y Deudas
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-auto custom-scrollbar">
              {attendees.map(att => {
                const balance = calculation.attendeeBalance[att.id];
                const paid = calculation.attendeePaid[att.id] || 0;
                
                return (
                  <div key={att.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${att.isHonoree ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {att.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{att.name}</p>
                        <div className="text-xs text-gray-500 flex flex-col">
                          <span>Le toca poner: <strong>{calculation.finalCosts[att.id].toFixed(2)}€</strong></span>
                          {paid > 0 && <span className="text-blue-600">Ha pagado: {paid.toFixed(2)}€</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                        
                       {/* Balance Display */}
                       {(att.isHonoree && config.isHonoreeFree) ? (
                          <StatusBadge status="PENDING" isHonoree={true} isFree={true} />
                       ) : (
                          <div className="text-right mr-2">
                             {balance > 0 ? (
                               <span className="text-sm font-bold text-green-600">Recibe: {balance.toFixed(2)}€</span>
                             ) : (
                               <span className="text-sm font-bold text-red-600">Debe: {Math.abs(balance).toFixed(2)}€</span>
                             )}
                          </div>
                       )}

                        {!(att.isHonoree && config.isHonoreeFree) && !isReadOnly && (
                          <select
                            value={att.status}
                            onChange={(e) => updateAttendeeStatus(att.id, e.target.value as PaymentStatus)}
                            className="text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="PENDING">Pendiente</option>
                            <option value="DEPOSIT">Señal ({config.depositAmount}€)</option>
                            <option value="PAID">Liquidado</option>
                          </select>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ProTip>
            <strong>¡A cobrar!</strong> Copia este texto y pégalo tal cual en el grupo de WhatsApp. Incluye el resumen, cuánto tiene que pagar cada uno y tu Bizum.
          </ProTip>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Mensaje WhatsApp
              </h3>
              <button 
                onClick={() => copyToClipboard(whatsAppText)}
                className="text-xs bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors flex items-center gap-1 font-medium shadow-sm"
              >
                <Copy className="w-3 h-3" /> Copiar
              </button>
            </div>
            <div className="p-4 flex-1">
              <textarea 
                readOnly
                className="w-full h-full min-h-[400px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                value={whatsAppText}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderAgency = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-indigo-900 to-blue-800 text-white p-8 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <PartyPopper className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-blue-300" />
              <h2 className="text-3xl font-extrabold tracking-tight">Despedidas Galicia</h2>
            </div>
            
            <p className="text-lg text-blue-100 leading-relaxed">
              ¿Organizar esto te está superando? Llevamos <strong>20 años</strong> organizando las mejores despedidas de soltero y soltera en toda Galicia.
            </p>
            
            <ul className="space-y-3 text-blue-50">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400"/> Packs Todo Incluido (Cena + Alojamiento + Actividades)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400"/> Precios negociados (más barato que ir por libre)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-400"/> Coordinador personal para tu grupo</li>
            </ul>

            <div className="pt-4 flex flex-wrap gap-4">
               <a 
                 href="https://wa.me/34678288284" 
                 target="_blank" 
                 rel="noreferrer"
                 className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-green-500/30"
               >
                 <MessageCircle className="w-5 h-5" /> Contactar por WhatsApp
               </a>
               <a 
                  href="tel:+34678288284"
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all backdrop-blur-sm"
               >
                 <Phone className="w-5 h-5" /> 678 288 284
               </a>
            </div>
          </div>
          
          <div className="hidden md:block w-px bg-blue-500/30 self-stretch"></div>
          
          <div className="w-full md:w-auto bg-white/10 p-6 rounded-xl backdrop-blur-sm text-center min-w-[250px]">
             <div className="text-4xl font-bold mb-2">20+</div>
             <div className="text-sm uppercase tracking-wider text-blue-200 mb-6">Años de experiencia</div>
             <div className="text-4xl font-bold mb-2">10k+</div>
             <div className="text-sm uppercase tracking-wider text-blue-200">Despedidas Realizadas</div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-2">📍 Destinos Top</h3>
           <p className="text-gray-600 text-sm">Sanxenxo, Vigo, Coruña, Ourense... Tenemos casas rurales y hoteles en las zonas de más fiesta.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-2">🚤 Actividades</h3>
           <p className="text-gray-600 text-sm">Barcos privados, Karting, Paintball, Humor Amarillo, Spa, Tuppersex y mucho más.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-2">🍽️ Gastronomía</h3>
           <p className="text-gray-600 text-sm">Cenas con espectáculo o mariscadas privadas. Nos adaptamos a vuestro presupuesto.</p>
        </div>
      </div>
    </div>
  );

  const renderTips = () => (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          Guía de Supervivencia y Juegos
        </h2>
        
        <div className="space-y-8 divide-y divide-gray-100">
          <section className="pt-4 first:pt-0">
            <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">💰 Reglas de Oro del Dinero</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span><strong>El Homenajeado NO paga:</strong> Por tradición, los gastos del novio/a (alojamiento, cenas, copas) se pagan "a escote" entre todos. Esta calculadora lo hace automático.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span><strong>Fondo de Imprevistos (El Bote):</strong> Siempre pon un 10-15% extra. Taxis inesperados, una ronda de chupitos, hielos... Es mejor devolver 10€ a cada uno al final del viaje que andar pidiendo calderilla a las 4 de la mañana.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span><strong>Un solo pagador:</strong> No hagáis las reservas entre 4 personas. Una persona se encarga de centralizar el dinero en una cuenta (Revolut va genial para esto) y pagar.</span>
              </li>
            </ul>
          </section>
          
          <section className="pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">🎲 Juegos para romper el hielo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-1">El objeto prohibido</h4>
                <p className="text-sm text-blue-800">Dale al novio/a un objeto ridículo (muñeca, flotador) que debe cuidar toda la noche. Si lo pierde o se lo roban, paga ronda.</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                 <h4 className="font-bold text-purple-900 mb-1">Bingo Callejero</h4>
                 <p className="text-sm text-purple-800">Haz un cartón con retos: "Conseguir un condón", "Selfie con un calvo", "Que te firmen el culo". El primero en completar línea gana copa.</p>
              </div>
            </div>
          </section>

          <section className="pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">😈 Ideas de "Castigos" Suaves</h3>
            <p className="text-gray-600 mb-3">Si alguien llega tarde o usa el móvil durante la cena:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
               <li>Beber sin usar las manos.</li>
               <li>Hablar con acento extranjero durante 10 minutos.</li>
               <li>Pedir la bebida en la barra cantando.</li>
               <li>Llevar una prenda ridícula durante 1 hora.</li>
            </ul>
          </section>

          <section className="pt-6">
            <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">🚌 Logística y Transporte</h3>
            <p className="text-gray-600">
              Si vais a beber, <strong>olvidad los coches</strong>. En Galicia el transporte público nocturno es limitado. 
              Lo mejor es contratar un microbús privado si sois más de 10, o tener los números de taxi locales guardados ANTES de salir.
              Uber/Cabify solo funcionan en las ciudades grandes (Coruña, Vigo).
            </p>
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('intro')}>
              <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="leading-tight">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Despedidas PRO</h1>
                <p className="text-[10px] text-gray-500 hidden sm:block font-medium">CALCULADORA INTELIGENTE</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyLink}
                title="Copiar Link para guardar"
                className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200"
              >
                <LinkIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Link</span>
              </button>
              
               {/* Read Only Share Button */}
               <button 
                onClick={handleCopyReadOnlyLink}
                title="Copiar Link Solo Lectura (Seguro)"
                className="flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Link Seguro</span>
              </button>

               <button 
                onClick={handleWhatsAppShare}
                title="Enviar al Grupo"
                className="flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button 
                onClick={handleOpenReport}
                title="Guardar como PDF"
                className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <nav className="flex space-x-1" aria-label="Tabs">
            <TabButton 
              active={activeTab === 'config'} 
              onClick={() => setActiveTab('config')} 
              icon={<Settings className="w-4 h-4" />} 
              label="Configuración" 
            />
            <TabButton 
              active={activeTab === 'expenses'} 
              onClick={() => setActiveTab('expenses')} 
              icon={<CreditCard className="w-4 h-4" />} 
              label="Gastos" 
            />
            <TabButton 
              active={activeTab === 'attendees'} 
              onClick={() => setActiveTab('attendees')} 
              icon={<Users className="w-4 h-4" />} 
              label="Asistentes" 
            />
            <TabButton 
              active={activeTab === 'summary'} 
              onClick={() => setActiveTab('summary')} 
              icon={<Wallet className="w-4 h-4" />} 
              label="Resumen" 
            />
             <TabButton 
              active={activeTab === 'agency'} 
              onClick={() => setActiveTab('agency')} 
              icon={<Building2 className="w-4 h-4" />} 
              label="Agencia" 
            />
            <TabButton 
              active={activeTab === 'tips'} 
              onClick={() => setActiveTab('tips')} 
              icon={<HelpCircle className="w-4 h-4" />} 
              label="Guía" 
            />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'config' && renderConfig()}
        {activeTab === 'expenses' && renderExpenses()}
        {activeTab === 'attendees' && renderAttendees()}
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'agency' && renderAgency()}
        {activeTab === 'tips' && renderTips()}
      </main>
      
      {/* Mobile Sticky Footer Stats */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
        <div className="flex justify-between items-center">
           <div>
             <p className="text-xs text-gray-500">Total Despedida</p>
             <p className="text-lg font-bold text-gray-900">{calculation.totalTripCost.toFixed(0)}€</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-500">Aprox. por persona</p>
             <p className="text-lg font-bold text-blue-600">~{calculation.payingCount > 0 ? (calculation.totalTripCost / calculation.payingCount).toFixed(0) : 0}€</p>
           </div>
        </div>
      </div>
    </div>
  );
}