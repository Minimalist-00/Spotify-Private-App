import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string; // イメージURLを含む
  self_disclosure_level?: number;
};

/**
 * フェーズに応じて優先・フォールバックの self_disclosure_level を返す
 */
function getPreferredAndFallbackLevels(phase: number) {
  switch (phase) {
    case 1:
    case 2:
      return { preferred: [1], fallback: [] };
    case 3:
    case 4:
      return { preferred: [2], fallback: [1] };
    case 5:
    case 6:
      return { preferred: [3], fallback: [2] };
    case 7:
    case 8:
      return { preferred: [4], fallback: [3] };
    default:
      return { preferred: [], fallback: [] };
  }
}

export default function PhasesPage() {
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  const phaseNumbersNum = phase_numbers ? Number(phase_numbers) : 0;
  const directionNum = directions ? Number(directions) : 0;

  const [userA, setUserA] = useState<string | null>(null);
  const [userB, setUserB] = useState<string | null>(null);
  const [userATracks, setUserATracks] = useState<TrackData[]>([]);
  const [userBTracks, setUserBTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState('');

  useEffect(() => {
    if (!session_id) return;

    const fetchSessionUsers = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('user_a, user_b')
        .eq('id', session_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch session user_a, user_b:', error);
        return;
      }
      setUserA(data.user_a);
      setUserB(data.user_b);
    };

    fetchSessionUsers();
  }, [session_id]);

  /**
   * 指定ユーザーがこれまでに選択したトラック ID リストを取得する
   */
  const fetchAlreadySelectedTrackIds = useCallback(async (userId: string) => {
    // phasesテーブルの select_tracks_user_id が該当ユーザーになっている行の select_tracks を収集
    const { data, error } = await supabase
      .from('phases')
      .select('select_tracks')
      .eq('select_tracks_user_id', userId);

    if (error) {
      console.error('Error fetching already selected tracks:', error);
      return [];
    }
    if (!data) {
      return [];
    }

    // select_tracks カラムには1つのトラックID(string)が入っている想定なので単純に配列化
    const selectedIds = data.map((row) => row.select_tracks).filter(Boolean);
    return selectedIds;
  }, []);

  /**
   * Supabase から楽曲を取得し、条件に合った3件をランダムで返す
   */
  const fetchRecommendedTracks = useCallback(
    async (userId: string, phase: number) => {
      const { preferred, fallback } = getPreferredAndFallbackLevels(phase);
      if (preferred.length === 0) {
        // phase9 などの場合、曲を取得しない
        return [];
      }

      // (A) このユーザーが過去に選択したトラックIDを全て取得
      const alreadySelectedTrackIds = await fetchAlreadySelectedTrackIds(userId);

      // --- (1) 優先度の高い self_disclosure_level の曲を取得 (0 は除外) ---
      let query = supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId)
        .neq('self_disclosure_level', 0)
        .in('self_disclosure_level', preferred);

      // 過去選択したものを除外
      if (alreadySelectedTrackIds.length > 0) {
        // PostgreSQL のクエリ的に "('id1','id2')" という文字列を作る
        const excludeList = `(${alreadySelectedTrackIds.map((id) => `'${id}'`).join(',')})`;
        query = query.not('spotify_track_id', 'in', excludeList);
      }

      const { data: preferredData, error: preferredError } = await query;
      if (preferredError) {
        console.error('Error fetching preferred tracks:', preferredError);
        return [];
      }

      let combined: TrackData[] = preferredData || [];

      // --- (2) 3件に満たない場合はフォールバックの曲を追加 ---
      if (combined.length < 3 && fallback.length > 0) {
        let fallbackQuery = supabase
          .from('tracks')
          .select('*')
          .eq('user_id', userId)
          .neq('self_disclosure_level', 0)
          .in('self_disclosure_level', fallback);

        // 過去選択したものを除外
        if (alreadySelectedTrackIds.length > 0) {
          const excludeList = `(${alreadySelectedTrackIds.map((id) => `'${id}'`).join(',')})`;
          fallbackQuery = fallbackQuery.not('spotify_track_id', 'in', excludeList);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) {
          console.error('Error fetching fallback tracks:', fallbackError);
        } else if (fallbackData) {
          combined = combined.concat(fallbackData);
        }
      }

      // --- (3) シャッフルして先頭3件を返す ---
      const shuffled = combined.sort(() => 0.5 - Math.random()).slice(0, 3);
      return shuffled;
    },
    [fetchAlreadySelectedTrackIds]
  );

  useEffect(() => {
    const fetchAll = async () => {
      if (!userA || !userB) return;

      const [userATrackList, userBTrackList] = await Promise.all([
        fetchRecommendedTracks(userA, phaseNumbersNum),
        fetchRecommendedTracks(userB, phaseNumbersNum),
      ]);

      setUserATracks(userATrackList);
      setUserBTracks(userBTrackList);
    };

    fetchAll();
  }, [userA, userB, phaseNumbersNum, fetchRecommendedTracks]);

  const handleSelectUserATracks = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    const { data: userAData, error: userAError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userA)
      .single();

    if (userAError || !userAData) {
      alert('userAのspotify_user_id 取得失敗');
      return;
    }
    const userASpotifyId = userAData.spotify_user_id;

    const { error } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userASpotifyId,
      })
      .eq('id', phase_id);

    if (error) {
      console.error('Error updating phase:', error);
      alert('曲の決定に失敗しました');
      return;
    }

    alert('曲を決定しました');
    router.push({
      pathname: '/ipad/phaseB/player',
      query: { session_id, phase_id, phase_numbers, directions },
    });
  };

  const handleSelectUserBTracks = async () => {
    if (!phase_id || !selectedTrack) {
      alert('曲が選択されていません');
      return;
    }

    const { data: userBData, error: userBError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userB)
      .single();

    if (userBError || !userBData) {
      alert('userBのspotify_user_id 取得失敗');
      return;
    }
    const userBSpotifyId = userBData.spotify_user_id;

    const { error } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrack,
        select_tracks_user_id: userBSpotifyId,
      })
      .eq('id', phase_id);

    if (error) {
      console.error('Error updating phase:', error);
      alert('曲の決定に失敗しました');
      return;
    }

    alert('曲を決定しました');
    router.push({
      pathname: '/ipad/phaseB/player',
      query: { session_id, phase_id, phase_numbers, directions },
    });
  };

  if (phaseNumbersNum === 9) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">ご協力ありがとうございました</h1>
        <Link href="/" className="text-blue-500 underline">
          トップに戻る
        </Link>
      </div>
    );
  }

  if (directionNum === 1) {
    // ユーザーAが選ぶ画面
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">{phaseNumbersNum} フェーズ目です</h1>
        <p className="mb-4">以下の楽曲から1つ選んでください。</p>

        {userATracks.length === 0 ? (
          <p className="text-center">楽曲がありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userATracks.map((track) => (
              <div
                key={track.spotify_track_id}
                className={`relative flex border rounded-lg p-4 shadow ${
                  selectedTrack === track.spotify_track_id ? 'border-green-500' : 'border-gray-300'
                }`}
                onClick={() => setSelectedTrack(track.spotify_track_id)}
              >
                {track.image_url && (
                  <Image
                    src={track.image_url}
                    alt={track.name}
                    width={70}
                    height={70}
                    className="object-cover rounded-md"
                  />
                )}
                <div className="ml-4">
                  <h2 className="font-semibold text-lg">{track.name}</h2>
                  <p className="text-sm text-gray-600">{track.album_name}</p>
                  <p className="text-sm text-gray-500">{track.artist_name}</p>
                </div>
                {selectedTrack === track.spotify_track_id && (
                  <span className="absolute top-2 right-2 text-green-500 font-semibold text-sm">
                    選択中
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
          <button
            onClick={handleSelectUserATracks}
            className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={!selectedTrack}
          >
            曲を決定する
          </button>
        </div>
      </div>
    );
  }

  if (directionNum === 2) {
    // ユーザーBが選ぶ画面
    return (
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4">{phaseNumbersNum} フェーズ目です</h1>
        <p className="mb-4">以下の楽曲から1つ選んでください。</p>

        {userBTracks.length === 0 ? (
          <p className="text-center">楽曲がありません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {userBTracks.map((track) => (
              <div
                key={track.spotify_track_id}
                className={`relative flex border rounded-lg p-4 shadow ${
                  selectedTrack === track.spotify_track_id ? 'border-green-500' : 'border-gray-300'
                }`}
                onClick={() => setSelectedTrack(track.spotify_track_id)}
              >
                {track.image_url && (
                  <Image
                    src={track.image_url}
                    alt={track.name}
                    width={70}
                    height={70}
                    className="object-cover rounded-md"
                  />
                )}
                <div className="ml-4">
                  <h2 className="font-semibold text-lg">{track.name}</h2>
                  <p className="text-sm text-gray-600">{track.album_name}</p>
                  <p className="text-sm text-gray-500">{track.artist_name}</p>
                </div>
                {selectedTrack === track.spotify_track_id && (
                  <span className="absolute top-2 right-2 text-green-500 font-semibold text-sm">
                    選択中
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
          <button
            onClick={handleSelectUserBTracks}
            className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={!selectedTrack}
          >
            曲を決定する
          </button>
        </div>
      </div>
    );
  }

  return null;
}
