import { getSupabaseClient } from './supabase';

export async function uploadDebateThumbnail(
  userId: string,
  uri: string,
): Promise<string> {
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
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('debate-thumbnails').getPublicUrl(data.path);

  return publicUrl;
}
