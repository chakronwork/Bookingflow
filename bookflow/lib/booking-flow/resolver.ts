import { BusinessConfig, BookingStep } from "./types";

export function resolveBookingSteps(config: Partial<BusinessConfig>): BookingStep[] {
  const flow = config.bookingFlow ?? "direct";
  const requiresDept = Boolean(config.requiresDepartment);

  switch (flow) {
    case "department_queue":
      return [
        ...(requiresDept ? ["select_department" as const] : []),
        "select_service",
        "customer_info",
        "queue_checkin",
        "confirmation",
      ];

    case "service_first":
      return [
        "select_service",
        ...(requiresDept ? ["select_department" as const] : []),
        "select_staff",
        "select_slot",
        "customer_info",
        "confirmation",
      ];

    case "direct":
    default:
      return [
        ...(requiresDept ? ["select_department" as const] : []),
        "select_staff",
        "select_service",
        "select_slot",
        "customer_info",
        "confirmation",
      ];
  }
}