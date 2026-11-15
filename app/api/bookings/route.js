import { randomUUID } from "node:crypto";
import { db } from "../db";
import { requireApiKey } from "../auth";

export async function POST(request) {
    const authError = requireApiKey(request);
    if (authError) return authError;


    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const slot_id = typeof body?.slot_id === "string" ? body.slot_id : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!slot_id.trim() || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return Response.json(
            { error: "A slot ID, name, and valid email are required" },
            { status: 400 }
        );
    }

    const { rows: slots } = await db.query(
        "SELECT start FROM slots WHERE id = $1",
        [slot_id]
    );

    if (!slots[0]) {
        return Response.json({ error: "Slot not found" }, { status: 404 });
    }

    if (new Date(slots[0].start).getTime() <= Date.now()) {
        return Response.json({ error: "Slot has already started" }, { status: 400 });
    }

    try {
        const { rows } = await db.query(
            `INSERT INTO bookings (id, slot_id, name, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, slot_id, name, email, status, created_at`,
            [randomUUID(), slot_id, name, email]
        );

        return Response.json(rows[0], { status: 201 });
    } catch (error) {
        if (
            error.code === "23505" &&
            error.constraint === "bookings_one_confirmed_per_slot"
        ) {
            return Response.json({ error: "Slot already booked" }, { status: 409 });
        }

        throw error;
    }
}