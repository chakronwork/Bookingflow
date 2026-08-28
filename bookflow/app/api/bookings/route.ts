import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, bookings, bookingStatusHistory, businesses } from "@/db/schema";
import { eq, and, lt, gt, isNull } from "drizzle-orm";

// Keep the soft-delete condition local to avoid depending on a missing helper module.
function withSoftDelete(table: { deletedAt: unknown }, condition: Parameters<typeof and>[0]) {
  return and(condition, isNull(table.deletedAt as never));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      businessId,
      departmentId,
      staffId,
      serviceId,
      customerName,
      customerPhone,
      customerEmail,
      startTime,
      endTime,
      priority = "normal",
      notes,
    } = body;

    if (!businessId || !serviceId || !customerName || !customerPhone || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    // ดึง Business Config เพื่อกำหนดสถานะเริ่มต้น
    const business = await db.query.businesses.findFirst({
      where: withSoftDelete(businesses, eq(businesses.id, businessId)),
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const config = business.config as Record<string, unknown>;
    const initialStatus = config.bookingFlow === "department_queue" ? "in_queue" : "confirmed";

    // รัน Transaction ป้องกัน Race Condition และเก็บ Log
    const result = await db.transaction(async (tx) => {
      // 1. ค้นหาหรือสร้าง Customer Record
      let customer = await tx.query.users.findFirst({
        where: withSoftDelete(
          users,
          and(eq(users.businessId, businessId), eq(users.phone, customerPhone))
        ),
      });

      if (!customer) {
        const [newCustomer] = await tx
          .insert(users)
          .values({
            businessId,
            role: "customer",
            name: customerName,
            phone: customerPhone,
            email: customerEmail || null,
          })
          .returning();
        customer = newCustomer;
      }

      // 2. ถ้ามีระบุ Staff ให้ตรวจสอบการจองทับซ้อน (Conflict Detection)
      if (staffId) {
        const conflict = await tx.query.bookings.findFirst({
          where: withSoftDelete(
            bookings,
            and(
              eq(bookings.staffId, staffId),
              lt(bookings.startTime, endDateTime),
              gt(bookings.endTime, startDateTime)
            )
          ),
        });

        if (conflict && conflict.status !== "cancelled") {
          throw new Error("SLOT_ALREADY_BOOKED");
        }
      }

      // 3. บันทึก Booking
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          businessId,
          departmentId: departmentId || null,
          staffId: staffId || null,
          serviceId,
          customerId: customer.id,
          startTime: startDateTime,
          endTime: endDateTime,
          status: initialStatus,
          priority,
          notes: notes || null,
        })
        .returning();

      // 4. บันทึก Audit Log ลง bookingStatusHistory
      await tx.insert(bookingStatusHistory).values({
        bookingId: newBooking.id,
        previousStatus: null,
        newStatus: initialStatus,
        changedByUserId: customer.id,
      });

      return newBooking;
    });

    return NextResponse.json({ success: true, booking: result }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "SLOT_ALREADY_BOOKED") {
      return NextResponse.json(
        { error: "ช่วงเวลาที่เลือกถูกจองไปแล้ว กรุณาเลือกเวลาอื่น" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create booking", details: (error as Error).message },
      { status: 500 }
    );
  }
}