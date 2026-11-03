"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "ok" | "error";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
      setError("Couldn't sign you up — try again");
    }
  }

  if (status === "ok") {
    return (
      <p className="form-ok" role="status">
        / You&apos;re on the list. See you down the front.
      </p>
    );
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} noValidate>
      <div className="newsletter__row">
        <label htmlFor="newsletter-email" className="visually-hidden">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          placeholder="your@email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "newsletter-error" : undefined}
        />
        <button className="btn" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "…" : "Join"}
        </button>
      </div>
      <p id="newsletter-error" className="error newsletter__error" role="alert">
        {error}
      </p>
    </form>
  );
}
