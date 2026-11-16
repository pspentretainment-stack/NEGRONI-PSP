
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kvueckbgcnzippkzxfmn.supabase.co";
const supabasePublishableKey = "sb_publishable_6jfTuIgBgbU0ZA_uLn6PEw_YMW-s17v";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
