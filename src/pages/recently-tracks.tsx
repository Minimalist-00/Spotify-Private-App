import Image from 'next/image';
import { useEffect, useState } from 'react';

interface RecentlyPlayedTrack {
  id: string;
  name: string;
  artists: string;
  album: {
    name: string;
    image: string;
  };
  playedAt: string;
}

export default function RecentlyTracks() {
  const [tracks, setTracks] = useState<RecentlyPlayedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentlyPlayedTracks = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/recently-tracks', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch recently played tracks');
        }
        const data = await response.json();
        setTracks(data.recentlyPlayed || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyPlayedTracks();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Recently Played Tracks</h1>
      {tracks.length === 0 ? (
        <p className="text-center text-gray-500">No recently played tracks found.</p>
      ) : (
        <ul className="space-y-6">
          {tracks.map((track, index) => (
            <li
              key={track.id}
              className="flex items-center bg-gray-800 text-white rounded-lg shadow-lg p-4"
            >
              <span className="text-2xl font-bold mr-4">{index + 1}</span>
              <div className="relative w-16 h-16 mr-4">
                <Image
                  src={track.album.image || '/placeholder.png'}
                  alt={track.album.name}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{track.name}</h2>
                <p className="text-sm text-gray-400">{track.artists}</p>
                <p className="text-sm text-gray-500 italic">{track.album.name}</p>
                <p className="text-sm text-gray-600">
                  Played At: {new Date(track.playedAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
