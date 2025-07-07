// src/pages/ipad/phaseA/index.tsx

import ConfirmTrackDialog from '@/components/ConfirmTrackDialog';
import TrackSelection from '@/components/TrackSelection';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  can_singing?: number | null;
  song_favorite_level?: number | null;
};

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
        console.error('Failed to fetch session user_a', error);
        return;
      }
      setUserA(data.user_a);
      setUserB(data.user_b);
    };

    fetchSessionUsers();
  }, [session_id]);

  useEffect(() => {
    if (!userA) return;
    if (!userB) return;

    const fetchUserATracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .neq('self_disclosure_level', 0)
        .eq('user_id', userA);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setUserATracks(data as TrackData[]);
      }
    };

    const fetchUserBTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .neq('self_disclosure_level', 0)
        .eq('user_id', userB);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setUserBTracks(data as TrackData[]);
      }
    };

    fetchUserATracks();
    fetchUserBTracks();
  }, [userA, userB]);

  const handleOpenConfirmDialog = (userType: 'A' | 'B') => {
    // 選択された曲の詳細情報を取得
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
    const { error: upError } = await supabase
      .from('phases')
      .update({
        select_tracks: selectedTrackInfo.spotify_track_id,
        select_tracks_user_id: spotifyId,
      })
      .eq('id', phase_id);
    if (upError) {
      console.error('phases update error:', upError);
      alert('曲の決定に失敗しました');
      return;
    }
    setShowConfirmDialog(false);
    setConfirmingUser(null);
    setSelectedTrackInfo(null);
    alert('曲を決定しました');
    router.push({
      pathname: '/ipad/phaseA/player',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
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

  // directionNum === 1 (ユーザーAが曲を選ぶ) の画面
  if (directionNum === 1) {
    return (
      <>
        <TrackSelection
          tracks={userATracks}
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          onConfirm={() => handleOpenConfirmDialog('A')}
          phaseNumber={phaseNumbersNum}
          showSearch={true}
          layout="grid"
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

  // directionNum === 2 (ユーザーBが曲を選ぶ) の画面
  if (directionNum === 2) {
    return (
      <>
        <TrackSelection
          tracks={userBTracks}
          selectedTrack={selectedTrack}
          onTrackSelect={setSelectedTrack}
          onConfirm={() => handleOpenConfirmDialog('B')}
          phaseNumber={phaseNumbersNum}
          showSearch={true}
          layout="grid"
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
