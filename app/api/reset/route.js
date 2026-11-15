import { db } from "../db";
import { requireApiKey } from "../auth";

export async function POST(request) {
    const authError = requireApiKey(request);
    if (authError) return authError;
    const { slots } = await request.json();

    if (!Array.isArray(slots)) {
        return Response.json({ error: "slots must be an array" }, { status: 400 });
    }

    const client = await db.connect();

    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM bookings");
        await client.query("DELETE FROM slots");

        for (const slot of slots) {
            await client.query(
                'INSERT INTO slots (id, provider, start, "end") VALUES ($1, $2, $3, $4)',
                [slot.id, slot.provider, slot.start, slot.end]
            );
        }

        await client.query("COMMIT");
        return Response.json({ ok: true });
    } catch {
        await client.query("ROLLBACK");
        return Response.json({ error: "Could not reset slots" }, { status: 500 });
    } finally {
        client.release();
    }
}