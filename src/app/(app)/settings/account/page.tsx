import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { DeleteAccount } from "@/components/settings/delete-account";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("settingsPages"))("delete.title") };
}

export default function DeleteAccountPage() {
  return <DeleteAccount />;
}
