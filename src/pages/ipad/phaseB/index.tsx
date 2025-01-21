// src/pages/ipad/phaseB/index.tsx

import PageTimer from '@/components/pageTimer';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

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
      return { preferred: [1], fallback: [2] };
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

  // 推奨曲をログに入れるための state
  const [recommendedTracksForA, setRecommendedTracksForA] = useState<TrackData[]>([]);
  const [recommendedTracksForB, setRecommendedTracksForB] = useState<TrackData[]>([]);

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
      .eq('select_tracks_user_id', userId)
      .eq('session_id', session_id)

    if (error) {
      console.error('Error fetching already selected tracks:', error);
      return [];
    }
    if (!data) {
      return [];
    }

    // select_tracks カラムには1つのトラックID(string)が入っている想定
    const selectedIds = data.map((row) => row.select_tracks).filter(Boolean);
    return selectedIds;
  }, [session_id]);

  /**
   * Supabase から楽曲を取得し、条件に合った**最大4件**をランダムで返す
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

      // 過去に選択した曲を除外
      if (alreadySelectedTrackIds.length > 0) {
        const excludeList = `(${alreadySelectedTrackIds.map((id) => `'${id}'`).join(',')})`;
        query = query.not('spotify_track_id', 'in', excludeList);
      }

      const { data: preferredData, error: preferredError } = await query;
      if (preferredError) {
        console.error('Error fetching preferred tracks:', preferredError);
        return [];
      }

      let combined: TrackData[] = preferredData || [];

      // --- (2) 4件に満たない場合はフォールバックを追加 ---
      if (combined.length < 4 && fallback.length > 0) {
        let fallbackQuery = supabase
          .from('tracks')
          .select('*')
          .eq('user_id', userId)
          .neq('self_disclosure_level', 0)
          .in('self_disclosure_level', fallback);

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

      // --- (3) シャッフルして先頭4件を返す ---
      const shuffled = combined.sort(() => 0.5 - Math.random()).slice(0, 4);
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

      // 推奨された楽曲を state に保持
      setRecommendedTracksForA(userATrackList);
      setRecommendedTracksForB(userBTrackList);
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

    // logsテーブルへインサート
    try {
      const { error: logError } = await supabase
        .from('logs')
        .insert([
          {
            session_id: session_id,
            phase_id: phase_id,
            user_id: userASpotifyId,
            recommended_tracks: recommendedTracksForA,
            selected_track: selectedTrack,
          },
        ]);

      if (logError) {
        throw logError;
      }
    } catch (err) {
      console.error('Failed to insert logs:', err);
      alert('ログの記録に失敗しました');
      return;
    }

    // phasesテーブル更新
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

    // logsテーブルへインサート
    try {
      const { error: logError } = await supabase
        .from('logs')
        .insert([
          {
            session_id: session_id,
            phase_id: phase_id,
            user_id: userBSpotifyId,
            recommended_tracks: recommendedTracksForB,
            selected_track: selectedTrack,
          },
        ]);

      if (logError) {
        throw logError;
      }
    } catch (err) {
      console.error('Failed to insert logs:', err);
      alert('ログの記録に失敗しました');
      return;
    }

    // phasesテーブル更新
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
      <div className="flex flex-col items-center justify-center w-screen h-[100dvh] bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">実験はここまでです！</h1>
          <h1 className="text-2xl font-bold mb-2">
            部屋を出て中川まで声をかけてください
          </h1>
        </div>
      </div>
    );
  }

  if (directionNum === 1) {
    // ユーザーAが選ぶ画面
    return (
      <div className="flex flex-col w-screen h-[100dvh] bg-gray-100">
        <div className="flex-grow overflow-auto p-6 pb-24">
          <h1 className="text-3xl font-bold mb-4 text-center">
            {phaseNumbersNum} フェーズ目です
          </h1>
          <div className="absolute top-4 left-4 px-4 py-2">
            <PageTimer />
          </div>
          <p className="mb-6 text-center text-lg">
            以下の楽曲から1つ選んでください。
          </p>

          {userATracks.length === 0 ? (
            <p className="text-center text-xl">楽曲がありません。</p>
          ) : (
            // 2×2の形で表示（最大4曲）
            <div className="grid grid-cols-2 gap-4">
              {userATracks.map((track) => (
                <div
                  key={track.spotify_track_id}
                  className={`relative flex flex-col items-start border rounded-lg p-4 shadow cursor-pointer
                    ${selectedTrack === track.spotify_track_id
                      ? 'border-green-500'
                      : 'border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedTrack(track.spotify_track_id)}
                >
                  {track.image_url && (
                    <Image
                      src={track.image_url}
                      alt={track.name}
                      width={100}
                      height={100}
                      className="object-cover rounded-sm"
                    />
                  )}
                  <div className="mt-2">
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
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gray-100">
          <button
            onClick={handleSelectUserATracks}
            className="w-full py-4 bg-blue-600 text-white text-2xl rounded-lg hover:bg-blue-700"
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
      <div className="flex flex-col w-screen h-[100dvh] bg-gray-100">
        <div className="flex-grow overflow-auto p-6 pb-24">
          <h1 className="text-3xl font-bold mb-4 text-center">
            {phaseNumbersNum} フェーズ目です
          </h1>
          <div className="absolute top-4 left-4 px-4 py-2">
            <PageTimer />
          </div>
          <p className="mb-6 text-center text-lg">
            以下の楽曲から1つ選んでください。
          </p>

          {userBTracks.length === 0 ? (
            <p className="text-center text-xl">楽曲がありません。</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {userBTracks.map((track) => (
                <div
                  key={track.spotify_track_id}
                  className={`relative flex flex-col items-start border rounded-lg p-4 shadow cursor-pointer
                    ${selectedTrack === track.spotify_track_id
                      ? 'border-green-500'
                      : 'border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedTrack(track.spotify_track_id)}
                >
                  {track.image_url && (
                    <Image
                      src={track.image_url}
                      alt={track.name}
                      width={100}
                      height={100}
                      className="object-cover rounded-md"
                    />
                  )}
                  <div className="mt-2">
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
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gray-100">
          <button
            onClick={handleSelectUserBTracks}
            className="w-full py-4 bg-blue-600 text-white text-2xl rounded-lg hover:bg-blue-700"
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
