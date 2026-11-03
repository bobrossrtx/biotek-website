"use client";

import { useCallback, useEffect, useState } from "react";

type SentMessage = {
  id: number;
  subject: string;
  recipients: number;
  created_at: string;
};

export default function MailTab() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SentMessage[]>([]);
  const [showTest, setShowTest] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/admin/mail");
    if (res.ok) {
      const data = await res.json();
      setConfigured(data.configured);
      setFrom(data.from);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/admin/mail/history");
    if (res.ok) setHistory(await res.json());
  }, []);

  useEffect(() => {
    loadStatus();
    loadHistory();
  }, [loadStatus, loadHistory]);

  async function send(withTest: boolean) {
    if (withTest && !testTo.trim()) {
      setError("Enter a test email address");
      return;
    }
    setBusy(true);
    setError("");
    setResult("");
    const res = await fetch("/api/admin/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        message,
        testTo: withTest ? testTo : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Send failed");
      return;
    }
    if (data.failed > 0) {
      setResult(
        `${data.sent} sent, ${data.failed} failed. First failure: ${data.failures?.[0]?.error}`
      );
    } else {
      setResult(
        withTest
          ? `Test email sent to ${testTo}. Check the inbox (and spam folder).`
          : `Sent to ${data.sent} subscriber${data.sent === 1 ? "" : "s"}.`
      );
    }
    if (!withTest) {
      setSubject("");
      setMessage("");
      loadHistory();
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
          Mail
        </h2>
        <span className={`chip ${configured ? "chip--acid" : ""}`}>
          {configured === null ? "checking…" : configured ? "mail ready" : "mail not configured"}
        </span>
      </div>

      {configured === false && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p className="mono-label" style={{ color: "var(--danger)", marginBottom: "0.5rem" }}>
            {"// Mail not configured"}
          </p>
          <p style={{ color: "var(--ink-dim)", margin: "0 0 0.5rem" }}>
            Add these to <code>.env.local</code> then restart the server:
          </p>
          <pre className="admin-code">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-address@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=BioTek <your-address@gmail.com>
SITE_URL=https://your-site-url`}</pre>
          <p style={{ color: "var(--mute)", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>
            Gmail: enable 2FA and create an App Password (Google Account →
            Security → App passwords). See README for other free options.
          </p>
        </div>
      )}

      <div className="card admin-upload">
        <div className="admin-editor__grid">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="mail-subject">Subject</label>
            <input
              id="mail-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New party announced — [date]"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="mail-message">Message (blank line = new paragraph)</label>
            <textarea
              id="mail-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder={"Partytek is back.\n\nDate: Saturday [date]. Location drops 24hrs before on the ticket page.\nTickets £10 avo / £12 otd — link below.\n\nSee you down the front."}
            />
          </div>
        </div>

        {showTest && (
          <div className="field" style={{ marginBottom: "1rem" }}>
            <label htmlFor="mail-test">Send a test to</label>
            <input
              id="mail-test"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="your@email"
            />
          </div>
        )}

        <p className="error" role="alert">{error}</p>
        {result && <p className="admin-upload__ok" role="status">{result}</p>}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            disabled={busy || configured === false}
            onClick={() => send(false)}
          >
            {busy ? "Sending…" : "Send to all subscribers"}
          </button>
          {!showTest ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setShowTest(true)}
              disabled={busy}
            >
              Send test first
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy || configured === false}
              onClick={() => send(true)}
            >
              Send test email
            </button>
          )}
        </div>
        {from && (
          <p className="mono-label" style={{ marginTop: "0.75rem" }}>
            sending as: {from}
          </p>
        )}
      </div>

      <h3 className="mono-label" style={{ marginBottom: "0.8rem" }}>
        Sent history
      </h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Subject</th>
            <th>Recipients</th>
          </tr>
        </thead>
        <tbody>
          {history.map((m) => (
            <tr key={m.id}>
              <td className="mono-label">{new Date(m.created_at + "Z").toLocaleString("en-GB")}</td>
              <td>{m.subject}</td>
              <td>{m.recipients}</td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan={3} className="admin-empty">
                Nothing sent yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
