export type PaymentStatus = 'PENDING' | 'PAID' | 'DEPOSIT';

export interface Config {
  totalPeople: number;
  nights: number;
  isHonoreeFree: boolean;
  unexpectedPercent: number;
  depositAmount: number;
}

export type ExpenseCategory = 'FIXED' | 'VARIABLE';

export interface Expense {
  id: string;
  name: string;
  totalCost: number;
  category: ExpenseCategory;
  payerId?: string; // ID of the attendee who paid, or undefined for "Common Pot"
}

export interface Attendee {
  id: string;
  name: string;
  isHonoree: boolean;
  // Map of expenseId -> boolean (true if participating)
  participation: Record<string, boolean>;
  status: PaymentStatus;
}

// Derived data structure for calculations
export interface CalculationResult {
  payingCount: number;
  honoreeShareTotal: number;
  unexpectedTotal: number;
  totalTripCost: number;
  pricePerPayer: number; // Base average (approx)

  // Specifics
  attendeeCosts: Record<string, number>; // Consumed cost (what they SHOULD pay)
  attendeePaid: Record<string, number>; // Out of pocket cost (what they ALREADY paid)
  attendeeBalance: Record<string, number>; // Net balance (negative = owes, positive = receives)
}

// Calendar Reservation System Types
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Reservation {
  id: string;
  fecha: Date; // Saturday date
  nombreGrupo: string;
  local: string; // Restaurant/venue name
  asistentes: number;
  precioTotal: number;
  pagado: number;
  contacto: string; // Phone number for WhatsApp
  notas?: string;
  status: ReservationStatus;
  createdAt: Date;
}