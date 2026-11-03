"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  id: number;
  name: string;
  email: string;
  eventDate: string;
  location: string;
  eventType: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type Subscriber = { email: string; createdAt: string };

export default function BookingsTab() {
  const [items, setItems] = useState<Booking[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [showSubs, setShowSubs] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/bookings${showAll ? "?all=1" : ""}`);
    if (res.ok) setItems(await res.json());
  }, [showAll]);

  const loadSubs = useCallback(async () => {
    const res = await fetch("/api/admin/newsletter");
    if (res.ok) setSubs(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showSubs) loadSubs();
  }, [showSubs, loadSubs]);

  async function removeSub(email: string) {
    if (!confirm(`Remove ${email} from the list?`)) return;
    await fetch(`/api/admin/newsletter?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    loadSubs();
  }

  async function markRead(b: Booking) {
    await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, read: !b.read }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this enquiry?")) return;
    await fetch(`/api/admin/bookings?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Bookings
        </h2>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <button
            type="button"
            className="admin-link"
            onClick={() => setShowSubs((v) => !v)}
          >
            {showSubs ? "Hide" : "Newsletter list"} ({subs.length || "…"})
          </button>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show read
          </label>
        </div>
      </div>

      {showSubs && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          {subs.length === 0 && (
            <p className="lead" style={{ margin: 0 }}>
              No subscribers yet.
            </p>
          )}
          {subs.map((s) => (
            <div
              key={s.email}
              className="admin-booking__head"
              style={{ marginBottom: 0, padding: "0.4rem 0" }}
            >
              <span>{s.email}</span>
              <button
                type="button"
                className="admin-link admin-link--danger"
                onClick={() => removeSub(s.email)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="admin-bookings">
        {items.map((b) => (
          <article key={b.id} className={`card admin-booking ${b.read ? "is-read" : ""}`}>
            <div className="admin-booking__head">
              <div>
                <p className="admin-booking__name">
                  {b.name}{" "}
                  <a className="admin-link" href={`mailto:${b.email}`}>
                    {b.email}
                  </a>
                </p>
                <p className="mono-label">
                  {b.eventType || "—"} · {b.eventDate || "no date"} · {b.location || "—"} ·{" "}
                  {new Date(b.createdAt + "Z").toLocaleString("en-GB")}
                </p>
              </div>
              <div className="admin-table__actions">
                <button type="button" className="admin-link" onClick={() => markRead(b)}>
                  {b.read ? "Mark unread" : "Mark read"}
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  onClick={() => remove(b.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="admin-booking__message">{b.message}</p>
          </article>
        ))}
        {items.length === 0 && (
          <p className="lead">No {showAll ? "" : "unread "}enquiries right now.</p>
        )}
      </div>
    </div>
  );
}
