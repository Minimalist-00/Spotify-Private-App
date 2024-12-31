// src/pages/Playlists.tsx
import Image from 'next/image';
import { useEffect, useState } from 'react';

const Playlists = () => {
  // プレイリスト一覧
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // 選択中のプレイリストID
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  // 選択中プレイリストの楽曲一覧 (特徴量付き)
  const [tracks, setTracks] = useState<Track[]>([]);
  // 取得に失敗したトラック (サーバーから通知された)
  const [failedTrackIds, setFailedTrackIds] = useState<string[]>([]);
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  // ローディング状態
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);

  // --- (A) マウント時にプレイリスト一覧を取得 ---
  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoadingPlaylists(true);
      try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        const data = await response.json();
        setPlaylists(data.playlists || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoadingPlaylists(false);
      }
    };

    fetchPlaylists();
  }, []);

  // --- (B) プレイリスト ID をクリックしたときにトラックを取得 ---
  const fetchTracks = async (playlistId: string) => {
    // 同じプレイリストを再選択した場合は選択解除
    if (playlistId === selectedPlaylist) {
      setSelectedPlaylist(null);
      setTracks([]);
      setFailedTrackIds([]);
      return;
    }

    setLoadingTracks(true);
    try {
      setSelectedPlaylist(playlistId);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks for playlist ${playlistId}`);
      }

      const data: TracksResponse = await response.json();
      // トラックと、失敗したIDを state に保存
      setTracks(data.items || []);
      setFailedTrackIds(data.failedTrackIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching tracks:', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  // --- エラー表示 ---
  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  // --- JSX (表示) ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Your Playlists</h1>
      {loadingPlaylists && <p className="text-center text-gray-500">Loading Playlists...</p>}

      {/* プレイリスト一覧 */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:bg-gray-700"
            onClick={() => fetchTracks(playlist.id)}
          >
            <div className="relative w-full h-48">
              <Image
                src={playlist.images[0]?.url || '/placeholder.png'}
                alt={playlist.name}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold truncate">{playlist.name}</h2>
              <p className="text-sm text-gray-400">By: {playlist.owner.display_name}</p>
              <p className="text-sm text-gray-500 italic truncate">
                Tracks: {playlist.tracks.total}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* トラック一覧 (特徴量付き) */}
      {selectedPlaylist && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Tracks</h2>
          {loadingTracks ? (
            <p className="text-center text-gray-500">Loading tracks...</p>
          ) : (
            <>
              {/* 取得失敗したトラックがあった場合の通知 */}
              {failedTrackIds.length > 0 && (
                <div className="bg-yellow-600 text-white p-3 mb-4 rounded">
                  以下の {failedTrackIds.length} 曲はローカルトラックまたは取得エラーのため、
                  音声特徴量を取得できませんでした:
                  <ul className="list-disc list-inside ml-4 mt-2">
                    {failedTrackIds.map((tid) => (
                      <li key={tid}>{tid}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* トラックリスト */}
              {tracks.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {tracks.map((item) => {
                    const { track, audio_features } = item;
                    return (
                      <li
                        key={track.id}
                        className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden"
                      >
                        {/* アルバム画像 */}
                        <div className="relative w-full h-48">
                          <Image
                            src={track.album?.images[0]?.url || '/placeholder.png'}
                            alt={track.album?.name || 'No Album'}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>

                        {/* トラック情報 */}
                        <div className="p-4">
                          <h2 className="text-lg font-semibold truncate">
                            {track.name || 'No Title'}
                          </h2>
                          <p className="text-sm text-gray-400">
                            {track.artists
                              ?.map((artist) => artist.name)
                              .join(', ') || 'Unknown Artist'}
                          </p>
                          <p className="text-sm text-gray-500 italic truncate">
                            {track.album?.name || 'No Album'}
                          </p>

                          {/* 特徴量の表示 (例: danceability, energy, tempo) */}
                          {audio_features ? (
                            <div className="mt-2 text-sm text-gray-400">
                              <p>Danceability: {audio_features.danceability}</p>
                              <p>Energy: {audio_features.energy}</p>
                              <p>Tempo: {audio_features.tempo}</p>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-red-400">
                              Audio features not available
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-gray-500">
                  No tracks found in this playlist.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Playlists;
