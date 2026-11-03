import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <section className="section" style={{ minHeight: "70vh" }}>
      <div className="wrap" style={{ maxWidth: "26rem" }}>
        <p className="section-kicker">{"// Restricted"}</p>
        <h1 className="section-title">Admin Login</h1>
        <LoginForm />
      </div>
    </section>
  );
}
