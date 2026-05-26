import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Query pg_typeof for laser_position column
const { data, error } = await admin.rpc("pg_typeof", {
  query: "SELECT laser_position FROM cs_orders LIMIT 1",
});

if (error) {
  console.log("Query error:", error.message);

  // Try raw SQL via the REST API
  const { data: d2 } = await admin
    .from("cs_orders")
    .select("laser_position")
    .limit(1);

  if (d2 && d2.length > 0) {
    console.log("laser_position value:", d2[0].laser_position);
    console.log("typeof:", typeof d2[0].laser_position);
  } else {
    // Just check a sample row
    const { data: sample } = await admin
      .from("cs_orders")
      .select("laser_position")
      .not("laser_position", "is", null)
      .limit(1);

    if (sample && sample.length > 0) {
      console.log("Sample laser_position:", sample[0].laser_position);
    } else {
      console.log("No rows with laser_position set");
    }
  }
} else {
  console.log("laser_position type:", data);
}
