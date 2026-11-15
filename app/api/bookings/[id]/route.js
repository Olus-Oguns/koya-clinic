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

export async function DELETE(request, { params }) {
    const authError = requireApiKey(request);
    if (authError) return authError;

    const { id } = await params;

    const { rows } = await db.query(
        `UPDATE bookings
     SET status = 'cancelled'
     WHERE id::text = $1 AND status = 'confirmed'
     RETURNING id, slot_id, name, email, status, created_at`,
        [id]
    );

    if (rows[0]) {
        return Response.json(rows[0]);
    }

    const existing = await db.query(
        "SELECT id FROM bookings WHERE id::text = $1",
        [id]
    );

    if (existing.rowCount === 0) {
        return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    return Response.json({ error: "Booking already cancelled" }, { status: 409 });
}