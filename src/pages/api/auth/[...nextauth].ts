import NextAuth, { NextAuthOptions } from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';
import { MyToken } from '@/types/next-auth';
import { supabase } from '@/utils/supabaseClient';
import { fetchSpotifySavedTracks } from '@/lib/spotify';      // Step1 で作成
import { saveTracksToSupabase } from '@/lib/supabase';        // Step2 で作成

const scopes = [
  'user-top-read',
  'user-read-private',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-recently-played',
  'user-read-email',
  'streaming',                 // フル再生に必要
  'user-read-playback-state',  // 再生状態の取得に必要
  'user-modify-playback-state' // 再生制御に必要
].join(' ');

async function fetchSpotifyProfile(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch Spotify user profile');
  }
  return response.json();
}

async function saveUserToSupabase(user: {
  spotify_user_id: string;
  display_name: string | null;
  email: string | null;
  image_url: string | null;
  additional_info?: object;
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          spotify_user_id: user.spotify_user_id,
          display_name: user.display_name,
          email: user.email,
          image_url: user.image_url,
          additional_info: user.additional_info,
        },
        { onConflict: 'spotify_user_id' } // 重複時に更新
      );

    if (error) {
      throw new Error(`Error saving user to Supabase: ${error.message}`);
    }

    return data;
  } catch (err) {
    console.error(err);
  }
}

async function refreshAccessToken(token: MyToken): Promise<MyToken> {
  try {
    const url = 'https://accounts.spotify.com/api/token';
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken ?? '',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    const refreshedTokens = await response.json();

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    };
  } catch (error) {
    console.error('Error refreshing Spotify token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        url: 'https://accounts.spotify.com/authorize',
        params: { scope: scopes, show_dialog: true },
      },
    }),
  ],
  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;

        try {
          const me = await fetchSpotifyProfile(account.access_token!);
          token.user = {
            id: me.id,
            name: me.display_name,
            email: me.email,
            image: me.images?.[0]?.url,
            country: me.country,
          };

          // Supabaseにデータを保存
          await saveUserToSupabase({
            spotify_user_id: me.id,
            display_name: me.display_name,
            email: me.email,
            image_url: me.images?.[0]?.url,
            additional_info: { country: me.country },
          });

          // ★★ 4) Spotifyのお気に入り曲を全件取得し、tracks テーブルに保存する部分 ★★
          const savedTracks = await fetchSpotifySavedTracks(account.access_token!);

          // tracksテーブルに入れる形式に整形。
          // user_id はここでは "SpotifyのユーザーID" をキーにする
          const tracksToSave = savedTracks.map((track) => ({
            spotify_track_id: track.id,
            user_id: me.id, // ここはアプリで一意に管理するIDに合わせる
            name: track.name,
            artist_name: track.artists?.[0]?.name ?? '',
            album_name: track.album?.name ?? '',
            image_url: track.album?.images?.[0]?.url ?? '',
            popularity: track.popularity,
            song_favorite_level: null,
            can_singing: null,
          }));

          // Supabaseに upsert
          await saveTracksToSupabase(tracksToSave);
        } catch (err) {
          console.error('Failed to fetch user profile or save to Supabase:', err);
        }

        return token;
      }

      if (Date.now() < (token as MyToken).accessTokenExpires!) {
        return token;
      }

      return await refreshAccessToken(token as MyToken);
    },

    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as typeof session.user;
      }
      session.accessToken = (token as MyToken).accessToken;
      session.error = (token as MyToken).error;
      return session;
    },
  },
};

export default NextAuth(authOptions);
