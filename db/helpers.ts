import { and, isNull, type SQL } from "drizzle-orm";

export function withSoftDelete(
  table: { deletedAt: unknown },
  condition: SQL<unknown>
) {
  return and(condition, isNull(table.deletedAt as never));
}
