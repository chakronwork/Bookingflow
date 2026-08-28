import { db } from "./index";
import {
  businesses,
  departments,
  users,
  staffProfiles,
  services,
  staffServices,
  availabilitySlots,
} from "./schema";

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Hair Salon: Direct booking, no departments
  const [salon] = await db.insert(businesses).values({
    name: "Luxe Hair Studio",
    slug: "luxe-hair",
    type: "salon",
    config: {
      bookingFlow: "direct",
      requiresDepartment: false,
      allowWalkIn: true,
      requiresPatientHistory: false,
      hasEmergencyQueue: false,
      cancellationWindowHours: 2,
    },
  }).returning();

  await db.insert(users).values({
    businessId: salon.id,
    role: "owner",
    name: "Alex Salon Owner",
    email: "alex@luxe.local",
    passwordHash: "$2b$10$SV8fP6S0LhIIlxjvJRTkW.71GRhuXEDUR1kJyOzhIHqUyaIGFCKru",
  }).returning();

  const [salonStaff] = await db.insert(users).values({
    businessId: salon.id,
    role: "staff",
    name: "Jane Stylist",
    email: "jane@luxe.local",
    passwordHash: "$2b$10$SV8fP6S0LhIIlxjvJRTkW.71GRhuXEDUR1kJyOzhIHqUyaIGFCKru",
  }).returning();

  await db.insert(staffProfiles).values({
    userId: salonStaff.id,
    bio: "Senior Hair Stylist with 8 years experience",
  });

  const [haircut] = await db.insert(services).values({
    businessId: salon.id,
    name: "Classic Haircut",
    durationMinutes: 45,
    price: "450.00",
  }).returning();

  await db.insert(staffServices).values({
    staffId: salonStaff.id,
    serviceId: haircut.id,
  });

  // Salon Working Hours: Mon-Fri 10:00 - 19:00
  for (let day = 1; day <= 5; day++) {
    await db.insert(availabilitySlots).values({
      staffId: salonStaff.id,
      dayOfWeek: day,
      startTime: "10:00:00",
      endTime: "19:00:00",
    });
  }

  // 2. Dental Clinic: Service-first, with departments & patient history
  const [clinic] = await db.insert(businesses).values({
    name: "Smile Dental Clinic",
    slug: "smile-dental",
    type: "clinic",
    config: {
      bookingFlow: "service_first",
      requiresDepartment: true,
      allowWalkIn: false,
      requiresPatientHistory: true,
      hasEmergencyQueue: false,
      cancellationWindowHours: 24,
    },
  }).returning();

  const [orthoDept] = await db.insert(departments).values({
    businessId: clinic.id,
    name: "ทันตกรรมจัดฟัน (Orthodontics)",
  }).returning();

  const [dentist] = await db.insert(users).values({
    businessId: clinic.id,
    role: "staff",
    name: "Dr. Somchai Dent",
    email: "somchai@smile.local",
  }).returning();

  await db.insert(staffProfiles).values({
    userId: dentist.id,
    departmentId: orthoDept.id,
    bio: "Orthodontist Specialist",
  });

  const [cleaning] = await db.insert(services).values({
    businessId: clinic.id,
    departmentId: orthoDept.id,
    name: "ขูดหินปูนและตรวจสุขภาพฟัน",
    durationMinutes: 30,
    price: "900.00",
  }).returning();

  await db.insert(staffServices).values({
    staffId: dentist.id,
    serviceId: cleaning.id,
  });

  for (let day = 1; day <= 6; day++) {
    await db.insert(availabilitySlots).values({
      staffId: dentist.id,
      dayOfWeek: day,
      startTime: "09:00:00",
      endTime: "17:00:00",
    });
  }

  // 3. Hospital: Department queue, emergency queue enabled
  const [hospital] = await db.insert(businesses).values({
    name: "City Central Hospital",
    slug: "city-hospital",
    type: "hospital",
    config: {
      bookingFlow: "department_queue",
      requiresDepartment: true,
      allowWalkIn: true,
      requiresPatientHistory: true,
      hasEmergencyQueue: true,
      cancellationWindowHours: 48,
    },
  }).returning();

  const [cardioDept] = await db.insert(departments).values({
    businessId: hospital.id,
    name: "แผนกอายุรกรรมหัวใจ (Cardiology)",
  }).returning();

  await db.insert(services).values({
    businessId: hospital.id,
    departmentId: cardioDept.id,
    name: "ตรวจคลื่นไฟฟ้าหัวใจ (EKG)",
    durationMinutes: 20,
    price: "1500.00",
  });

  console.log("✅ Seed completed successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});