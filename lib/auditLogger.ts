import { createClient } from "@/lib/supabase/client";

interface LogParams {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: "CREATE_REPORT" | "MCC_APPROVE" | "MCC_REJECT" | "START_REPAIR" | "HOLD_WAITING_PACK" | "COMPLETE_REPAIR";
  description: string;
  targetId?: string;
}

export async function createAuditLog({
  userId,
  userName,
  userRole,
  action,
  description,
  targetId,
}: LogParams) {
  const supabase = createClient();

  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId || null,
      user_name: userName || "Sistem",
      user_role: userRole || "UNKNOWN",
      action,
      description,
      target_id: targetId || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Gagal menyimpan audit log:", error.message);
    }
  } catch (err) {
    console.error("Error pada audit logger:", err);
  }
}