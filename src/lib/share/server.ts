import "server-only";
import { randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { deriveShareToken, hashShareToken, type ShareKind } from "./token";

/** The link token for a row, derived with TOKEN_ENCRYPTION_KEY. */
export function shareTokenFor(kind: ShareKind, id: string) {
  return deriveShareToken(serverEnv.tokenEncryptionKey, kind, id);
}

/** A fresh row id and the hash to store with it. */
export function newShareRow(kind: ShareKind) {
  const id = randomUUID();
  const token = shareTokenFor(kind, id);
  return { id, token, tokenHash: hashShareToken(token) };
}
