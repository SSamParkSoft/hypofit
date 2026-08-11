import { supabase } from "../../shared/supabase/client";

const SUPABASE_CONFIG_ERROR = "Supabase 브라우저 환경 변수가 설정되지 않았습니다.";

export function getSupabaseClientOrThrow() {
  if (!supabase) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return supabase;
}
