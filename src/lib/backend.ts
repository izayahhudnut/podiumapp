import { getSupabaseClient } from './supabase';
import { trackLog, withTrace } from './opscompanion';

export async function checkBackendConnection() {
  return withTrace('backend.check_connection', { feature: 'backend' }, async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      await trackLog({
        eventName: 'backend.check_connection.failed',
        severity: 'ERROR',
        body: error.message,
        attributes: { feature: 'backend' },
      });
      throw error;
    }

    await trackLog({
      eventName: 'backend.check_connection.succeeded',
      attributes: { feature: 'backend' },
    });

    return true;
  });
}
