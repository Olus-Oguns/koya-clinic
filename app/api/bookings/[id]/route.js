import { db } from "../../db";
import { requireApiKey } from "../../auth";

export async function GET(request, { params }) {
    const authError = requireApiKey(request);
    if (authError) return authError;
    const { id } = await params;

    const { rows } = await db.query(
        `SELECT id, slot_id, name, email, status, created_at
     FROM bookings WHERE id::text = $1`,
        [id]
    );

    if (!rows[0]) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    return Response.json(rows[0]);
}