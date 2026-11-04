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
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [threadError, setThreadError] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/bookings${showAll ? "?all=1" : ""}`);
    if (res.ok) setItems(await res.json());
  }, [showAll]);

  const loadSubs = useCallback(async () => {
    const res = await fetch("/api/admin/newsletter");
    if (res.ok) setSubs(await res.json());
  }, []);

  const loadThread = useCallback(async (bookingId: number) => {
    setThreadLoading(true);
    const res = await fetch(`/api/admin/bookings/thread?bookingId=${bookingId}`);
    if (res.ok) setThread(await res.json());
    setThreadLoading(false);
  }, []);

  // poll for new messages while a booking is open (inbound replies)
  useEffect(() => {
    if (selected === null) return;
    const t = window.setInterval(() => loadThread(selected), 15000);
    return () => window.clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showSubs) loadSubs();
  }, [showSubs, loadSubs]);

  function openBooking(b: Booking) {
    setSelected(b.id);
    setReplyDraft("");
    setThreadError("");
    loadThread(b.id);
    if (!b.read) {
      markRead(b, true);
      b.read = true;
    }
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    }, 300);
  }

  async function markRead(b: Booking, value?: boolean) {
    const read = value ?? !b.read;
    await fetch("/api/admin/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, read }),
    });
    setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, read } : x)));
  }

  async function deleteOne(id: number) {
    if (!confirm(`Delete booking BT-${id} and its email thread?`)) return;
    await fetch(`/api/admin/bookings?id=${id}`, { method: "DELETE" });
    if (selected === id) setSelected(null);
    setChecked((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    load();
  }

  async function deleteChecked() {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} booking${ids.length === 1 ? "" : "s"} and their email threads?`)) return;
    await Promise.all(
      ids.map((id) => fetch(`/api/admin/bookings?id=${id}`, { method: "DELETE" }))
    );
    if (selected !== null && ids.includes(selected)) setSelected(null);
    setChecked(new Set());
    load();
  }

  function toggleCheck(id: number) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleCheckAll() {
    if (checked.size === items.length) setChecked(new Set());
    else setChecked(new Set(items.map((i) => i.id)));
  }

  async function sendReply() {
    const b = items.find((x) => x.id === selected);
    if (!b) return;
    const text = replyDraft.trim();
    if (!text) {
      setThreadError("Write a reply first");
      return;
    }
    setSending(true);
    setThreadError("");
    const res = await fetch("/api/admin/bookings/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: b.id, message: text }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setThreadError(data.error || "Send failed");
      return;
    }
    setReplyDraft("");
    loadThread(b.id);
    load();
    setTimeout(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    }, 200);
  }

  async function removeSub(email: string) {
    if (!confirm(`Remove ${email} from the list?`)) return;
    await fetch(`/api/admin/newsletter?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    loadSubs();
  }

  const selectedBooking = items.find((x) => x.id === selected) ?? null;

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Bookings
        </h2>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          {checked.size > 0 && (
            <>
              <span className="mono-label">{checked.size} selected</span>
              <button type="button" className="admin-link admin-link--danger" onClick={deleteChecked}>
                Delete selected
              </button>
            </>
          )}
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

      <div className="inbox-layout">
        <div className="inbox-list">
          <div className="inbox-list__actions">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={items.length > 0 && checked.size === items.length}
                onChange={toggleCheckAll}
                aria-label="Select all"
              />
              Select all
            </label>
          </div>

          <ul className="inbox-items">
            {items.map((b) => (
              <li
                key={b.id}
                className={`inbox-item ${selected === b.id ? "is-selected" : ""} ${
                  b.read ? "is-read" : "is-unread"
                }`}
              >
                <label className="inbox-item__check">
                  <input
                    type="checkbox"
                    checked={checked.has(b.id)}
                    onChange={() => toggleCheck(b.id)}
                    aria-label={`Select booking BT-${b.id}`}
                  />
                </label>
                <button
                  type="button"
                  className="inbox-item__main"
                  onClick={() => openBooking(b)}
                >
                  <span className="inbox-item__row">
                    <span className="inbox-item__ref">BT-{b.id}</span>
                    <span className="inbox-item__name">
                      {b.read ? "" : "● "}
                      {b.name}
                    </span>
                    <span className="inbox-item__date">
                      {new Date(b.createdAt + "Z").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </span>
                  <span className="inbox-item__row">
                    <span className="inbox-item__subject">
                      {b.eventType || "Booking enquiry"} — {b.location || "no location"}
                    </span>
                  </span>
                  <span className="inbox-item__row">
                    <span className="inbox-item__snippet">
                      {b.message.slice(0, 80)}
                      {b.message.length > 80 ? "…" : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger inbox-item__del"
                  aria-label={`Delete booking BT-${b.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteOne(b.id);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="lead" style={{ padding: "1rem 0.5rem" }}>
                No {showAll ? "" : "unread "}bookings right now.
              </li>
            )}
          </ul>
        </div>

        <div className="inbox-reader">
          {!selectedBooking && (
            <div className="inbox-reader__empty">
              <p className="lead">Select a booking to read it and reply.</p>
            </div>
          )}

          {selectedBooking && (
            <>
              <div className="inbox-reader__head">
                <p className="inbox-reader__subject">
                  {selectedBooking.eventType || "Booking enquiry"} — BT-{selectedBooking.id}
                </p>
                <p className="mono-label">
                  {selectedBooking.name} &lt;{selectedBooking.email}&gt; ·{" "}
                  {selectedBooking.eventDate || "no date"} · {selectedBooking.location || "—"}
                </p>
                <div className="admin-table__actions" style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="admin-link"
                    onClick={() => markRead(selectedBooking)}
                  >
                    {selectedBooking.read ? "Mark unread" : "Mark read"}
                  </button>
                  <a
                    className="admin-link"
                    href={`mailto:${selectedBooking.email}?subject=Re: Booking enquiry [BT-${selectedBooking.id}]`}
                  >
                    Open in email app
                  </a>
                </div>
              </div>

              <div className="inbox-reader__original">
                <p className="mono-label">Original message</p>
                <p className="admin-thread__body">{selectedBooking.message}</p>
              </div>

              <div
                className="admin-thread inbox-reader__thread"
                ref={threadRef}
              >
                <h4 className="mono-label">Email thread</h4>
                {threadLoading && <p className="mono-label">Loading…</p>}
                {!threadLoading && thread.length === 0 && (
                  <p className="lead" style={{ fontSize: "0.9rem" }}>
                    No emails yet — replies you send appear here. Replies from{" "}
                    {selectedBooking.name} arrive automatically once Resend&apos;s
                    inbound webhook is configured.
                  </p>
                )}
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={`admin-thread__msg admin-thread__msg--${m.direction}`}
                  >
                    <p className="mono-label admin-thread__meta">
                      {m.direction === "out" ? "→ to" : "← from"}{" "}
                      {m.direction === "out" ? m.to : m.from}
                      {" · "}
                      {new Date(m.createdAt + "Z").toLocaleString("en-GB")}
                    </p>
                    <p className="admin-thread__body">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="admin-thread__reply">
                <label htmlFor="inbox-reply" className="mono-label">
                  Reply to {selectedBooking.name} — sent from bookings@biotekcrew.party
                </label>
                <textarea
                  id="inbox-reply"
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={4}
                  placeholder={`Hi ${selectedBooking.name}, …`}
                />
                {threadError && (
                  <p className="error" role="alert">
                    {threadError}
                  </p>
                )}
                <button type="button" className="btn" disabled={sending} onClick={sendReply}>
                  {sending ? "Sending…" : "Send reply"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
