export interface RecurringSlot {
  dayOfWeek: number; 
  startTime: string; 
  endTime: string;   
}

export interface AvailabilityOverride {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface ExistingBooking {
  startTime: Date;
  endTime: Date;
  status: string; // 'pending' | 'confirmed' | 'in_queue' | 'completed' | 'cancelled' | 'no_show'
}

export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
  startDateTime: Date;
  endDateTime: Date;
}