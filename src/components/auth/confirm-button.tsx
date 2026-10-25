"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button for /auth/confirm. Spins while signing in so a second tap can't resubmit. */
export function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block loading={pending}>
      Sign in to Rumi
    </Button>
  );
}
