import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ANALYTICS_ADMIN_TOKEN,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  analyticsRemoteConfigured,
} from './analyticsConfig';
import { getInstallId } from './installId';
import type { AnalyticsEvent, AnalyticsEventName, AnalyticsProps } from './analyticsTypes';

type RemoteRow = {
  id: string;
  created_at: string;
  install_id: string;
  platform: string;
  app_version: string;
  name: string;
  props: AnalyticsProps | null;
};

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!analyticsRemoteConfigured()) {
    client = null;
    return null;
  }
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    client = null;
  }
  return client;
}

export function uploadAnalyticsEvent(
  name: AnalyticsEventName,
  props: AnalyticsProps,
): void {
  const sb = getClient();
  if (!sb) return;
  void (async () => {
    try {
      const install_id = await getInstallId();
      const platform = typeof props.platform === 'string' ? props.platform : 'unknown';
      const app_version = typeof props.appVersion === 'string' ? props.appVersion : '';
      const { platform: _p, appVersion: _v, ...rest } = props;
      await sb.from('analytics_events').insert({
        install_id,
        platform: platform === 'ios' || platform === 'android' || platform === 'web' ? platform : 'unknown',
        app_version,
        name,
        props: rest,
      });
    } catch {
      /* never block gameplay */
    }
  })();
}

export function mapRemoteRows(rows: RemoteRow[]): AnalyticsEvent[] {
  return rows.map((row) => ({
    id: row.id,
    at: Date.parse(row.created_at) || Date.now(),
    name: row.name as AnalyticsEvent['name'],
    props: {
      ...(row.props && typeof row.props === 'object' ? row.props : {}),
      platform: row.platform,
      appVersion: row.app_version,
      installId: row.install_id,
    },
  }));
}

/** All-user events for the admin screen. Falls back to empty on auth/network failure. */
export async function fetchRemoteAnalyticsEvents(limit = 8000): Promise<AnalyticsEvent[]> {
  const sb = getClient();
  if (!sb) throw new Error('Supabase is not configured');
  const { data, error } = await sb.rpc('admin_analytics_events', {
    p_token: ANALYTICS_ADMIN_TOKEN,
    p_limit: limit,
  });
  if (error) throw error;
  return mapRemoteRows((data ?? []) as RemoteRow[]);
}
