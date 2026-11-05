import type { TestProject } from "vitest/node";
import { adminClient, buildWorld, loadEnv, stackUp, teardownWorld, type World } from "./world";

declare module "vitest" {
  export interface ProvidedContext {
    /** Null when the local Supabase stack isn't running; the RLS table tests then skip. */
    rlsWorld: World | null;
  }
}

/** Builds the RLS cast once per run (see world.ts) and removes it afterwards. */
export default async function setup(project: TestProject) {
  const env = loadEnv();
  if (!env.local || !env.anon || !env.service || !(await stackUp(env.url, env.anon))) {
    project.provide("rlsWorld", null);
    return;
  }
  const admin = adminClient(env.url, env.service);
  const world = await buildWorld(env.url, env.anon, admin);
  project.provide("rlsWorld", world);
  return async () => {
    await teardownWorld(world, admin);
  };
}
