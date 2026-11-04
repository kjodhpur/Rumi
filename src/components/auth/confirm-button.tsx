"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/i18n";

/** Submit button for /auth/confirm. Spins while signing in so a second tap can't resubmit. */
export function ConfirmButton() {
  const { pending } = useFormStatus();
  const t = useT("auth");
  return (
    <Button type="submit" size="lg" block loading={pending}>
      {t("confirm")}
    </Button>
  );
}
