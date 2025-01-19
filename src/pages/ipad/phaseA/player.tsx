import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';

/* ================ 1) Spotifyの型定義 ================ */
interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (
    eventName: 'ready' | 'not_ready' | 'player_state_changed',
    cb: (
      arg: PlayerReadyEvent | PlayerNotReadyEvent | PlaybackState | null
    ) => void
  ) => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  getCurrentState?: () => Promise<PlaybackState | null>;
}

interface PlayerReadyEvent {
  device_id: string;
}
interface PlayerNotReadyEvent {
  device_id: string;
}

interface PlaybackState {
  paused: boolean;
  position: number; // ミリ秒
  duration: number; // ミリ秒
  track_window: {
    current_track: {
      name: string;
      artists: Array<{ name: string }>;
      album: {
        images: Array<{ url: string }>;
      };
    };
  };
}

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

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

export default function PlayerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { session_id, phase_id, phase_numbers, directions } = router.query;

  // Supabaseから取得するトラックID
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // SpotifyPlayerインスタンス
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // 曲再生中の情報を管理するためのState
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [position, setPosition] = useState<number>(0); // ミリ秒
  const [duration, setDuration] = useState<number>(0); // ミリ秒
  const [trackName, setTrackName] = useState<string>('');
  const [trackArtists, setTrackArtists] = useState<string>('');
  const [albumImage, setAlbumImage] = useState<string>('');

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
        .from('phases')
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

  // 4) Spotify Web Playback SDKスクリプトを読み込み
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSRガード

    const scriptId = 'spotify-player-script';
    if (!document.getElementById(scriptId)) {
      const scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.src = 'https://sdk.scdn.co/spotify-player.js';
      scriptTag.async = true;
      document.body.appendChild(scriptTag);
    }
  }, []);

  /**
   * 5) プレイヤー生成
   */
  useEffect(() => {
    if (!session?.accessToken) return;
    if (typeof window === 'undefined') return;
    if (player) return; // すでにプレイヤーがあれば作り直さない

    const initializePlayer = () => {
      if (!window.Spotify) return;
      console.log('Initializing Spotify Player...');

      const newPlayer = new window.Spotify.Player({
        name: 'My Web Player',
        getOAuthToken: (cb) => {
          cb(session.accessToken as string);
        },
        volume: 0.5,
      });

      newPlayer.addListener('ready', (arg) => {
        if (!arg) return;
        const event = arg as PlayerReadyEvent;
        console.log('Ready with Device ID', event.device_id);
        setDeviceId(event.device_id);
      });

      newPlayer.addListener('not_ready', (arg) => {
        if (!arg) return;
        const event = arg as PlayerNotReadyEvent;
        console.log('Device ID has gone offline', event.device_id);
      });

      newPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        const ps = state as PlaybackState;
        setIsPaused(ps.paused);
        setPosition(ps.position);
        setDuration(ps.duration);

        const currentTrack = ps.track_window.current_track;
        setTrackName(currentTrack.name);
        setTrackArtists(currentTrack.artists.map((a) => a.name).join(', '));
        setAlbumImage(currentTrack.album.images?.[0]?.url || '');
      });

      newPlayer.connect();
      setPlayer(newPlayer);
    };

    if (!window.onSpotifyWebPlaybackSDKReady) {
      window.onSpotifyWebPlaybackSDKReady = () => {
        console.log('SDK loaded → onSpotifyWebPlaybackSDKReady called.');
        initializePlayer();
      };
    }

    if (window.Spotify) {
      initializePlayer();
    }
  }, [session?.accessToken, player]);

  /**
   * 6) プレイヤーのクリーンアップ
   */
  useEffect(() => {
    // 「player が変化したとき」「アンマウント時」に前の player をdisconnect
    return () => {
      if (player) {
        console.log('Disconnecting old player...');
        player.disconnect();
      }
    };
  }, [player]);

  /**
   * 7) ポーリングで再生状態を更新 (1秒おき)
   */
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(async () => {
      if (!isPaused) {
        try {
          const state = await player.getCurrentState?.();
          if (state) {
            setPosition(state.position);
            setDuration(state.duration);
          }
        } catch (err) {
          console.error('Error polling player state:', err);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player, isPaused]);

  /**
   * 8) 画面遷移時に曲を一時停止する
   *    → routeChangeStart イベントをフックして player.pause() を呼ぶ
   */
  useEffect(() => {
    const handleRouteChange = () => {
      if (player) {
        console.log('Route change detected. Pausing track...');
        player.pause().catch((err) => console.error('Error pausing on route change:', err));
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, player]);

  /* ========== 再生・停止・シークなどの操作関数 ========== */
  const handlePlay = async () => {
    if (!session?.accessToken || !deviceId || !selectedTrackId) return;

    try {
      await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            uris: [`spotify:track:${selectedTrackId}`],
          }),
        }
      );
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handleSeek = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const newPosition = Number(event.target.value);
    try {
      await player.seek(newPosition);
    } catch (error) {
      console.error('Error seeking track:', error);
    }
  };

  /* ========== ページ遷移 ========== */
  const handleGotoDialogue = () => {
    router.push({
      pathname: '/ipad/phaseA/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  /* ========== ユーティリティ: 時間表示 ========== */
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Please login...</div>;
  }

  return (
    <div className="p-4">
      <h1>曲の再生ページ</h1>
      <p>状態: {isPaused ? '停止中' : '再生中'}</p>

      <div className="mt-4">
        <button
          onClick={handlePlay}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          再生
        </button>
      </div>

      {/* 楽曲情報の表示 */}
      {trackName && (
        <div className="mt-6 flex items-center">
          {albumImage && (
            <Image
              src={albumImage}
              alt="Album Cover"
              width={80}
              height={80}
              style={{ width: '80px', height: '80px', marginRight: '1rem' }}
            />
          )}
          <div>
            <p className="font-bold">{trackName}</p>
            <p className="text-sm text-gray-500">{trackArtists}</p>
          </div>
        </div>
      )}

      {/* 再生位置とスライダー */}
      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={duration}
          value={position}
          onChange={handleSeek}
          style={{ width: '100%' }}
        />
        <div className="flex justify-between text-sm mt-1">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleGotoDialogue}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          対話セクションに移動する
        </button>
      </div>
    </div>
  );
}
