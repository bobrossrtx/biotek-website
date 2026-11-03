"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Party = {
  id: number;
  name: string;
  date: string;
  description: string;
  photoCount: number;
};

type Photo = {
  id: number;
  src: string;
  alt: string;
  partyId: number | null;
  mediaType?: "image" | "video";
};

export default function GalleryTab() {
  const [parties, setParties] = useState<Party[]>([]);
  const [activeParty, setActiveParty] = useState<number | "unsorted" | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // new party form
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showNewParty, setShowNewParty] = useState(false);

  const loadParties = useCallback(async () => {
    const res = await fetch("/api/admin/parties");
    if (res.ok) setParties(await res.json());
  }, []);

  const loadPhotos = useCallback(async (party: number | "unsorted" | null) => {
    if (party === null) {
      setPhotos([]);
      return;
    }
    const q = party === "unsorted" ? "?partyId=unsorted" : `?partyId=${party}`;
    const res = await fetch(`/api/admin/gallery${q}`);
    if (res.ok) setPhotos(await res.json());
  }, []);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  useEffect(() => {
    loadPhotos(activeParty);
  }, [activeParty, loadPhotos]);

  async function createParty() {
    if (!newName.trim()) {
      setError("Give the party a name");
      return;
    }
    setError("");
    const res = await fetch("/api/admin/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, date: newDate }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Create failed");
      return;
    }
    const created = await res.json();
    setNewName("");
    setNewDate("");
    setShowNewParty(false);
    await loadParties();
    setActiveParty(created.id);
  }

  async function deleteParty(p: Party) {
    if (
      !confirm(
        `Delete "${p.name}" and its ${p.photoCount} photo${p.photoCount === 1 ? "" : "s"}? This cannot be undone.`
      )
    )
      return;
    await fetch(`/api/admin/parties?id=${p.id}`, { method: "DELETE" });
    if (activeParty === p.id) setActiveParty(null);
    loadParties();
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!activeParty) {
      setError("Pick a party folder first — photos upload into a party");
      return;
    }
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploading(true);
    setError("");
    setUploadResult("");

    const form = new FormData();
    for (const f of list) form.append("files", f);
    form.append("partyId", String(activeParty));

    const res = await fetch("/api/admin/gallery", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);

    if (!res.ok && !data.uploaded?.length) {
      setError(data.error || "Upload failed");
      return;
    }
    const ok = data.uploaded?.length ?? 0;
    const failed = data.failed?.length ?? 0;
    setUploadResult(
      `${ok} photo${ok === 1 ? "" : "s"} uploaded${failed ? ` — ${failed} failed (wrong type or over 10MB)` : ""}`
    );
    if (fileRef.current) fileRef.current.value = "";
    loadPhotos(activeParty);
    loadParties();
  }

  async function saveAlt(p: Photo) {
    await fetch("/api/admin/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, alt: p.alt, partyId: p.partyId }),
    });
  }

  async function removePhoto(id: number) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/admin/gallery?id=${id}`, { method: "DELETE" });
    loadPhotos(activeParty);
    loadParties();
  }

  const activePartyName =
    activeParty === "unsorted"
      ? "Unsorted"
      : parties.find((p) => p.id === activeParty)?.name ?? "";

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Gallery
        </h2>
        <button type="button" className="btn" onClick={() => setShowNewParty((v) => !v)}>
          + New party folder
        </button>
      </div>

      {showNewParty && (
        <div className="card admin-upload">
          <div className="admin-editor__grid">
            <div className="field">
              <label htmlFor="party-name">Party name *</label>
              <input
                id="party-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="PartyTek 2026"
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="party-date">Date</label>
              <input
                id="party-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <p className="error" role="alert">{error}</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="button" className="btn" onClick={createParty}>
              Create folder
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowNewParty(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="admin-parties">
        <button
          type="button"
          className={`admin-party-chip ${activeParty === null ? "is-active" : ""}`}
          onClick={() => setActiveParty(null)}
        >
          All parties
        </button>
        {parties.map((p) => (
          <span key={p.id} className="admin-party-wrap">
            <button
              type="button"
              className={`admin-party-chip ${activeParty === p.id ? "is-active" : ""}`}
              onClick={() => setActiveParty(p.id)}
            >
              {p.name} ({p.photoCount})
            </button>
            <button
              type="button"
              className="admin-link admin-link--danger admin-party-del"
              aria-label={`Delete ${p.name}`}
              onClick={() => deleteParty(p)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {activeParty !== null && (
        <>
          <div
            className={`card admin-upload admin-dropzone ${dragOver ? "is-drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
            }}
          >
            <p className="admin-dropzone__label">
              Drop photos or videos here to upload to <strong>{activePartyName}</strong>
            </p>
            <p className="mono-label">
              Photos & videos — JPG / PNG / WebP / GIF / MP4 / WebM / MOV · max
              100MB each · select many
            </p>
            <div className="admin-dropzone__row">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                aria-label="Choose photos and videos"
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
              <button
                type="button"
                className="btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Choose files"}
              </button>
            </div>
            {uploadResult && <p className="admin-upload__ok" role="status">{uploadResult}</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </div>

          <h3 className="mono-label" style={{ marginBottom: "0.8rem" }}>
            {activePartyName} — {photos.length} photo{photos.length === 1 ? "" : "s"}
          </h3>
          <div className="admin-gallery">
            {photos.map((p) => (
              <div key={p.id} className="admin-gallery__item card">
                {p.mediaType === "video" ? (
                  <video src={p.src} muted playsInline preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
                  <img src={p.src} alt={p.alt} loading="lazy" />
                )}
                <input
                  className="admin-gallery__alt"
                  type="text"
                  value={p.alt}
                  aria-label="Caption"
                  placeholder="Caption"
                  onChange={(e) =>
                    setPhotos((prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, alt: e.target.value } : x))
                    )
                  }
                  onBlur={() => saveAlt(p)}
                />
                <div className="admin-gallery__actions">
                  <a className="admin-link" href={p.src} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                  <button
                    type="button"
                    className="admin-link admin-link--danger"
                    onClick={() => removePhoto(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <p className="lead">Nothing in this folder yet.</p>
            )}
          </div>
        </>
      )}

      {activeParty === null && (
        <p className="lead">
          Select a party folder above to manage its photos, or create a new one.
        </p>
      )}
    </div>
  );
}
