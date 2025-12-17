// Supabase subscription helpers for Komensky Play
// This file defines a minimal schema interface and helpers
// so the app can distinguish 무료/유료 계정을 나중에 결제 연동과 함께 사용할 수 있습니다.

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type SubscriptionStatus = "free" | "trial" | "active" | "canceled" | "past_due";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_code: string | null;
  status: SubscriptionStatus;
  trial_until: string | null; // ISO timestamp
  current_period_end: string | null; // ISO timestamp
  created_at: string;
  updated_at: string;
}

// 현재 로그인된 사용자의 구독 정보를 Supabase subscriptions 테이블에서 읽습니다.
export async function fetchCurrentSubscription(session: Session | null): Promise<SubscriptionRow | null> {
  if (!supabase || !session?.user) return null;

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.warn("[subscriptions] fetchCurrentSubscription error", error);
      return null;
    }

    return (data as SubscriptionRow) ?? null;
  } catch (e) {
    console.warn("[subscriptions] unexpected error", e);
    return null;
  }
}

// 구독 레코드를 보고 이 사용자가 유료 권한을 갖는지 판단합니다.
// - status === "active": 유료
// - status === "trial" && trial_until > now: 한시 무료이지만, 유료와 동일하게 취급 가능
// 나머지는 무료로 간주합니다.
export function isPaidUser(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;

  const now = new Date();

  if (sub.status === "active") return true;

  if (sub.status === "trial" && sub.trial_until) {
    const until = new Date(sub.trial_until);
    if (until.getTime() > now.getTime()) return true;
  }

  // 필요하다면 past_due + current_period_end 로직 등 확장 가능
  return false;
}
