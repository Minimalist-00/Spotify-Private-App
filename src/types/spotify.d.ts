// Spotifyトークンレスポンスの型定義
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

// --- 型定義: 必要に応じてカスタマイズ ---
interface Playlist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  owner: {
    display_name: string;
  };
  tracks: {
    total: number;
  };
}

interface Track {
  id: string;
  name: string;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ name: string }>;
}

interface PlaylistTrack {
  track: {
    id: string;
    name: string;
    album?: {
      name?: string;
      images?: Array<{ url: string }>;
    };
    artists?: Array<{ name: string }>;
  };
}

interface PlaylistTrackItem {
  track: {
    id: string;
    name: string;
    is_local?: boolean;
    type?: string;  // 例: 'track' / 'episode' / 'local'
  };
}

interface PlaylistsResponse {
  items: Playlist[];
  next: string | null;
}

interface TracksResponse {
  items: PlaylistTrackItem[];
  next: string | null;
}

interface LibraryTracksResponse {
  items: Array<{ track: Track }>;
  total: number;
}

interface FetchPlaylistsResponse {
  playlists: Playlist[];
}

interface FetchTracksResponse {
  tracks: PlaylistTrack[];
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
  items: Array< { TopTrack } >;
}
