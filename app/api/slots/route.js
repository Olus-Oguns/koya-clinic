import { db } from "../db";

export async function GET(request) {
    const provider = new URL(request.url).searchParams.get("provider");

    const { rows } = await db.query(
        `SELECT s.id, s.provider, s.start, s."end",
            NOT EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.slot_id = s.id AND b.status = 'confirmed'
            ) AS available
     FROM slots s
     WHERE ($1::text IS NULL OR s.provider = $1)
     ORDER BY s.start ASC`,
        [provider]
    );

    return Response.json({ slots: rows });
}