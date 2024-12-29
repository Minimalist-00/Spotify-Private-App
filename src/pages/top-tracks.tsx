import { useEffect, useState } from 'react';
import Image from 'next/image';

interface TopTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  popularity: number;
}

const TopTracks = () => {
  const [tracks, setTracks] = useState<TopTrack[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopTracks = async () => {
      try {
        const response = await fetch('/api/top-tracks', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch top tracks');
        }
        const data = await response.json();
        setTracks(data.topTracks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    fetchTopTracks();
  }, []);

  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Top Tracks - Last 4 Weeks</h1>
      <ul className="space-y-6">
        {tracks.map((track, index) => (
          <li key={track.id} className="flex items-center bg-gray-800 text-white rounded-lg shadow-lg p-4">
            <span className="text-2xl font-bold mr-4">{index + 1}</span>
            <div className="relative w-16 h-16 mr-4">
              <Image
                src={track.album.images[0]?.url || '/placeholder.png'}
                alt={track.album.name}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{track.name}</h2>
              <p className="text-sm text-gray-400">
                {track.artists.map((artist) => artist.name).join(', ')}
              </p>
              <p className="text-sm text-gray-500 italic">{track.album.name}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopTracks;
