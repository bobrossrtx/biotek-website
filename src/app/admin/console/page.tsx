import type { Metadata } from "next";
import Console from "./Console";

export const metadata: Metadata = {
  title: "Admin Console",
  robots: { index: false, follow: false },
};

export default function ConsolePage() {
  return <Console />;
}
