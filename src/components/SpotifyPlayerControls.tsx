import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

/* ================ Spotifyの型定義 ================ */
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

interface SpotifyPlayerControlsProps {
  selectedTrackId: string | null;
}

export default function SpotifyPlayerControls({ selectedTrackId }: SpotifyPlayerControlsProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // SpotifyPlayerインスタンス
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // 曲再生中の情報を管理するためのState
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [position, setPosition] = useState<number>(0); // ミリ秒
  const [duration, setDuration] = useState<number>(0); // ミリ秒

  // 初回の再生かどうかを判定するフラグ
  const [hasStarted, setHasStarted] = useState(false);

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

  // 初回再生 (楽曲のURIを指定して再生開始)
  const handlePlayFromStart = async () => {
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

  // 再生 / 一時停止をトグルで行う
  const handleTogglePlay = async () => {
    if (!player) return;

    if (isPaused) {
      // 現在パーズ(停止)中 → 再生したい
      if (!hasStarted) {
        // まだ一度も再生してない → はじめて再生
        await handlePlayFromStart();
        setHasStarted(true);
      } else {
        // すでに再生したことがある → 一時停止位置から再開
        try {
          await player.resume();
        } catch (error) {
          console.error('Error resuming track:', error);
        }
      }
    } else {
      // 現在再生中 → 一時停止
      try {
        await player.pause();
      } catch (error) {
        console.error('Error pausing track:', error);
      }
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

  /* ========== ユーティリティ: 時間表示 ========== */
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 再生 / 停止ボタン */}
      <button
        onClick={handleTogglePlay}
        className="w-16 h-16 rounded-full flex items-center justify-center bg-green-600 text-white text-2xl mb-8 hover:bg-green-700"
      >
        {isPaused ? '▶' : '❚❚'}
      </button>

      {/* シークバー */}
      <div className="w-[80%] max-w-md mb-2">
        <input
          type="range"
          min={0}
          max={duration}
          value={position}
          onChange={handleSeek}
          className="w-full"
        />
      </div>
      <div className="w-[80%] max-w-md flex justify-between text-sm text-gray-700 mb-6">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </>
  );
} 