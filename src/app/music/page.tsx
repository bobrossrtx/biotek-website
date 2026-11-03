import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import MixEmbed from "@/components/MixEmbed";
import { getMixes } from "@/lib/content-db";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Music",
  description:
    "BioTek recordings and releases — party recordings, studio sets and pressings. Multigenre: jungle, tekno, dub, garage and more.",
  path: "/music/",
});

export default function MusicPage() {
  const mixes = getMixes();

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="section-kicker">{"// Transmissions"}</p>
          <h1 className="display-xl">MUSIC</h1>
          <p className="lead section-sub">
            Recordings from the parties and the studio. Players load on demand
            — press play and give it a second to spin up.
          </p>
        </div>
      </section>

      <section className="section" aria-label="Recordings and releases">
        <div className="wrap">
          <div className="mix-grid">
            {mixes.map((mix, i) => (
              <Reveal key={mix.id} delay={(i % 3) * 80}>
                <MixEmbed mix={mix} />
              </Reveal>
            ))}
          </div>

          {mixes.length === 0 && (
            <p className="lead">First transmission loading… sets land here soon.</p>
          )}
        </div>
      </section>
    </>
  );
}
