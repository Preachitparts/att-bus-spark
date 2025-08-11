import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-4">Theme and admin management (coming soon).</p>
      <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
    </div>
  );
}
