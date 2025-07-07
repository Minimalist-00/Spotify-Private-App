// src/pages/ipad/phaseB/index.tsx

import ConfirmTrackDialog from '@/components/ConfirmTrackDialog';
import TrackSelection from '@/components/TrackSelection';
import { supabase } from '@/utils/supabaseClient';
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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingUser, setConfirmingUser] = useState<'A' | 'B' | null>(null);
  const [selectedTrackInfo, setSelectedTrackInfo] = useState<TrackData | null>(null);

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
  const fetchAlreadySelectedTrackIds = useCallback(async () => {
    // phasesテーブルの select_tracks_user_id が該当ユーザーになっている行の select_tracks を収集
    const { data, error } = await supabase
      .from('phases')
      .select('select_tracks')
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
    console.log(selectedIds);
    return selectedIds;
  }, [session_id]);

  /**
   * Supabase から楽曲を取得し、条件に合った**最大4件**をランダムで返す
   */
  const fetchRecommendedTracks = useCallback(
    async (userId: string, phase: number) => {
      const { preferred, fallback } = getPreferredAndFallbackLevels(phase);
      if (preferred.length === 0) {
        return [];
      }

      const alreadySelectedTrackIds = await fetchAlreadySelectedTrackIds();

      const { data: allTracks, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId)
        .neq('self_disclosure_level', 0);

      if (error) {
        console.error('Error fetching all tracks:', error);
        return [];
      }

      // クライアントサイドでフィルタリング
      const filteredTracks = allTracks
        .filter((track) => preferred.includes(track.self_disclosure_level))
        .filter((track) => !alreadySelectedTrackIds.includes(track.spotify_track_id));

      // 必要に応じてフォールバックレベルの曲を追加
      if (filteredTracks.length < 4 && fallback.length > 0) {
        const fallbackTracks = allTracks
          .filter((track) => fallback.includes(track.self_disclosure_level))
          .filter((track) => !alreadySelectedTrackIds.includes(track.spotify_track_id));

        console.log([...filteredTracks, ...fallbackTracks].sort(() => 0.5 - Math.random()).slice(0, 4));
        return [...filteredTracks, ...fallbackTracks].sort(() => 0.5 - Math.random()).slice(0, 4);
      }

      console.log(filteredTracks.sort(() => 0.5 - Math.random()).slice(0, 4));
      return filteredTracks.sort(() => 0.5 - Math.random()).slice(0, 4);
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

  const handleOpenConfirmDialog = (userType: 'A' | 'B') => {
    const trackList = userType === 'A' ? userATracks : userBTracks;
    const track = trackList.find((t) => t.spotify_track_id === selectedTrack) || null;
    setSelectedTrackInfo(track);
    setConfirmingUser(userType);
    setShowConfirmDialog(true);
  };

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false);
    setConfirmingUser(null);
    setSelectedTrackInfo(null);
  };

  const handleConfirmTrack = async () => {
    if (!phase_id || !selectedTrackInfo) {
      alert('曲が選択されていません');
      return;
    }
    const userId = confirmingUser === 'A' ? userA : userB;
    const recommendedTracks = confirmingUser === 'A' ? recommendedTracksForA : recommendedTracksForB;
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('spotify_user_id')
      .eq('spotify_user_id', userId)
      .single();
    if (userError || !userData) {
      alert(`${confirmingUser}のspotify_user_id 取得失敗`);
      return;
    }
    const spotifyId = userData.spotify_user_id;
    // logsテーブルへインサート
    try {
      const { error: logError } = await supabase
        .from('logs')
        .insert([
          {
            session_id: session_id,
            phase_id: phase_id,
            user_id: spotifyId,
            recommended_tracks: recommendedTracks,
            selected_track: selectedTrackInfo.spotify_track_id,
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
        select_tracks: selectedTrackInfo.spotify_track_id,
        select_tracks_user_id: spotifyId,
      })
      .eq('id', phase_id);
    if (error) {
      console.error('Error updating phase:', error);
      alert('曲の決定に失敗しました');
      return;
    }
    setShowConfirmDialog(false);
    setConfirmingUser(null);
    setSelectedTrackInfo(null);
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
      <>
        <TrackSelection
          tracks={userATracks}
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          onConfirm={() => handleOpenConfirmDialog('A')}
          phaseNumber={phaseNumbersNum}
          showSearch={false}
          layout="list"
        />
        <ConfirmTrackDialog
          open={showConfirmDialog}
          onClose={handleCloseConfirmDialog}
          onConfirm={handleConfirmTrack}
          track={selectedTrackInfo}
        />
      </>
    );
  }

  if (directionNum === 2) {
    // ユーザーBが選ぶ画面
    return (
      <>
        <TrackSelection
          tracks={userBTracks}
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          onConfirm={() => handleOpenConfirmDialog('B')}
          phaseNumber={phaseNumbersNum}
          showSearch={false}
          layout="list"
        />
        <ConfirmTrackDialog
          open={showConfirmDialog}
          onClose={handleCloseConfirmDialog}
          onConfirm={handleConfirmTrack}
          track={selectedTrackInfo}
        />
      </>
    );
  }

  return null;
}
