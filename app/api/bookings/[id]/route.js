import { db } from "../../db";

export async function GET(request, { params }) {
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