"use server";

async function callApi(path, options = {}) {
  const apiKey = process.env.BOOKING_API_KEY;

  if (!apiKey) {
    throw new Error("BOOKING_API_KEY is not configured.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(path, baseUrl).toString();

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

export async function fetchAvailableSlots() {
  const data = await callApi("/api/slots");

  const now = Date.now();
  const futureSlots = Array.isArray(data.slots)
    ? data.slots.filter(
        (slot) => slot.available && new Date(slot.start).getTime() > now
      )
    : [];

  return futureSlots;
}

export async function submitBooking({ slotId, name, email }) {
  if (!slotId || !name || !email) {
    throw new Error("Please select a slot and fill in your name and email.");
  }

  return callApi("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      slot_id: slotId,
      name,
      email,
    }),
  });
}
