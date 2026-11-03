"use client";

import { useCallback, useEffect, useState } from "react";

type EventItem = {
  id?: number;
  title: string;
  date: string;
  doors: string;
  venue: string;
  city: string;
  address: string;
  lineup: string[];
  price: string;
  ticketUrl: string;
  rsvpUrl: string;
  featured: boolean;
  past: boolean;
  pastGallery: string;
};

const EMPTY: EventItem = {
  title: "",
  date: "",
  doors: "",
  venue: "",
  city: "",
  address: "",
  lineup: [],
  price: "",
  ticketUrl: "",
  rsvpUrl: "",
  featured: false,
  past: false,
  pastGallery: "",
};

export default function EventsTab() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [lineupText, setLineupText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/events");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setEditing({ ...EMPTY });
    setLineupText("");
    setError("");
  }

  function startEdit(e: EventItem) {
    setEditing({ ...e });
    setLineupText(e.lineup.join("\n"));
    setError("");
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    const payload = {
      ...editing,
      lineup: lineupText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const method = editing.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/events", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Save failed");
      setBusy(false);
      return;
    }
    setEditing(null);
    setBusy(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    load();
  }

  function update<K extends keyof EventItem>(key: K, value: EventItem[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  const input = (key: keyof EventItem, label: string, type = "text", placeholder = "") =>
    editing && (
      <div className="field">
        <label htmlFor={`ev-${key}`}>{label}</label>
        <input
          id={`ev-${key}`}
          type={type}
          value={(editing[key] as string) ?? ""}
          placeholder={placeholder}
          onChange={(e) => update(key, e.target.value as never)}
        />
      </div>
    );

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Events
        </h2>
        <button type="button" className="btn" onClick={startNew} disabled={!!editing}>
          + New event
        </button>
      </div>

      {editing && (
        <div className="admin-editor card">
          <div className="admin-editor__grid">
            {input("title", "Title *")}
            {input("date", "Date *", "date")}
            {input("doors", "Doors", "text", "22:00 - 06:00")}
            {input("venue", "Venue")}
            {input("city", "City / region")}
            {input("address", "Address (kept private until location drop)", "text", "What3words / grid ref / street address")}
            {input("price", "Price", "text", "£10 otd / £8 avo")}
            {input("ticketUrl", "Ticket link")}
            {input("rsvpUrl", "RSVP link")}
            {input("pastGallery", "Past-event gallery link")}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="ev-lineup">Lineup (one per line)</label>
              <textarea
                id="ev-lineup"
                value={lineupText}
                onChange={(e) => setLineupText(e.target.value)}
                rows={4}
              />
            </div>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
              Featured (shows on home page)
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={editing.past}
                onChange={(e) => update("past", e.target.checked)}
              />
              Past event (shows in archive)
            </label>
          </div>
          <p className="error" role="alert">{error}</p>
          <div className="admin-editor__actions">
            <button type="button" className="btn" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing.id ? "Save changes" : "Create event"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Venue</th>
            <th>Address</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td className="mono-label">{e.date}</td>
              <td>{e.title}</td>
              <td>{e.venue}</td>
              <td>{e.address || "—"}</td>
              <td>
                <span className={`chip ${e.past ? "" : "chip--acid"}`}>
                  {e.past ? "past" : "upcoming"}
                </span>
              </td>
              <td className="admin-table__actions">
                <button type="button" className="admin-link" onClick={() => startEdit(e)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  onClick={() => e.id && remove(e.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="admin-empty">
                No events yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
