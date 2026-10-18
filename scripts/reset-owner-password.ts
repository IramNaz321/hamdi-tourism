import { existsSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { isServerSupabaseKey } from "../src/lib/supabase/key-validation";
import { publicSupabaseConfig } from "../src/lib/supabase/config";

const projectRef = "hzcupgjphowrzvrdffrf";
const ownerId = "988e629b-6770-4b93-b9ba-7c1bce325680";
const ownerEmail = "hamdi.tourism@mail.ru";

type OwnerMembership = {
  user_id: string;
  organization_id: string;
  email: string;
  role: string;
  active: boolean;
};

function configure() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !config ||
    new URL(config.url).hostname !== `${projectRef}.supabase.co` ||
    !isServerSupabaseKey(serviceKey)
  ) {
    throw new Error("Expected project configuration or server credentials are unavailable.");
  }

  return createClient(config.url, serviceKey!.trim(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyOwner(client: ReturnType<typeof configure>) {
  const { data: authResult, error: authError } = await client.auth.admin.getUserById(ownerId);
  const user = authResult.user;
  if (
    authError ||
    !user ||
    user.id !== ownerId ||
    user.email !== ownerEmail ||
    !user.email_confirmed_at ||
    user.deleted_at ||
    (user.banned_until && Date.parse(user.banned_until) > Date.now())
  ) {
    throw new Error("The specified existing Auth account did not pass identity/status checks.");
  }

  const { data: membership, error: membershipError } = await client
    .from("staff_members")
    .select("user_id,organization_id,email,role,active")
    .eq("user_id", ownerId)
    .maybeSingle<OwnerMembership>();
  if (
    membershipError ||
    !membership ||
    membership.user_id !== ownerId ||
    membership.email !== ownerEmail ||
    membership.role !== "owner" ||
    membership.active !== true
  ) {
    throw new Error("The specified account does not have the required active Owner membership.");
  }

  const { data: organization, error: organizationError } = await client
    .from("organizations")
    .select("id")
    .eq("id", membership.organization_id)
    .maybeSingle<{ id: string }>();
  if (organizationError || organization?.id !== membership.organization_id) {
    throw new Error("The Owner membership's existing organization could not be verified.");
  }

  return { user, membership };
}

function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run this command in a real interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const previousRawMode = stdin.isRaw;
    let value = "";
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();

    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(previousRawMode ?? false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new Error("Input cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          continue;
        }
        if (character >= " ") value += character;
      }
    };

    stdin.on("data", onData);
  });
}

async function readLine(prompt: string): Promise<string> {
  const { createInterface } = await import("node:readline/promises");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await readline.question(prompt);
  } finally {
    readline.close();
  }
}

function strongPassword(password: string) {
  const groups = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  return Array.from(password).length >= 16 && groups >= 3;
}

async function main() {
  const client = configure();
  const before = await verifyOwner(client);

  console.log(`Verified project: ${projectRef}.supabase.co`);
  console.log(`Verified Auth account: ${before.user.id} / ${before.user.email}`);
  console.log("Verified membership: active Owner in the existing organization.");

  if (process.argv.includes("--verify-only")) {
    console.log("Read-only verification complete; no changes made.");
    return;
  }

  const password = await readHidden("New password (hidden): ");
  if (!strongPassword(password)) {
    throw new Error("Use at least 16 characters and at least three character categories.");
  }
  const passwordAgain = await readHidden("Re-enter new password (hidden): ");
  if (password !== passwordAgain) {
    throw new Error("The private password entries did not match.");
  }

  const confirmation = await readLine(
    `Type RESET ${ownerId} to change only this account's password: `,
  );
  if (confirmation !== `RESET ${ownerId}`) {
    console.log("Cancelled; no password change was requested.");
    return;
  }

  const { error: updateError } = await client.auth.admin.updateUserById(ownerId, { password });
  if (updateError) {
    throw new Error("Supabase did not confirm the password update; verify Auth before retrying.");
  }

  const after = await verifyOwner(client);
  if (
    after.user.id !== before.user.id ||
    after.user.email !== before.user.email ||
    !isDeepStrictEqual(after.user.user_metadata, before.user.user_metadata) ||
    !isDeepStrictEqual(after.user.app_metadata, before.user.app_metadata) ||
    !isDeepStrictEqual(after.membership, before.membership)
  ) {
    throw new Error(
      "The password request succeeded, but identity/metadata verification failed. Do not retry; inspect the account in Supabase.",
    );
  }

  console.log("Password updated. UID, email, Auth metadata and active Owner membership are unchanged.");
  console.log("No database rows or business data were changed.");
  console.log("Now sign in through the site's normal login page using the new password.");
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unexpected failure; inspect securely before retrying.";
  console.error(`Owner password reset stopped: ${message}`);
  process.exitCode = 1;
});
