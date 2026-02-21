import { createServerClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth/user-menu";

export async function ChatHeader() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <h1 className="text-lg font-semibold">SoPersonal</h1>
      <UserMenu email={user?.email ?? undefined} />
    </header>
  );
}
