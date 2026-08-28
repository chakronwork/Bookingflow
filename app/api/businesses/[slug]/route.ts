import { NextResponse } from "next/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withSoftDelete } from "@/db/helpers";
import { resolveBookingSteps } from "@/lib/booking-flow/resolver";
import { BusinessConfig } from "@/lib/booking-flow/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const business = await db.query.businesses.findFirst({
    where: withSoftDelete(businesses, eq(businesses.slug, slug)),
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const config = business.config as BusinessConfig;
  const steps = resolveBookingSteps(config);

  return NextResponse.json({
    id: business.id,
    name: business.name,
    slug: business.slug,
    timezone: business.timezone,
    config,
    steps,
  });
}