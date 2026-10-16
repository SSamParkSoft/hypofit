// Read-only verification: node infra/provision-posting-images.mjs --check
// Explicit provisioning: node infra/provision-posting-images.mjs --apply
// Supply SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY through the process environment.
// An authorized Storage owner must apply infra/posting-images-storage-policy.sql first.
const expected = {
  id: "posting-images", name: "posting-images", public: false,
  file_size_limit: 3 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png"],
};

async function main() {
  const flags = process.argv.slice(2);
  if (flags.length === 0) {
    console.log("No request or mutation performed. Use --check for read-only bucket verification or --apply for explicit provisioning with backend-only Supabase environment variables.");
    return;
  }
  if (flags.length !== 1 || !["--check", "--apply"].includes(flags[0])) {
    throw new Error("Choose exactly one operation: --check or --apply.");
  }
  const projectUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceKey || new URL(projectUrl).protocol !== "https:") throw new Error("Backend Supabase environment variables are required.");
  const headers = { apikey: serviceKey, "Content-Type": "application/json" };
  if (!serviceKey.startsWith("sb_secret_")) headers.Authorization = `Bearer ${serviceKey}`;
  const root = `${projectUrl.replace(/\/+$/, "")}/storage/v1/bucket`;
  const existing = await fetch(`${root}/${expected.id}`, { headers, signal: AbortSignal.timeout(15_000) });
  if (existing.ok) {
    const bucket = await existing.json();
    const mimeTypes = bucket.allowed_mime_types ?? [];
    if (bucket.public !== false || Number(bucket.file_size_limit) !== expected.file_size_limit
      || mimeTypes.length !== 2 || !expected.allowed_mime_types.every(type => mimeTypes.includes(type))) {
      throw new Error("Existing bucket configuration differs. No overwrite performed; review it in the Supabase Dashboard.");
    }
    console.log("Existing private posting-images bucket configuration verified; no mutation performed.");
    return;
  }
  let missing = existing.status === 404;
  if (existing.status === 400) {
    // Observed legacy Storage response: HTTP 400 with a 404 Bucket-not-found body.
    const error = await existing.json().catch(() => null);
    missing = String(error?.statusCode) === "404" && error?.message === "Bucket not found";
  }
  if (!missing) throw new Error(`Bucket lookup failed with HTTP ${existing.status}. No mutation performed.`);
  if (flags[0] === "--check") {
    console.error("Private posting-images bucket does not exist. Read-only verification made no changes.");
    process.exitCode = 1;
    return;
  }
  const created = await fetch(root, { method: "POST", headers, body: JSON.stringify(expected), signal: AbortSignal.timeout(15_000) });
  if (!created.ok) throw new Error(`Bucket creation failed with HTTP ${created.status}.`);
  console.log("Private posting-images bucket created. Verify the separately applied operator Storage RLS policy before enabling POSTING_IMAGES_ENABLED.");
}

main().catch(() => {
  // Never include provider bodies, credentials, signed URLs or raw network errors in console output.
  console.error("Posting image provisioning failed. Check backend credentials, permissions and bucket settings; no existing bucket was overwritten.");
  process.exitCode = 1;
});
