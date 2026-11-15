import { randomUUID } from "node:crypto";
import { db } from "../db";

export async function POST(request) {
    const { slot_id, name, email } = await request.json();

    if (!slot_id || !name || !email) {
        return Response.json(
            { error: "slot_id, name, and email are required" },
            { status: 400 }
        );
    }

    const slot = await db.query("SELECT id FROM slots WHERE id = $1", [slot_id]);
    if (slot.rowCount === 0) {
        return Response.json({ error: "Slot not found" }, { status: 404 });
    }

    const { rows } = await db.query(
        `INSERT INTO bookings (id, slot_id, name, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slot_id, name, email, status, created_at`,
        [randomUUID(), slot_id, name, email]
    );

    return Response.json(rows[0], { status: 201 });
}