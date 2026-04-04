import { getSupabaseClient } from './supabase';
import { trackLog, withTrace } from './opscompanion';

export async function uploadDebateThumbnail(
  userId: string,
  uri: string,
): Promise<string> {
  return withTrace(
    'storage.upload_debate_thumbnail',
    { feature: 'storage', 'user.id': userId },
    async () => {
      const supabase = getSupabaseClient();

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileName = `${userId}/${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('debate-thumbnails')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        await trackLog({
          eventName: 'storage.upload_debate_thumbnail.failed',
          severity: 'ERROR',
          body: error.message,
          attributes: { feature: 'storage', 'user.id': userId },
        });
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('debate-thumbnails').getPublicUrl(data.path);

      await trackLog({
        eventName: 'storage.upload_debate_thumbnail.succeeded',
        body: { path: data.path },
        attributes: { feature: 'storage', 'user.id': userId },
      });

      return publicUrl;
    },
  );
}
