import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually since dotenv might not be installed
try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, "utf-8");
        envConfig.split("\n").forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, "");
                process.env[key] = value;
            }
        });
        console.log("✅ Loaded environment from .env.local");
    }
} catch (e) {
    console.warn("⚠️ Could not load .env.local:", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing required environment variables:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    console.error("\nPlease set these in your .env.local file");
    process.exit(1);
}

async function triggerDailyTasks() {
    console.log("🚀 Triggering generate-daily-tasks Edge Function...");

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase.functions.invoke(
            "generate-daily-tasks",
            {
                body: {},
            },
        );

        if (error) {
            console.error("❌ Error invoking function:", error);
            if (error.status === 404) {
                console.log(
                    'ℹ️  If you are running locally, make sure "supabase functions serve" is running.',
                );
            }
        } else {
            console.log("✅ Function invoked successfully!");
            console.log("Response:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("❌ Unexpected error:", err);
    }
}

triggerDailyTasks();
