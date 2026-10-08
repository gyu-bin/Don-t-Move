import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
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

/** All-user events. The password is typed in the admin screen and is not stored in the app. */
export async function fetchRemoteAnalyticsEvents(password: string): Promise<AnalyticsEvent[]> {
  if (!analyticsRemoteConfigured()) throw new Error('network');
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/admin-analytics`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new Error('network');
  }
  if (response.status === 401) throw new Error('unauthorized');
  if (!response.ok) throw new Error('network');
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('network');
  return mapRemoteRows(data as RemoteRow[]);
}
