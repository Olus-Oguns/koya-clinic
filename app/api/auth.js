export function requireApiKey(request) {
    const expectedKey = process.env.BOOKING_API_KEY;

    if (!expectedKey || request.headers.get("x-api-key") !== expectedKey) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null;
}