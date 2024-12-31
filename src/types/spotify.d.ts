// Spotifyトークンレスポンスの型定義
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/** プレイリスト情報の型 */
interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
}

/** サーバーから返るトラック & 特徴量 */
interface Track {
  added_at?: string;
  track: {
    id: string;
    is_local?: boolean;
    type?: string;
    name: string;
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  };
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  audio_features?: {
    id: string;
    danceability: number;
    energy: number;
    tempo: number;
  } | null;
}

/** サーバーのレスポンス型 */
interface TracksResponse {
  items: Track[];
  failedTrackIds?: string[];
  total: number;
  next: string | null;
}

interface PlaylistsResponse {
  items: Playlist[];
  next: string | null;
}

interface AudioFeature {
  id: string;
  danceability: number;
  energy: number;
  tempo: number;
}

// 再生履歴のデータ型定義
interface RecentlyPlayedTrack {
  id: string;
  name: string;
  artists: string;
  album: {
    name: string;
    image: string;
  };
  playedAt: string;
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
  };
  played_at: string;
}

interface SpotifyRecentlyPlayedResponse {
  items: RecentlyPlayedTrack[];
}

// トップトラックのデータ型定義
interface TopTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  popularity: number;
}

interface SpotifyTopTracksResponse {
  items: TopTrack[];
}