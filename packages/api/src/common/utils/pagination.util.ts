// src/common/utils/pagination.util.ts

/** =========================
 * Offset pagination
 * ========================= */
export const buildMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNext: page * limit < total,
});

/** =========================
 * Cursor pagination (seek)
 * orderBy: createdAt desc, id desc
 * cursor: base64url({ createdAt, id })
 * ========================= */

export type CursorPayload = { createdAt: string; id: string };

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
}

/**
 * Seek pagination genérica.
 * Se AND-ea con tu baseWhere en cada repository.
 *
 * fields: permite adaptar si el modelo usa otros nombres
 * (por defecto: createdAt + id)
 */
export function buildSeekCursorWhereGeneric(
  cursor: string | null | undefined,
  fields: { createdAtField?: string; idField?: string } = {},
) {
  if (!cursor) return undefined;

  const createdAtField = fields.createdAtField ?? 'createdAt';
  const idField = fields.idField ?? 'id';

  const c = decodeCursor(cursor);
  const createdAt = new Date(c.createdAt);

  return {
    OR: [
      { [createdAtField]: { lt: createdAt } },
      {
        AND: [
          { [createdAtField]: { equals: createdAt } },
          { [idField]: { lt: c.id } },
        ],
      },
    ],
  } as Record<string, any>;
}

/**
 * Calcula data + nextCursor con "limit + 1".
 * Requiere que el modelo tenga id y createdAt.
 */
export function buildSeekPageResult<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
) {
  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;

  const nextCursor = hasNextPage
    ? encodeCursor({
        createdAt: data[data.length - 1].createdAt.toISOString(),
        id: data[data.length - 1].id,
      })
    : null;

  return { data, nextCursor };
}
