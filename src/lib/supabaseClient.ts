// Thin client wrapper to align with expected import path
// Re-exports the browser Supabase client and provides a createClient() helper
import { supabase as client } from "./supabase";

export const supabase = client;
export default client;
export function createClient() {
  return client;
}