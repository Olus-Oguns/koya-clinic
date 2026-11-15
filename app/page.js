"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAvailableSlots, submitBooking } from "./actions";
import styles from "./page.module.css";

const formatLagosTime = (value) =>
  new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function Home() {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const loadSlots = useCallback(async () => {
    setError("");
    setIsLoadingSlots(true);

    try {
      const upcomingSlots = await fetchAvailableSlots();
      setSlots(upcomingSlots);
      setSelectedSlot((current) => {
        if (upcomingSlots.some((slot) => slot.id === current)) {
          return current;
        }

        return upcomingSlots[0]?.id || "";
      });
    } catch (loadError) {
      setSlots([]);
      setSelectedSlot("");
      setError(loadError.message || "Could not load available slots.");
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedSlot) {
      setError("Please choose an available slot.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(null);

    try {
      const response = await submitBooking({
        slotId: selectedSlot,
        name: name.trim(),
        email: email.trim(),
      });

      setSuccess({ reference: response.id });
      setName("");
      setEmail("");
      setSelectedSlot("");

      const refreshedSlots = await fetchAvailableSlots();
      setSlots(refreshedSlots);
      setSelectedSlot(refreshedSlots[0]?.id || "");
    } catch (submitError) {
      setError(submitError.message || "Booking failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Koya Clinic</p>
          <h1>Book a consultation</h1>
          <p className={styles.subtitle}>
            Choose an available appointment time in Lagos time and share your
            details.
          </p>
        </header>

        {error ? (
          <div className={styles.alertError} role="alert">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className={styles.alertSuccess} role="status">
            Booking confirmed. Your reference is <strong>{success.reference}</strong>.
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Available time slots</label>

            {isLoadingSlots ? (
              <p className={styles.loading}>Loading available slots…</p>
            ) : slots.length === 0 ? (
              <p className={styles.empty}>No future appointments are available right now.</p>
            ) : (
              <div className={styles.slotGrid}>
                {slots.map((slot) => (
                  <label
                    key={slot.id}
                    className={`${styles.slotOption} ${
                      selectedSlot === slot.id ? styles.slotSelected : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      onChange={() => setSelectedSlot(slot.id)}
                    />
                    <span>{formatLagosTime(slot.start)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <label className={styles.field}>
              <span>Patient name</span>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jane@example.com"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || isLoadingSlots || slots.length === 0}
          >
            {isSubmitting ? "Booking…" : "Book appointment"}
          </button>
        </form>
      </main>
    </div>
  );
}
