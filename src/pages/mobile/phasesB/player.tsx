// pages/phasesA/player.tsx

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

/* 
  Spotify Web API から返るトラック情報用の型
  artists: Array<SpotifyArtist>
  album: { images: ... }
*/
interface SpotifyArtist {
  name: string;
  // 必要に応じて追加
}

interface SpotifyAlbumImage {
  url: string;
}

interface SpotifyAlbum {
  images: SpotifyAlbumImage[];
  // 必要に応じて追加
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  // 必要に応じて追加
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

  // SpotifyPlayerインターフェース
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // 曲再生中の情報を管理するためのState
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [position, setPosition] = useState<number>(0); // ミリ秒
  const [duration, setDuration] = useState<number>(0); // ミリ秒
  const [trackName, setTrackName] = useState<string>('');
  const [trackArtists, setTrackArtists] = useState<string>('');
  const [albumImage, setAlbumImage] = useState<string>('');

  // 認証チェック
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('spotify');
    }
  }, [status]);

  /**
   * (A) phasesテーブルから select_tracks を取得して
   *     selectedTrackId に格納
   */
  useEffect(() => {
    if (!phase_id) return;
    const fetchPhase = async () => {
      const { data, error } = await supabase
        .from('phases')
        .select('select_tracks, select_tracks_user_id')
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

  /**
   * (B) selectedTrackId が設定されたら、
   *     Spotify Web API からトラック詳細を取得して表示用の情報をセット
   */
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
        // SpotifyTrack 型で型アサーション
        const trackData = (await response.json()) as SpotifyTrack;

        setTrackName(trackData.name);
        setTrackArtists(trackData.artists.map((a: SpotifyArtist) => a.name).join(', '));
        setAlbumImage(trackData.album.images?.[0]?.url || '');
      } catch (err) {
        console.error('Error fetching track info:', err);
      }
    };
    fetchTrackInfo();
  }, [selectedTrackId, session?.accessToken]);

  // SpotifyのWeb Playback SDKをscriptで読み込み
  useEffect(() => {
    const existingScriptTag = document.getElementById('spotify-player');
    if (!existingScriptTag) {
      const scriptTag = document.createElement('script');
      scriptTag.id = 'spotify-player';
      scriptTag.src = 'https://sdk.scdn.co/spotify-player.js';
      scriptTag.async = true;
      document.body.appendChild(scriptTag);
    }
  }, []);

  // SDKロード後にプレイヤーを初期化
  useEffect(() => {
    if (!session?.accessToken) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      if (!window.Spotify) return;
      const newPlayer = new window.Spotify.Player({
        name: 'My Web Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(session.accessToken as string);
        },
        volume: 0.5,
      });

      // (1) デバイスが ready のとき
      newPlayer.addListener('ready', (arg) => {
        if (!arg) return;
        const event = arg as PlayerReadyEvent;
        console.log('Ready with Device ID', event.device_id);
        setDeviceId(event.device_id);
      });

      // (2) デバイスが not_ready のとき
      newPlayer.addListener('not_ready', (arg) => {
        if (!arg) return;
        const event = arg as PlayerNotReadyEvent;
        console.log('Device ID has gone offline', event.device_id);
      });

      // (3) 再生中の状態が変わるたびに呼ばれる
      newPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        const ps = state as PlaybackState;

        setIsPaused(ps.paused);
        setPosition(ps.position);
        setDuration(ps.duration);

        // 曲が切り替わった場合にトラック情報を上書き
        const currentTrack = ps.track_window.current_track;
        setTrackName(currentTrack.name);
        setTrackArtists(currentTrack.artists.map((a) => a.name).join(', '));
        setAlbumImage(currentTrack.album.images?.[0]?.url || '');
      });

      newPlayer.connect();
      setPlayer(newPlayer);
    };
  }, [session?.accessToken]);

  /**
   * (C) setInterval で 1秒おきにプレイヤーの状態を取得し、
   *     position / duration / isPaused を更新してスライダーを連動
   */
  useEffect(() => {
    if (!player) return;
    const interval = setInterval(async () => {
      try {
        const state = await player.getCurrentState?.();
        if (state) {
          setIsPaused(state.paused);
          setPosition(state.position);
          setDuration(state.duration);
        }
      } catch (err) {
        console.error('Error polling player state:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player]);

  // 曲の再生
  const handlePlay = async () => {
    if (!session?.accessToken || !deviceId || !selectedTrackId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          uris: [`spotify:track:${selectedTrackId}`],
        }),
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  // スライダーを動かしてシーク
  const handleSeek = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const newPosition = Number(event.target.value);
    try {
      await player.seek(newPosition);
    } catch (error) {
      console.error('Error seeking track:', error);
    }
  };

  // ページ遷移
  const handleGotoDialogue = async () => {
    if (!player) return;
    try {
      await player.pause();
    } catch (error) {
      console.error('Error pausing track:', error);
    }
    router.push({
      pathname: '/phasesB/dialog',
      query: {
        session_id,
        phase_id,
        phase_numbers,
        directions,
      },
    });
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) {
    return <div>Please login...</div>;
  }

  // 分:秒 表示用の関数
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

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
