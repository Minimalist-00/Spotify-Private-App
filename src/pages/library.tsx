// src/components/Library.tsx (or pages/library.tsx)

import Image from 'next/image';
import { useEffect, useState } from 'react';

const Library = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        // credentials: 'include' はクッキー送信を有効化
        // NextAuthのセッションクッキーが送られる
        const response = await fetch('/api/library', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch library');
        }
        const data = await response.json();
        setTracks(data.items);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error occurred');
        }
      }
    };

    fetchLibrary();
  }, []);

  if (error) {
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-4">
        Your Spotify Library
      </h1>
      <p className="text-center text-gray-500 mb-8">
        Total Tracks: <span className="font-semibold">{tracks.length}</span>
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tracks.map((track) => (
          <li
            key={track.id}
            className="bg-gray-800 text-white rounded-lg shadow-lg overflow-hidden"
          >
            <div className="relative w-full h-48">
              <Image
                src={track.album.images[0]?.url || '/placeholder.png'}
                alt={track.album.name}
                layout="fill"
                objectFit="cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-semibold truncate">{track.name}</h2>
              <p className="text-sm text-gray-400">
                {track.artists.map((artist) => artist.name).join(', ')}
              </p>
              <p className="text-sm text-gray-500 italic truncate">
                {track.album.name}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Library;
