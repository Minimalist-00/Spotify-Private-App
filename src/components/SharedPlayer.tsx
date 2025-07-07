import { supabase } from '@/utils/supabaseClient';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// ここでタイマーHookをインポート
import PageTimer from '@/components/pageTimer';
import usePageTimer from '@/hooks/usePageTimer';

// 設定値
const DIALOGUE_BUTTON_DELAY_SECONDS = 60;

/* ================ Spotifyの型定義 ================ */
interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbumImage {
  url: string;
}

interface SpotifyAlbum {
  images: SpotifyAlbumImage[];
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface SharedPlayerProps {
  phaseType: 'A' | 'B';
  dialogueButtonDelay?: number;
  title?: string;
  children?: React.ReactNode;
}

export default function SharedPlayer({
  phaseType,
  dialogueButtonDelay = DIALOGUE_BUTTON_DELAY_SECONDS,
  title = "デンモクで選曲し、1番を歌ってください",
  children
}: SharedPlayerProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  // Supabaseから取得するトラックID
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // 楽曲情報を管理するためのState
  const [trackName, setTrackName] = useState<string>('');
  const [trackArtists, setTrackArtists] = useState<string>('');
  const [albumImage, setAlbumImage] = useState<string>('');

  // xx秒経過後にボタンを表示するためのフラグ
  const [showDialogueButton, setShowDialogueButton] = useState<boolean>(false);

  // ページ滞在時間（秒）
  const elapsedTime = usePageTimer();

  // 1) 認証チェック（未認証なら signIn）
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('spotify');
    }
  }, [status]);

  // 2) phasesテーブルから `select_tracks` を取得
  useEffect(() => {
    if (!phase_id) return;
    const fetchPhase = async () => {
      const { data, error } = await supabase
        .from('phases2')
        .select('select_tracks')
        .eq('id', phase_id)
        .single();

      if (error || !data) {
        console.error('Failed to fetch phases:', error);
        return;
      }
      setSelectedTrackId(data.select_tracks);
    };
    fetchPhase();
  }, [phase_id]);

  // 3) 選択されたトラックIDが決まったら、Spotify Web API から情報を取得
  useEffect(() => {
    if (!selectedTrackId || !session?.accessToken) return;

    const fetchTrackInfo = async () => {
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/tracks/${selectedTrackId}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );
        if (!response.ok) {
          console.error('Failed to fetch track info:', response.statusText);
          return;
        }
        const trackData = (await response.json()) as SpotifyTrack;
        setTrackName(trackData.name);
        setTrackArtists(trackData.artists.map((a) => a.name).join(', '));
        setAlbumImage(trackData.album.images?.[0]?.url || '');
      } catch (err) {
        console.error('Error fetching track info:', err);
      }
    };
    fetchTrackInfo();
  }, [selectedTrackId, session?.accessToken]);

  /* ========== ページ遷移 ========== */
  const handleGotoDialogue = () => {
    router.push({
      pathname: `/ipad/phase${phaseType}/dialog`,
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  // ページに滞在してxx秒以上経過したらボタンを表示
  useEffect(() => {
    if (elapsedTime >= dialogueButtonDelay && !showDialogueButton) {
      setShowDialogueButton(true);
    }
  }, [elapsedTime, showDialogueButton, dialogueButtonDelay]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Please login...</div>;
  }

  return (
    <div className="relative w-screen h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
      {/* 右上にスキップボタン */}
      <button
        onClick={handleGotoDialogue}
        className="absolute top-4 right-4 text-white bg-gray-600 rounded-full px-4 py-2 hover:bg-gray-700"
      >
        &raquo;&raquo;
      </button>

      <div className="absolute top-4 left-4 px-4 py-2">
        <PageTimer />
      </div>

      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {/* アルバムイメージ */}
      <div className="w-64 h-64 bg-gray-300 relative mb-4 flex items-center justify-center">
        {albumImage && (
          <Image
            src={albumImage}
            alt="Album Cover"
            fill
            className="object-cover"
          />
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-xl font-semibold">{trackName}</p>
        <p className="text-md text-gray-600">{trackArtists}</p>
      </div>

      {/* カスタムコンテンツ（再生コントロールなど） */}
      {children}

      {/* xx秒以上滞在で表示するボタン */}
      {showDialogueButton && (
        <button
          onClick={handleGotoDialogue}
          className="w-64 py-3 bg-blue-600 text-white text-lg rounded hover:bg-blue-700"
        >
          対話セクションに移動する
        </button>
      )}
    </div>
  );
} 