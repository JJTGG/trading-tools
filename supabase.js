const SUPABASE_URL = "https://kaierwmqowgpizvwoyet.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lyrrIdCyXNH2IZt5O5PjQQ_G1l2IBKD";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);