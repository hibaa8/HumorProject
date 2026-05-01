import { spawn, type ChildProcess } from "node:child_process";

/*
 * Vitest globalSetup that spawns a dedicated `next dev` instance on port 3001
 * so E2E tests run against a known clean server (avoids conflicts with the
 * user's own `npm run dev` on :3000 or with other Next.js apps on the system).
 *
 * If E2E_BASE_URL is set we skip spawning and trust the URL — useful for
 * running E2E tests against a Vercel preview from CI.
 */

const E2E_PORT = 3001;
const READY_TIMEOUT_MS = 60_000;

let serverProcess: ChildProcess | null = null;

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`E2E dev server did not become ready at ${url}`);
}

export async function setup() {
  if (process.env.E2E_BASE_URL) {
    process.env.E2E_TEST_BASE_URL = process.env.E2E_BASE_URL;
    return;
  }

  const baseUrl = `http://localhost:${E2E_PORT}`;
  process.env.E2E_TEST_BASE_URL = baseUrl;

  serverProcess = spawn("npx", ["next", "dev", "-p", String(E2E_PORT)], {
    stdio: ["ignore", "ignore", "pipe"],
    detached: false,
    env: { ...process.env, NODE_ENV: "development" },
  });

  serverProcess.stderr?.on("data", () => {
    /* swallow noisy stderr */
  });

  await waitForServer(`${baseUrl}/`);
}

export async function teardown() {
  if (serverProcess?.pid) {
    try {
      process.kill(serverProcess.pid);
    } catch {
      /* already dead */
    }
  }
}
