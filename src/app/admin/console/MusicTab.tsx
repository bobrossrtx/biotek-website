"use client";

import { useCallback, useEffect, useState } from "react";

type Mix = {
  id?: number;
  title: string;
  date: string;
  description: string;
  platform: string;
  embedUrl: string;
  playUrl: string;
  featured: boolean;
};

const EMPTY: Mix = {
  title: "",
  date: "",
  description: "",
  platform: "soundcloud",
  embedUrl: "",
  playUrl: "",
  featured: false,
};

const PLATFORMS = ["soundcloud", "mixcloud", "bandcamp"];

export default function MusicTab() {
  const [items, setItems] = useState<Mix[]>([]);
  const [editing, setEditing] = useState<Mix | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/mixes");
    if (res.ok) setItems(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    const method = editing.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/mixes", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
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
    if (!confirm("Delete this set?")) return;
    await fetch(`/api/admin/mixes?id=${id}`, { method: "DELETE" });
    load();
  }

  function update<K extends keyof Mix>(key: K, value: Mix[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  const field = (
    key: keyof Mix,
    label: string,
    opts: { type?: string; placeholder?: string; full?: boolean } = {}
  ) =>
    editing && (
      <div className="field" style={opts.full ? { gridColumn: "1 / -1" } : undefined}>
        <label htmlFor={`mix-${key}`}>{label}</label>
        <input
          id={`mix-${key}`}
          type={opts.type ?? "text"}
          value={(editing[key] as string) ?? ""}
          placeholder={opts.placeholder}
          onChange={(e) => update(key, e.target.value as never)}
        />
      </div>
    );

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Music
        </h2>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setEditing({ ...EMPTY });
            setError("");
          }}
          disabled={!!editing}
        >
          + New set
        </button>
      </div>

      {editing && (
        <div className="admin-editor card">
          <div className="admin-editor__grid">
            {field("title", "Title *", { full: true, placeholder: "[MIX TITLE] — Party Recording 002" })}
            {field("date", "Date *", { type: "date" })}
            <div className="field">
              <label htmlFor="mix-platform">Platform</label>
              <select
                id="mix-platform"
                value={editing.platform}
                onChange={(e) => update("platform", e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {field("embedUrl", "Embed URL *", { full: true, placeholder: "https://w.soundcloud.com/player/?url=…" })}
            {field("playUrl", "Open-on-platform URL", { placeholder: "https://soundcloud.com/…" })}
            {field("description", "Description", { full: true })}
            <label className="admin-check">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
              Featured (shows on home page)
            </label>
          </div>
          <p className="error" role="alert">{error}</p>
          <div className="admin-editor__actions">
            <button type="button" className="btn" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editing.id ? "Save changes" : "Add set"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
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
            <th>Platform</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id}>
              <td className="mono-label">{m.date}</td>
              <td>{m.title}</td>
              <td>{m.platform}</td>
              <td>
                <span className={`chip ${m.featured ? "chip--acid" : ""}`}>
                  {m.featured ? "featured" : "—"}
                </span>
              </td>
              <td className="admin-table__actions">
                <button
                  type="button"
                  className="admin-link"
                  onClick={() => {
                    setEditing({ ...m });
                    setError("");
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="admin-link admin-link--danger"
                  onClick={() => m.id && remove(m.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="admin-empty">
                No sets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
