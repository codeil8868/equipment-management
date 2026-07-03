import { createClient } from '@supabase/supabase-js';

// URL·anon(publishable) 키는 브라우저에 공개되는 공개 값(보안은 RLS로 보호).
// env가 있으면 우선 사용하고, 없거나 비어 있으면 아래 값으로 폴백 → 배포 env 문제 방지.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://prmdfxcxnznywzixgkhl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ggQd-piaYgSY_2mcnP_hFw_I3ydZ4zM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
