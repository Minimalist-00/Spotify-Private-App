import Image from 'next/image';
import { useEffect, useState } from 'react';

interface SimplifiedPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  trackCount: number;
}

interface SpotifyTrack {
  added_at: string;
  track: {
    id: string;
    name: string;
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  };
}

const Playlists = () => {
  const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const fetchTracks = async (playlistId: string) => {
    setLoading(true);
    try {
      setSelectedPlaylist(playlistId);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks for playlist ${playlistId}`);
      }
      const data = await response.json();
  
      // データが存在しない場合のフォールバックを追加
      const fetchedTracks = data.tracks || [];
      setTracks(fetchedTracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching tracks:', err);
    } finally {
      setLoading(false);
    }
  };
  

  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Your Playlists</h1>
      {loading && <p className="text-center text-gray-500">Loading...</p>}

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
              <p className="text-sm text-gray-500 italic truncate">Tracks: {playlist.trackCount}</p>
            </div>
          </li>
        ))}
      </ul>

      {selectedPlaylist && (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Tracks</h2>
    {loading ? (
      <p className="text-center text-gray-500">Loading tracks...</p>
    ) : tracks.length > 0 ? (
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tracks.map((track) => (
          <li
            key={track.track.id}
            className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* アルバム画像 */}
            <div className="relative w-full h-48">
              <Image
                src={
                  track.track.album?.images[0]?.url || '/placeholder.png'
                }
                alt={track.track.album?.name || 'No Album'}
                layout="fill"
                objectFit="cover"
              />
            </div>

            {/* トラック情報 */}
            <div className="p-4">
              <h2 className="text-lg font-semibold truncate">{track.track.name || 'No Title'}</h2>
              <p className="text-sm text-gray-400">
                {track.track.artists
                  ?.map((artist) => artist.name)
                  .join(', ') || 'Unknown Artist'}
              </p>
              <p className="text-sm text-gray-500 italic truncate">
                {track.track.album?.name || 'No Album'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-center text-gray-500">No tracks found in this playlist.</p>
    )}
  </div>
)}

    </div>
  );
};

export default Playlists;
