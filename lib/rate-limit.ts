import { SupabaseClient } from "@supabase/supabase-js";

const MAX_MESSAGES_PER_HOUR = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  // Get current window usage
  const { data: usage } = await supabase
    .from("chat_usage")
    .select("id, message_count, window_start")
    .eq("user_id", userId)
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!usage) {
    // No usage in current window — create new record
    await supabase.from("chat_usage").insert({
      user_id: userId,
      message_count: 1,
      window_start: new Date().toISOString(),
    });
    return { allowed: true, remaining: MAX_MESSAGES_PER_HOUR - 1 };
  }

  if (usage.message_count >= MAX_MESSAGES_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await supabase
    .from("chat_usage")
    .update({ message_count: usage.message_count + 1 })
    .eq("id", usage.id);

  return {
    allowed: true,
    remaining: MAX_MESSAGES_PER_HOUR - usage.message_count - 1,
  };
}
