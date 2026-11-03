import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import GalleryPartyView from "@/components/GalleryPartyView";
import { getGallery, getPartyFolders } from "@/lib/content-db";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Gallery",
  description:
    "Free party photography from BioTek parties — stacks, crowds, generators and sunrises. East Sussex and beyond.",
  path: "/gallery/",
});

export default function GalleryPage() {
  const parties = getPartyFolders();
  const unsorted = getGallery().filter(() => false); // legacy: only party-grouped photos are public
  void unsorted;

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="section-kicker">{"// Evidence"}</p>
          <h1 className="display-xl">GALLERY</h1>
          <p className="lead section-sub">
            Photography from the parties. No faces, no locations — just the
            rig, the crowd and the mess we leave behind. Pick a party and
            click any photo to blow it up.
          </p>
        </div>
      </section>

      <section className="section" aria-label="Photo gallery">
        <div className="wrap">
          {parties.length > 0 ? (
            <GalleryPartyView parties={parties} />
          ) : (
            <Reveal>
              <p className="lead">
                Nothing in the archive yet — photos go up after each party.
              </p>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
