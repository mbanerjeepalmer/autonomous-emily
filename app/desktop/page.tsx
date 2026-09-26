import { DesktopClient } from "@/components/DesktopClient";
import { readAppSession } from "@/lib/auth";

export default async function DesktopPage() {
  const signedIn = await readAppSession();
  return <DesktopClient initiallySignedIn={signedIn} />;
}
