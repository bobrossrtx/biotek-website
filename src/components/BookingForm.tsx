"use client";

import { useState, type FormEvent } from "react";
import { site } from "@/lib/content";

type Status = "idle" | "sending" | "ok" | "error";

type Errors = Partial<
  Record<"name" | "email" | "eventDate" | "location" | "eventType" | "message", string>
>;

const EVENT_TYPES: { label: string; disabled?: boolean }[] = [
  { label: "Free party / DIY rave", disabled: true },
  { label: "Festival" },
  { label: "Club / venue night" },
  { label: "Private event" },
  { label: "Collab with another crew" },
  { label: "Ticket enquiry" },
  { label: "Other" },
];

export default function BookingForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");

  const isConfigured = true;

  function validate(data: FormData): Errors {
    const errs: Errors = {};
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const eventDate = String(data.get("eventDate") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    const eventType = String(data.get("eventType") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (name.length < 2) errs.name = "Tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!eventDate) errs.eventDate = "When's it happening?";
    if (location.length < 2) errs.location = "Where's the party?";
    if (!eventType) errs.eventType = "Pick an event type";
    if (message.length < 10) errs.message = "Give us a few more details (10+ characters)";
    return errs;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");
    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot: real users never fill this
    if (String(data.get("_gotcha") ?? "") !== "") return;

    const errs = validate(data);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
      setServerError("Transmission failed — email us directly instead.");
    }
  }

  const fieldProps = (
    key: keyof Errors,
    id: string
  ): {
    invalid: boolean;
    describedBy?: string;
  } => ({
    invalid: !!errors[key],
    describedBy: errors[key] ? `${id}-error` : undefined,
  });

  if (status === "ok") {
    return (
      <div className="form-ok card" role="status">
        <p className="form-ok__title display-xl">/ LOCKED IN</p>
        <p className="lead">
          Booking request received. We&apos;ll come back within a couple of days with
          availability and the tech rider. For anything urgent, email{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={onSubmit} noValidate>
      <div className="booking-form__grid">
        <div className="field">
          <label htmlFor="bk-name">Name *</label>
          <input
            id="bk-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={fieldProps("name", "bk-name").invalid}
            aria-describedby={fieldProps("name", "bk-name").describedBy}
          />
          <p className="error" id="bk-name-error" role="alert">
            {errors.name ?? ""}
          </p>
        </div>

        <div className="field">
          <label htmlFor="bk-email">Email *</label>
          <input
            id="bk-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={fieldProps("email", "bk-email").invalid}
            aria-describedby={fieldProps("email", "bk-email").describedBy}
          />
          <p className="error" id="bk-email-error" role="alert">
            {errors.email ?? ""}
          </p>
        </div>

        <div className="field">
          <label htmlFor="bk-date">Event date *</label>
          <input
            id="bk-date"
            name="eventDate"
            type="date"
            required
            aria-invalid={fieldProps("eventDate", "bk-date").invalid}
            aria-describedby={fieldProps("eventDate", "bk-date").describedBy}
          />
          <p className="error" id="bk-date-error" role="alert">
            {errors.eventDate ?? ""}
          </p>
        </div>

        <div className="field">
          <label htmlFor="bk-location">Location *</label>
          <input
            id="bk-location"
            name="location"
            type="text"
            placeholder="Town / city / region"
            required
            aria-invalid={fieldProps("location", "bk-location").invalid}
            aria-describedby={fieldProps("location", "bk-location").describedBy}
          />
          <p className="error" id="bk-location-error" role="alert">
            {errors.location ?? ""}
          </p>
        </div>

        <div className="field field--full">
          <label htmlFor="bk-type">Type of event *</label>
          <select
            id="bk-type"
            name="eventType"
            required
            defaultValue=""
            aria-invalid={fieldProps("eventType", "bk-type").invalid}
            aria-describedby={fieldProps("eventType", "bk-type").describedBy}
          >
            <option value="" disabled>
              Select…
            </option>
            {EVENT_TYPES.map((t) => (
              <option
                key={t.label}
                value={t.label}
                disabled={t.disabled}
              >
                {t.label}
              </option>
            ))}
          </select>
          <p className="error" id="bk-type-error" role="alert">
            {errors.eventType ?? ""}
          </p>
          <p className="mono-label booking-form__disclaimer">
            We do not hire out for free parties — those are organised through
            direct communication only.
          </p>
        </div>

        <div className="field field--full">
          <label htmlFor="bk-message">Message *</label>
          <textarea
            id="bk-message"
            name="message"
            required
            placeholder="Venue capacity, budget, set length, other sounds on the bill…"
            aria-invalid={fieldProps("message", "bk-message").invalid}
            aria-describedby={fieldProps("message", "bk-message").describedBy}
          />
          <p className="error" id="bk-message-error" role="alert">
            {errors.message ?? ""}
          </p>
        </div>
      </div>

      <div className="hp-field" aria-hidden="true">
        <label htmlFor="bk-gotcha">Leave this empty</label>
        <input id="bk-gotcha" name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {serverError && (
        <p className="form-server-error" role="alert">
          {serverError}
        </p>
      )}

      <button className="btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send booking request"}
      </button>
      <p className="mono-label booking-form__note">
        * required · form protected by honeypot spam trap
      </p>
    </form>
  );
}
