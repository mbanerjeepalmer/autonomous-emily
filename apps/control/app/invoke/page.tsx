import { InvokeClient } from "@/components/InvokeClient";
import { readAppSession } from "@/lib/auth";

export default async function InvokePage() {
  const signedIn = await readAppSession();
  return <InvokeClient initiallySignedIn={signedIn} />;
}
