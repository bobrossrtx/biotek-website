import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section" style={{ minHeight: "60vh" }}>
      <div className="wrap">
        <p className="section-kicker">{"// 404"}</p>
        <h1 className="display-xl">SIGNAL LOST</h1>
        <p className="lead section-sub">
          This frequency doesn&apos;t exist. The rig&apos;s probably still up
          somewhere though.
        </p>
        <div className="hero__actions" style={{ marginTop: "1.5rem" }}>
          <Link href="/" className="btn">
            Back to base
          </Link>
          <Link href="/events/" className="btn btn--ghost">
            Find the next party
          </Link>
        </div>
      </div>
    </section>
  );
}
