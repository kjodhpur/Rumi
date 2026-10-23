import type { Metadata } from "next";
import { DeleteAccount } from "@/components/settings/delete-account";

export const metadata: Metadata = { title: "Delete account" };

export default function DeleteAccountPage() {
  return <DeleteAccount />;
}
