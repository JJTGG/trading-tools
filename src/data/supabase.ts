import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    "https://kaierwmqowgpizvwoyet.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_lyrrIdCyXNH2IZt5O5PjQQ_G1l2IBKD";

export const supabaseClient =
    createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

const browserWindow =
    window as typeof window & {
        supabaseClient?: typeof supabaseClient;
    };

browserWindow.supabaseClient =
    supabaseClient;