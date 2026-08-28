/**
 * BookFlow — Database Schema (Drizzle ORM / PostgreSQL)
 *
 * Design principles:
 * - Normalized: no repeated/derived data stored redundantly
 * - Soft delete: every core table has `deletedAt` (nullable timestamp).
 *   Nothing is hard-deleted; queries filter `WHERE deleted_at IS NULL`.
 * - Multi-tenant ready: every business-owned table scopes by `businessId`.
 * - Hybrid / dynamic: `businesses.type` is just a label/preset hint.
 *   Actual behavior (booking flow, departments, walk-ins, patient history,
 *   emergency queue, etc.) is driven entirely by `businesses.config` (JSONB).
 *   Nothing is hardcoded to "clinic" or "hospital" — a business can mix
 *   features freely (e.g. a small clinic with departments but no emergency
 *   queue, or a salon that also wants patient-history-style notes).
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  time,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

// Kept as a light "preset hint" for onboarding UI / analytics only.
// It must never gate business logic directly — read `config` instead.
export const businessTypeEnum = pgEnum("business_type", [
  "salon",
  "clinic",
  "hospital",
  "tutor",
  "spa",
  "workshop",
  "generic",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "in_queue",
  "completed",
  "cancelled",
  "no_show",
]);

export const userRoleEnum = pgEnum("user_role", ["owner", "staff", "customer"]);

export const queuePriorityEnum = pgEnum("queue_priority", [
  "normal",
  "urgent",
  "emergency",
]);

// ---------- Soft-delete / timestamp conventions ----------

const softDelete = {
  deletedAt: timestamp("deleted_at"),
};

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

// ---------- Core tables ----------

/**
 * businesses.config (JSONB) drives all dynamic behavior. Example shapes:
 *
 * Small business (direct booking):
 * {
 *   "bookingFlow": "direct",
 *   "requiresDepartment": false,
 *   "allowWalkIn": true,
 *   "requiresPatientHistory": false,
 *   "hasEmergencyQueue": false,
 *   "cancellationWindowHours": 2
 * }
 *
 * Clinic (service-first, optional departments):
 * {
 *   "bookingFlow": "service_first",
 *   "requiresDepartment": true,
 *   "allowWalkIn": false,
 *   "requiresPatientHistory": true,
 *   "hasEmergencyQueue": false,
 *   "cancellationWindowHours": 24
 * }
 *
 * Hospital (department queue + emergency):
 * {
 *   "bookingFlow": "department_queue",
 *   "requiresDepartment": true,
 *   "allowWalkIn": true,
 *   "requiresPatientHistory": true,
 *   "hasEmergencyQueue": true,
 *   "cancellationWindowHours": 48
 * }
 *
 * A business is free to mix any of these flags — `type` is only a
 * starting preset applied at creation time, not a constraint afterward.
 */
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  type: businessTypeEnum("type").notNull().default("generic"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Bangkok"),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  config: jsonb("config").notNull().default({}),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  slugIdx: uniqueIndex("businesses_slug_idx").on(table.slug),
}));

/**
 * Reusable presets an owner can pick at onboarding, then customize.
 * Not a foreign key on businesses — just a template copied into
 * businesses.config at creation time. Keeps the "type" abstraction
 * data-driven rather than hardcoded in application code.
 */
export const businessConfigPresets = pgTable("business_config_presets", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: varchar("label", { length: 120 }).notNull(), // "Small Business", "Clinic", "Hospital"
  description: text("description"),
  config: jsonb("config").notNull(),
  ...timestamps,
  ...softDelete,
});

// Optional grouping layer — used by clinics/hospitals, left empty (no rows)
// for businesses that don't need it. Never required at the schema level.
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id).notNull(),
  name: varchar("name", { length: 120 }).notNull(), // "อายุรกรรม", "ทันตกรรม", "Color Bar"
  description: text("description"),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  businessIdx: index("departments_business_idx").on(table.businessId),
}));

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id).notNull(),
  role: userRoleEnum("role").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  passwordHash: text("password_hash"), // null for customer-only records
  ...timestamps,
  ...softDelete,
}, (table) => ({
  businessIdx: index("users_business_idx").on(table.businessId),
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

// Staff-specific profile data, normalized out of `users`.
// departmentId optional — small businesses leave it null.
export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  departmentId: uuid("department_id").references(() => departments.id),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  userIdx: uniqueIndex("staff_profiles_user_idx").on(table.userId),
  departmentIdx: index("staff_profiles_department_idx").on(table.departmentId),
}));

// Optional, generic "customer history" record — deliberately NOT named
// patient_history, so it works equally for a salon's client notes or a
// clinic's visit notes. `requiresPatientHistory` in config just decides
// whether the UI treats this as mandatory.
export const customerRecords = pgTable("customer_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  note: text("note"),
  recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  customerIdx: index("customer_records_customer_idx").on(table.customerId),
}));

// departmentId optional — null means the service isn't department-scoped
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id).notNull(),
  departmentId: uuid("department_id").references(() => departments.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category", { length: 80 }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  businessIdx: index("services_business_idx").on(table.businessId),
  departmentIdx: index("services_department_idx").on(table.departmentId),
}));

// Join table: which staff can perform which services (many-to-many)
export const staffServices = pgTable("staff_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => users.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  staffServiceIdx: uniqueIndex("staff_services_unique_idx").on(table.staffId, table.serviceId),
}));

// Recurring weekly availability per staff member
export const availabilitySlots = pgTable("availability_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday ... 6 = Saturday
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  staffDayIdx: index("availability_staff_day_idx").on(table.staffId, table.dayOfWeek),
}));

// One-off overrides (holidays, staff day off, extra hours)
export const availabilityOverrides = pgTable("availability_overrides", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  isAvailable: boolean("is_available").notNull().default(false),
  startTime: time("start_time"),
  endTime: time("end_time"),
  reason: varchar("reason", { length: 200 }),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  staffDateIdx: index("availability_overrides_staff_date_idx").on(table.staffId, table.date),
}));

/**
 * bookings covers both scheduled appointments (direct / service_first)
 * and live queueing (department_queue, walk-ins). `departmentId` and
 * `staffId` are optional so a hospital queue can start department-only
 * ("see next available doctor in Cardiology") before a staff member is
 * assigned, while a salon booking always has staffId set.
 */
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").references(() => businesses.id).notNull(),
  departmentId: uuid("department_id").references(() => departments.id),
  staffId: uuid("staff_id").references(() => users.id),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  priority: queuePriorityEnum("priority").notNull().default("normal"),
  notes: text("notes"),
  ...timestamps,
  ...softDelete,
}, (table) => ({
  businessIdx: index("bookings_business_idx").on(table.businessId),
  departmentIdx: index("bookings_department_idx").on(table.departmentId),
  staffTimeIdx: index("bookings_staff_time_idx").on(table.staffId, table.startTime),
  customerIdx: index("bookings_customer_idx").on(table.customerId),
  // Common query for queue-style flows: "next up in this department, by priority"
  departmentQueueIdx: index("bookings_department_queue_idx").on(
    table.departmentId,
    table.priority,
    table.startTime,
  ),
}));

// Audit trail — append-only, never soft-deleted itself
export const bookingStatusHistory = pgTable("booking_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  previousStatus: bookingStatusEnum("previous_status"),
  newStatus: bookingStatusEnum("new_status").notNull(),
  changedByUserId: uuid("changed_by_user_id").references(() => users.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

/**
 * Notes on the hybrid/dynamic model:
 * - `businesses.type` is a preset label only (drives onboarding UI /
 *   analytics grouping) — application logic must branch on
 *   `businesses.config`, never on `type`, so any business can combine
 *   features freely (e.g. clinic + emergency queue, or salon + patient
 *   history notes).
 * - `businessConfigPresets` stores reusable config templates so adding a
 *   new "kind" of business is a data change, not a code change.
 * - `departments` is fully optional — a small business simply has zero
 *   department rows; `services.departmentId` / `bookings.departmentId`
 *   are nullable so the same tables serve direct bookings and
 *   department-scoped queues.
 * - `bookings.staffId` is nullable to support "join a department queue,
 *   get assigned staff later" flows (hospitals), while direct-booking
 *   businesses always set it immediately.
 * - `customerRecords` is a neutral name (not "patient_history") so the
 *   same table backs a clinic's visit notes and a salon's client notes;
 *   `config.requiresPatientHistory` only controls whether the UI makes
 *   it mandatory.
 *
 * Notes on normalization:
 * - `staffProfiles` split from `users` — bio/avatar/department only
 *   apply to staff, avoids nullable bloat on the core users row.
 * - `staffServices` is a pure join table for the staff↔service
 *   many-to-many relationship.
 * - `availabilitySlots` (recurring) vs `availabilityOverrides` (one-off)
 *   kept separate so weekly schedule logic never branches on exceptions.
 * - `bookings.status` is current state; `bookingStatusHistory` is the
 *   append-only audit log — no denormalized "last changed" fields.
 *
 * Notes on soft delete:
 * - All core tables carry `deletedAt`. Application queries must filter
 *   `deletedAt IS NULL` by default (enforce via a query helper/middleware).
 * - `bookingStatusHistory` is intentionally NOT soft-deletable — it's an
 *   immutable audit trail.
 */
