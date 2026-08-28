export type BookingFlowType = "direct" | "service_first" | "department_queue";

export interface BusinessConfig {
  bookingFlow: BookingFlowType;
  requiresDepartment?: boolean;
  allowWalkIn?: boolean;
  requiresPatientHistory?: boolean;
  hasEmergencyQueue?: boolean;
  cancellationWindowHours?: number;
}

export type BookingStep = 
  | "select_department"
  | "select_service"
  | "select_staff"
  | "select_slot"
  | "customer_info"
  | "queue_checkin"
  | "confirmation";