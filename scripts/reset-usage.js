const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function getEnv(name) {
  const env = fs.readFileSync(".env.local", "utf8");
  const m = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sb = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const { data: sample } = await sb.from("workspace_usage").select("*").limit(1);
  console.log("keys", sample?.[0] ? Object.keys(sample[0]) : []);

  const zeroPatch = {};
  if (sample?.[0]) {
    for (const k of Object.keys(sample[0])) {
      if (/_used|used_/i.test(k) && typeof sample[0][k] === "number") {
        zeroPatch[k] = 0;
      }
    }
  }
  console.log("zeroPatch", zeroPatch);

  if (Object.keys(zeroPatch).length) {
    const { error } = await sb
      .from("workspace_usage")
      .update(zeroPatch)
      .neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("workspace_usage", error ? error.message : "OK");
  }

  // usage_counters if present
  const { error: ucErr } = await sb
    .from("usage_counters")
    .update({ count: 0, used: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("usage_counters", ucErr ? ucErr.message : "OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
