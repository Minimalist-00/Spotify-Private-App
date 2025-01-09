// 例: src/lib/spotify.ts などに置く

import axios from 'axios';

type SpotifyTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  // 必要に応じてフィールド追加
};

type LibraryTracksResponse = {
  items: { track: SpotifyTrack }[];
  total: number;
};

export async function fetchSpotifySavedTracks(accessToken: string) {
  const allTracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 50; // Spotify APIでは一度に取得できる上限
  let total = 0;

  do {
    const response = await axios.get<LibraryTracksResponse>(
      'https://api.spotify.com/v1/me/tracks',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit, offset },
      }
    );
    const data = response.data;

    // data.items は { track: SpotifyTrack }[] の配列
    allTracks.push(...data.items.map((item) => item.track));
    total = data.total;
    offset += limit;
  } while (offset < total);

  return allTracks;
}
