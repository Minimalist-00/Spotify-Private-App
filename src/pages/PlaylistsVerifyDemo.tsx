import { useState } from 'react';

interface AudioFeature {
  id: string;
  danceability: number;
  energy: number;
  tempo: number;
}

export default function AudioFeatureCheck() {
  const [trackId, setTrackId] = useState<string>('');
  const [audioFeature, setAudioFeature] = useState<AudioFeature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleCheckAudioFeatures = async () => {
    setError(null);
    setAudioFeature(null);

    if (!trackId) {
      setError('Please enter a track ID.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/audio-features/${trackId}`);
      if (!res.ok) {
        // エラー時
        const errData = await res.json();
        setError(`Error: ${errData?.error || 'Unknown error'}`);
      } else {
        // 成功時
        const data: AudioFeature = await res.json();
        setAudioFeature(data);
      }
    } catch (err) {
      // fetch自体が失敗 (ネットワーク問題など)
      setError(err instanceof Error ? err.message : 'Unknown fetch error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 20 }}>
      <h1>Spotify Audio Feature Check</h1>
      <p>Enter a Spotify track ID to check if audio features can be retrieved.</p>

      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          placeholder="e.g. 3QPTYCheF9NGz6bxqaXMNl"
          style={{ marginRight: 8, width: 300 }}
        />
        <button onClick={handleCheckAudioFeatures}>Check</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {audioFeature && (
        <div style={{ marginTop: 16 }}>
          <h2>Audio Feature for Track: {audioFeature.id}</h2>
          <ul>
            <li>Danceability: {audioFeature.danceability}</li>
            <li>Energy: {audioFeature.energy}</li>
            <li>Tempo: {audioFeature.tempo}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
