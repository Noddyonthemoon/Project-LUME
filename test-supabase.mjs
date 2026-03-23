import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl);
console.log("KEY exists:", !!supabaseKey);

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function test() {
  console.log("Fetching incidents...");
  const { data: incidents, error: err1 } = await supabase.from('incidents').select('*');
  console.log("Incidents Error:", err1?.message);
  console.log("Incidents Data Length:", incidents?.length);

  console.log("\nFetching active fronts...");
  const { data: fronts, error: err2 } = await supabase.from('active_fronts').select('*');
  console.log("Fronts Error:", err2?.message);
  console.log("Fronts Data Length:", fronts?.length);
}

test();
