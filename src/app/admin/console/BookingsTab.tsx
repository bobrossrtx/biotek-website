"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

type ThreadMessage = {
  id: number;
  direction: "in" | "out";
  from: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
};

type Subscriber = { email: string; createdAt: string };

export default function BookingsTab() {
  const [items, setItems] = useState<Booking[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [showSubs, setShowSubs] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openThreads, setOpenThreads] = useState<Record<number, ThreadMessage[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [threadErrors, setThreadErrors] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/bookings${showAll ? "?all=1" : ""}`);
    if (res.ok) setItems(await res.json());
  }, [showAll]);

  const loadSubs = useCallback(async () => {
    const res = await fetch("/api/admin/newsletter");
    if (res.ok) setSubs(await res.json());
  }, []);

  const loadThread = useCallback(async (bookingId: number) => {
    const res = await fetch(`/api/admin/bookings/thread?bookingId=${bookingId}`);
    if (res.ok) {
      const msgs: ThreadMessage[] = await res.json();
      setOpenThreads((prev) => ({ ...prev, [bookingId]: msgs }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showSubs) loadSubs();
  }, [showSubs, loadSubs]);

  async function markRead(b: Booking) {
    await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, read: !b.read }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this booking and its email thread?")) return;
    await fetch(`/api/admin/bookings?id=${id}`, { method: "DELETE" });
    load();
  }

  async function removeSub(email: string) {
    if (!confirm(`Remove ${email} from the list?`)) return;
    await fetch(`/api/admin/newsletter?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    loadSubs();
  }

  function toggleThread(b: Booking) {
    if (expanded === b.id) {
      setExpanded(null);
      return;
    }
    setExpanded(b.id);
    loadThread(b.id);
  }

  async function sendReply(b: Booking) {
    const text = (replyDrafts[b.id] ?? "").trim();
    if (!text) {
      setThreadErrors((p) => ({ ...p, [b.id]: "Write a reply first" }));
      return;
    }
    setSendingTo(b.id);
    setThreadErrors((p) => ({ ...p, [b.id]: "" }));
    const res = await fetch("/api/admin/bookings/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: b.id, message: text }),
    });
    const data = await res.json().catch(() => ({}));
    setSendingTo(null);
    if (!res.ok) {
      setThreadErrors((p) => ({ ...p, [b.id]: data.error || "Send failed" }));
      return;
    }
    setReplyDrafts((p) => ({ ...p, [b.id]: "" }));
    loadThread(b.id);
    load();
  }

  const replyRef = useRef<Record<number, HTMLTextAreaElement | null>>({});

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
                  BT-{b.id} · {b.name}{" "}
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
                <button
                  type="button"
                  className={`admin-link ${expanded === b.id ? "is-active" : ""}`}
                  onClick={() => toggleThread(b)}
                  aria-expanded={expanded === b.id}
                >
                  {expanded === b.id ? "Close thread" : "Open thread"}
                </button>
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

            {expanded === b.id && (
              <div className="admin-thread">
                <h4 className="mono-label">Email thread</h4>
                {(openThreads[b.id] ?? []).length === 0 && (
                  <p className="lead" style={{ fontSize: "0.9rem" }}>
                    No emails yet — replies you send appear here. Inbound replies
                    arrive automatically via the bookings@ address.
                  </p>
                )}
                {(openThreads[b.id] ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`admin-thread__msg admin-thread__msg--${m.direction}`}
                  >
                    <p className="mono-label admin-thread__meta">
                      {m.direction === "out" ? "→ sent to" : "← from"} {m.direction === "out" ? m.to : m.from}
                      {" · "}
                      {new Date(m.createdAt + "Z").toLocaleString("en-GB")}
                    </p>
                    <p className="admin-thread__body">{m.body}</p>
                  </div>
                ))}

                <div className="admin-thread__reply">
                  <label htmlFor={`reply-${b.id}`} className="mono-label">
                    Reply to {b.name}
                  </label>
                  <textarea
                    id={`reply-${b.id}`}
                    ref={(el) => {
                      replyRef.current[b.id] = el;
                    }}
                    value={replyDrafts[b.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((p) => ({ ...p, [b.id]: e.target.value }))
                    }
                    rows={4}
                    placeholder={`Hi ${b.name}, …`}
                  />
                  {threadErrors[b.id] && (
                    <p className="error" role="alert">
                      {threadErrors[b.id]}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn"
                    disabled={sendingTo === b.id}
                    onClick={() => sendReply(b)}
                  >
                    {sendingTo === b.id ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
        {items.length === 0 && (
          <p className="lead">No {showAll ? "" : "unread "}enquiries right now.</p>
        )}
      </div>
    </div>
  );
}
