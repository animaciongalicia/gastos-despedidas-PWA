import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Phone,
  MapPin,
  FileText,
  Download,
  Upload
} from 'lucide-react';

// Types
type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

interface Reservation {
  id: string;
  fecha: Date;
  nombreGrupo: string;
  local: string;
  asistentes: number;
  precioTotal: number;
  pagado: number;
  contacto: string;
  notas?: string;
  status: ReservationStatus;
  createdAt: Date;
}

// Helper functions
const getSaturdaysInRange = (year: number, startMonth: number, endMonth: number): Date[] => {
  const saturdays: Date[] = [];
  for (let month = startMonth; month <= endMonth; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 6) {
        saturdays.push(date);
      }
    }
  }
  return saturdays;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatCurrency = (amount: number): string => {
  return `${amount.toFixed(2)}€`;
};

export default function App() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_reservations');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const parsed = data.map((r: any) => ({
          ...r,
          fecha: new Date(r.fecha),
          createdAt: new Date(r.createdAt)
        }));
        setReservations(parsed);
      } catch (e) {
        console.error('Error loading reservations', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('admin_reservations', JSON.stringify(reservations));
  }, [reservations]);

  const getSeasonSaturdays = () => {
    const currentYear = new Date().getFullYear();
    return getSaturdaysInRange(currentYear, 3, 8); // April to September
  };

  const getReservationForDate = (date: Date): Reservation | undefined => {
    return reservations.find(r =>
      r.fecha.getFullYear() === date.getFullYear() &&
      r.fecha.getMonth() === date.getMonth() &&
      r.fecha.getDate() === date.getDate()
    );
  };

  const saveReservation = (reservation: Reservation) => {
    const existingIndex = reservations.findIndex(r => r.id === reservation.id);
    if (existingIndex >= 0) {
      const updated = [...reservations];
      updated[existingIndex] = reservation;
      setReservations(updated);
    } else {
      setReservations([...reservations, reservation]);
    }
  };

  const deleteReservation = (id: string) => {
    if (window.confirm('¿Seguro que quieres eliminar esta reserva?')) {
      setReservations(reservations.filter(r => r.id !== id));
    }
  };

  const generateWhatsAppMessage = (reservation: Reservation): string => {
    const pendiente = reservation.precioTotal - reservation.pagado;
    const fecha = formatDate(reservation.fecha);

    let msg = `🎉 *RECORDATORIO CENA GRUPO* 🎉\n\n`;
    msg += `👥 *Grupo:* ${reservation.nombreGrupo}\n`;
    msg += `📅 *Fecha:* ${fecha}\n`;
    msg += `🏠 *Local:* ${reservation.local}\n`;
    msg += `👨‍👩‍👧‍👦 *Asistentes:* ${reservation.asistentes} personas\n\n`;
    msg += `------------------\n`;
    msg += `💰 *ESTADO DE PAGO*\n`;
    msg += `Total reserva: ${formatCurrency(reservation.precioTotal)}\n`;
    msg += `Pagado: ${formatCurrency(reservation.pagado)}\n`;

    if (pendiente > 0) {
      msg += `❗ *PENDIENTE: ${formatCurrency(pendiente)}*\n\n`;
      msg += `Por favor, realizar el pago antes del viernes para confirmar la reserva.\n`;
    } else {
      msg += `✅ *PAGADO COMPLETO*\n\n`;
      msg += `¡Todo listo para el sábado!\n`;
    }

    msg += `\n------------------\n`;
    msg += `📞 Cualquier duda, contactar a ${reservation.contacto}\n`;

    if (reservation.notas) {
      msg += `\n📝 *Notas:* ${reservation.notas}`;
    }

    return msg;
  };

  const exportData = () => {
    const dataStr = JSON.stringify(reservations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const parsed = data.map((r: any) => ({
            ...r,
            fecha: new Date(r.fecha),
            createdAt: new Date(r.createdAt)
          }));
          setReservations(parsed);
          alert('Datos importados correctamente');
        } catch (err) {
          alert('Error al importar datos');
        }
      };
      reader.readAsText(file);
    }
  };

  // Modal Component
  const ReservationModal = () => {
    const [formData, setFormData] = useState<Partial<Reservation>>(
      editingReservation || {
        nombreGrupo: '',
        local: 'Despedidas',
        asistentes: 0,
        precioTotal: 0,
        pagado: 0,
        contacto: '',
        notas: '',
        status: 'PENDING'
      }
    );

    const handleSave = () => {
      if (!formData.nombreGrupo || !formData.contacto || !formData.asistentes) {
        alert('Por favor, rellena los campos obligatorios');
        return;
      }

      const reservation: Reservation = {
        id: editingReservation?.id || `res_${Date.now()}`,
        fecha: editingReservation?.fecha || selectedDate || new Date(),
        nombreGrupo: formData.nombreGrupo!,
        local: formData.local || 'Despedidas',
        asistentes: formData.asistentes!,
        precioTotal: formData.precioTotal || 0,
        pagado: formData.pagado || 0,
        contacto: formData.contacto!,
        notas: formData.notas,
        status: formData.status || 'PENDING',
        createdAt: editingReservation?.createdAt || new Date()
      };

      saveReservation(reservation);
      setShowModal(false);
      setEditingReservation(null);
      setSelectedDate(null);
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">
              {editingReservation ? 'Editar Reserva' : 'Nueva Reserva'}
            </h3>
            <button
              onClick={() => {
                setShowModal(false);
                setEditingReservation(null);
                setSelectedDate(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {selectedDate && !editingReservation && (
              <div className="bg-blue-50 p-3 rounded-lg text-blue-900 font-medium">
                📅 {formatDate(selectedDate)}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Grupo Ana"
                  value={formData.nombreGrupo}
                  onChange={(e) => setFormData({ ...formData, nombreGrupo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Local
                </label>
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Asistentes *
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.asistentes || ''}
                  onChange={(e) => setFormData({ ...formData, asistentes: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Contacto (WhatsApp) *
                </label>
                <input
                  type="tel"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="678288284"
                  value={formData.contacto}
                  onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Precio Total (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.precioTotal || ''}
                  onChange={(e) => setFormData({ ...formData, precioTotal: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Pagado (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.pagado || ''}
                  onChange={(e) => setFormData({ ...formData, pagado: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ReservationStatus })}
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="CONFIRMED">Confirmada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Alergias, peticiones especiales, etc."
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingReservation(null);
                  setSelectedDate(null);
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
              >
                {editingReservation ? 'Guardar Cambios' : 'Crear Reserva'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const saturdays = getSeasonSaturdays();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const availableMonths = [3, 4, 5, 6, 7, 8]; // April to September
  const filteredSaturdays = saturdays.filter(d => d.getMonth() === selectedMonth);

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'CONFIRMED').length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    totalRevenue: reservations.reduce((sum, r) => sum + r.precioTotal, 0),
    totalPaid: reservations.reduce((sum, r) => sum + r.pagado, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                Calendario de Reservas
              </h1>
              <p className="text-gray-600 mt-1">Gestión de cenas de grupos - Temporada 2026</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <label className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Importar
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-100">
            <p className="text-sm text-gray-600">Total Reservas</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl shadow-sm border-2 border-green-200">
            <p className="text-sm text-green-700">Confirmadas</p>
            <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border-2 border-yellow-200">
            <p className="text-sm text-yellow-700">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl shadow-sm border-2 border-blue-200">
            <p className="text-sm text-blue-700">Ingreso Total</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl shadow-sm border-2 border-purple-200">
            <p className="text-sm text-purple-700">Cobrado</p>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Month Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Selecciona el mes</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {availableMonths.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMonth === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {monthNames[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSaturdays.map(saturday => {
            const reservation = getReservationForDate(saturday);
            const pendiente = reservation ? reservation.precioTotal - reservation.pagado : 0;

            return (
              <div
                key={saturday.toISOString()}
                className={`bg-white rounded-2xl shadow-md border-2 transition-all hover:shadow-lg ${
                  reservation
                    ? reservation.status === 'CONFIRMED'
                      ? 'border-green-300 bg-green-50'
                      : reservation.status === 'CANCELLED'
                      ? 'border-red-300 bg-red-50'
                      : 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-6">
                  {/* Date Header */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200 mb-4">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{saturday.getDate()}</p>
                      <p className="text-sm text-gray-600 uppercase font-medium">
                        {saturday.toLocaleDateString('es-ES', { weekday: 'long', month: 'short' })}
                      </p>
                    </div>
                    {!reservation && (
                      <button
                        onClick={() => {
                          setSelectedDate(saturday);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Añadir reserva"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {/* Reservation Details */}
                  {reservation ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900">{reservation.nombreGrupo}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {reservation.local}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingReservation(reservation);
                              setShowModal(true);
                            }}
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteReservation(reservation.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">{reservation.asistentes} personas</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4" />
                          <span>{reservation.contacto}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <DollarSign className="w-4 h-4" />
                          <span>Total: <strong>{formatCurrency(reservation.precioTotal)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          {pendiente > 0 ? (
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              Pendiente: {formatCurrency(pendiente)}
                            </span>
                          ) : (
                            <span className="text-green-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Pagado
                            </span>
                          )}
                        </div>
                        {reservation.notas && (
                          <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg">
                            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-xs">{reservation.notas}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const msg = generateWhatsAppMessage(reservation);
                          const url = `https://wa.me/${reservation.contacto.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                          window.open(url, '_blank');
                        }}
                        className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Enviar WhatsApp
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin reserva</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredSaturdays.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay sábados en este mes dentro de la temporada
          </div>
        )}
      </div>

      {showModal && <ReservationModal />}
    </div>
  );
}
