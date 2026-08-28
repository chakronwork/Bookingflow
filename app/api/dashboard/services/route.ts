import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getSession } from "@/lib/auth/session";

async function getStaffSession() {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "staff")) return null;
  return session;
}

function serviceInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const durationMinutes = Number(body.durationMinutes);
  const price = typeof body.price === "string" ? body.price.trim() : String(body.price ?? "");
  return { name, durationMinutes, price };
}

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  const rows = await db.select({
    id: services.id,
    name: services.name,
    description: services.description,
    durationMinutes: services.durationMinutes,
    price: services.price,
    category: services.category,
    isActive: services.isActive,
  }).from(services).where(and(
    eq(services.businessId, session.businessId), isNull(services.deletedAt),
  )).orderBy(asc(services.name));

  return NextResponse.json({ services: rows });
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    const input = serviceInput(body);
    if (!input.name || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || !/^\d+(\.\d{1,2})?$/.test(input.price) || Number(input.price) < 0) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ ระยะเวลา และราคาให้ถูกต้อง" }, { status: 400 });
    }
    const [service] = await db.insert(services).values({
      businessId: session.businessId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: input.price,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
    }).returning();
    return NextResponse.json({ service }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มบริการได้" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.serviceId !== "string") return NextResponse.json({ error: "ไม่พบรหัสบริการ" }, { status: 400 });
    const input = serviceInput(body);
    if (!input.name || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || !/^\d+(\.\d{1,2})?$/.test(input.price) || Number(input.price) < 0) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ ระยะเวลา และราคาให้ถูกต้อง" }, { status: 400 });
    }
    const [service] = await db.update(services).set({
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: input.price,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
      updatedAt: new Date(),
    }).where(and(eq(services.id, body.serviceId), eq(services.businessId, session.businessId), isNull(services.deletedAt))).returning();
    if (!service) return NextResponse.json({ error: "ไม่พบบริการนี้" }, { status: 404 });
    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขบริการได้" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.serviceId !== "string") return NextResponse.json({ error: "ไม่พบรหัสบริการ" }, { status: 400 });
    const [service] = await db.update(services).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(services.id, body.serviceId), eq(services.businessId, session.businessId), isNull(services.deletedAt),
    )).returning({ id: services.id });
    if (!service) return NextResponse.json({ error: "ไม่พบบริการนี้" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบบริการได้" }, { status: 500 });
  }
}