import { randomUUID } from "node:crypto";
import { db } from "../db";
import { requireApiKey } from "../auth";

async function createBooking(request, database = db) {
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

    const { rows: slots } = await database.query(
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
        const { rows } = await database.query(
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


    export async function POST(request) {
        const authError = requireApiKey(request);
        if (authError) return authError;

        const key = request.headers.get("Idempotency-Key");
        if (!key) return createBooking(request);

        let body;
        try {
            body = await request.clone().json();
        } catch {
            return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const client = await db.connect();

        try {
            await client.query("BEGIN");

            // Requests with the same key wait for the first one to finish.
            await client.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
            [key]
            );

            const { rows: [saved] } = await client.query(
            `SELECT response_body, response_status,
                    request_body = $2::jsonb AS same_body
            FROM booking_requests WHERE key = $1`,
            [key, JSON.stringify(body)]
            );

            if (saved) {
            await client.query("COMMIT");

            if (!saved.same_body) {
                return Response.json(
                { error: "Idempotency-Key already used with a different body" },
                { status: 422 }
                );
            }

            return Response.json(saved.response_body, {
                status: saved.response_status,
            });
            }

            await client.query("SAVEPOINT booking_attempt");
            const response = await createBooking(request, client);
            if (!response.ok) {
            await client.query("ROLLBACK TO SAVEPOINT booking_attempt");
            }

            const responseBody = await response.json();
            await client.query(
            `INSERT INTO booking_requests
                (key, request_body, response_body, response_status)
            VALUES ($1, $2::jsonb, $3::jsonb, $4)`,
            [key, JSON.stringify(body), JSON.stringify(responseBody), response.status]
            );

            await client.query("COMMIT");
            return Response.json(responseBody, { status: response.status });
        } catch {
            await client.query("ROLLBACK");
            return Response.json({ error: "Could not process booking" }, { status: 500 });
        } finally {
            client.release();
        }
    }

    export async function GET(request) {
        const authError = requireApiKey(request);
        if (authError) return authError;

        const query = new URL(request.url).searchParams;
        const email = query.get("email")?.trim().toLowerCase();
        const limitText = query.get("limit") ?? "10";
        const limit = Number(limitText);
        const cursor = query.get("cursor");

        if (!email || !/^\d+$/.test(limitText) || limit < 1 || limit > 50) {
            return Response.json({ error: "Invalid email or limit" }, { status: 400 });
        }

        if (cursor !== null) {
            const { rowCount } = await db.query(
            "SELECT 1 FROM bookings WHERE id::text = $1 AND lower(email) = $2",
            [cursor, email]
            );

            if (!rowCount) {
            return Response.json({ error: "Invalid cursor" }, { status: 400 });
            }
        }

        const { rows } = await db.query(
            `SELECT b.id, b.slot_id, b.name, b.email, b.status, b.created_at
            FROM bookings b
            WHERE lower(b.email) = $1
            AND ($2::text IS NULL OR (b.created_at, b.id) > (
                SELECT created_at, id FROM bookings WHERE id::text = $2
            ))
            ORDER BY b.created_at, b.id
            LIMIT $3`,
            [email, cursor, limit + 1]
        );

        const bookings = rows.slice(0, limit);
        return Response.json({
            bookings,
            next_cursor: rows.length > limit ? bookings[bookings.length - 1].id : null,
        });
    }
