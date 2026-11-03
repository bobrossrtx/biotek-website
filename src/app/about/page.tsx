import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { getRoles, getRigSpecs } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import data from "@/content/about.json";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: `${data.intro.slice(0, 140)}…`,
  path: "/about/",
});

export default function AboutPage() {
  const { intro, collective, rig, standards } = data;

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="section-kicker">{"// Who we are"}</p>
          <h1 className="display-xl">ABOUT</h1>
          <p className="lead section-sub">{intro}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="collective-heading">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="section-kicker">{"// No faces, no names"}</p>
                <h2 id="collective-heading" className="section-title">
                  {collective.heading}
                </h2>
              </div>
            </div>
            <p className="lead section-sub">{collective.statement}</p>
          </Reveal>

          <div className="roles-grid">
            {getRoles().map((item, i) => (
              <Reveal key={item.role} delay={i * 80}>
                <article className="role-card">
                  <span className="role-card__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="role-card__role">{item.role}</h3>
                  <p className="role-card__desc">{item.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SOUND SYSTEM SPECS — commented out until the rig is more impressive.
          To restore: uncomment this block, keep the getRigSpecs import, and
          the spec table (from about.json → rig.specs) will render again.

      <section className="section section--alt" aria-labelledby="rig-heading">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="section-kicker">{"// Iron & air"}</p>
                <h2 id="rig-heading" className="section-title">
                  Sound System Specs
                </h2>
              </div>
            </div>
            <p className="lead section-sub">{rig.intro}</p>
          </Reveal>

          <Reveal delay={100}>
            <div className="rig-photos">
              {rig.photos.map((photo) => (
                <Image
                  key={photo.src}
                  src={photo.src}
                  alt={photo.alt}
                  width={1200}
                  height={800}
                />
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <table className="spec-table">
              <caption className="visually-hidden">
                BioTek sound system technical specifications
              </caption>
              <tbody>
                {getRigSpecs().map((spec) => (
                  <tr key={spec.label}>
                    <th scope="row">{spec.label}</th>
                    <td>{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mono-label" style={{ marginTop: "1.2rem" }}>
              {rig.note}
            </p>
          </Reveal>
        </div>
      </section>
      End of commented-out Sound System Specs section. */}

      <section className="section section--alt" aria-labelledby="standards-heading">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <p className="section-kicker">{"// The deal"}</p>
                <h2 id="standards-heading" className="section-title">
                  {standards.heading}
                </h2>
              </div>
            </div>
            <p className="lead section-sub">{standards.intro}</p>
          </Reveal>

          <Reveal delay={100}>
            <ul className="standards-list">
              {standards.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mono-label standards-outro">{standards.outro}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
