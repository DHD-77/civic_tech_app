// Paste your Supabase values here (Supabase > Project Settings > API).
// Use the "anon / public" key ONLY. Never put the service_role key in a browser file.
window.CIVIC_CONFIG = {
  url: "https://supabase.com/dashboard/project/rnzklzbsitjhyijpkntx/settings/api-keys",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuemtsemJzaXRqaHlpanBrbnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjYzMzAsImV4cCI6MjEwNzIwMjMzMH0.-TiR3cBzEgET_3XFZV2dzF1c90sWltxS_qQ6oe6BFfc",
  threshold: 3,  // must match the SQL function (different residents needed)
  radiusM: 30    // must match the SQL function (metres)
};
