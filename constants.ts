import { Attendee, Config, Expense } from './types';

export const DEFAULT_CONFIG: Config = {
  totalPeople: 10,
  nights: 2,
  isHonoreeFree: true,
  unexpectedPercent: 10,
  depositAmount: 50,
};

export const DEFAULT_EXPENSES: Expense[] = [
  // Fixed
  { id: 'ex_1', name: 'Alojamiento (Total)', totalCost: 0, category: 'FIXED' },
  { id: 'ex_2', name: 'Transporte / Alquiler coches', totalCost: 0, category: 'FIXED' },
  { id: 'ex_3', name: 'Bote común / Varios', totalCost: 0, category: 'FIXED' },
  // Variable
  { id: 'ex_4', name: 'Cena Viernes', totalCost: 0, category: 'VARIABLE' },
  { id: 'ex_5', name: 'Copas Viernes', totalCost: 0, category: 'VARIABLE' },
  { id: 'ex_6', name: 'Actividad Sábado Mañana', totalCost: 0, category: 'VARIABLE' },
  { id: 'ex_7', name: 'Comida Sábado', totalCost: 0, category: 'VARIABLE' },
  { id: 'ex_8', name: 'Cena Sábado', totalCost: 0, category: 'VARIABLE' },
  { id: 'ex_9', name: 'Copas Sábado', totalCost: 0, category: 'VARIABLE' },
];

export const generateInitialAttendees = (count: number): Attendee[] => {
  const attendees: Attendee[] = [];
  
  // Generate Regular Attendees
  for (let i = 1; i < count; i++) {
    attendees.push({
      id: `att_${i}`,
      name: `Persona ${i}`,
      isHonoree: false,
      participation: {}, // Will be filled based on expenses
      status: 'PENDING',
    });
  }

  // Add Honoree last
  attendees.push({
    id: 'att_honoree',
    name: 'Homenajeado/a',
    isHonoree: true,
    participation: {},
    status: 'PENDING', // Will show as FREE visually
  });

  return attendees;
};
