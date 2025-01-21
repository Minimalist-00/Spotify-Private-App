import { supabase } from '@/utils/supabaseClient';

type TrackToSave = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name: string;
  album_name: string;
  image_url?: string;
  popularity: number;
  song_favorite_level?: number | null;
  can_singing?: number | null;
};

export async function saveTracksToSupabase(tracks: TrackToSave[]): Promise<void> {
  if (tracks.length === 0) return;

  // まずは user_id と track_id を抜き出す
  const userId = tracks[0].user_id; 
  // （基本的には同一ユーザーでまとめて渡してくる想定とする）

  const trackIds = tracks.map((track) => track.spotify_track_id);

  // 既存のレコードを取得 (同じ user_id & trackIds のレコードのみ)
  const { data: existingTracks, error: fetchError } = await supabase
    .from('tracks')
    .select('spotify_track_id, user_id, song_favorite_level, can_singing')
    .eq('user_id', userId)
    .in('spotify_track_id', trackIds);

  if (fetchError) {
    console.error('Error fetching existing tracks:', fetchError);
    throw fetchError;
  }

  // 既存レコードを (spotify_track_id + user_id) をキーにして Map化
  const existingTracksMap = new Map(
    existingTracks?.map((track) => [`${track.spotify_track_id}:${track.user_id}`, track])
  );

  // 新規データと既存データをマージ
  const mergedTracks = tracks.map((track) => {
    const key = `${track.spotify_track_id}:${track.user_id}`;
    const existingTrack = existingTracksMap.get(key);
    return {
      ...track,
      ...(existingTrack
        ? {
            song_favorite_level: existingTrack.song_favorite_level,
            can_singing: existingTrack.can_singing,
          }
        : {}),
    };
  });

  // マージ後のデータをアップサート
  // Supabase 側で UNIQUE(spotify_track_id, user_id) が設定されている前提
  const { data, error } = await supabase
    .from('tracks')
    .upsert(mergedTracks, {
      onConflict: 'spotify_track_id,user_id', 
    });

  if (error) {
    console.error('Error saving tracks to Supabase:', error);
    throw error;
  }

  console.log('Tracks saved to Supabase:', data);
}
