import { supabase } from '@/utils/supabaseClient';
import { useSession } from 'next-auth/react';
import Head from 'next/head'; // ダークモード拒否用のメタタグ挿入に使用
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

// MUI
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  can_singing?: number | null;         // DB: can_singing = 0~4, null
  song_favorite_level?: number | null; // DB: song_favorite_level = 1~4, null
};

export default function TrackClassificationPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // 全楽曲
  const [tracks, setTracks] = useState<TrackData[]>([]);
  // ローカル変更を記録
  const [updatedTracks, setUpdatedTracks] = useState<Map<string, TrackData>>(new Map());

  // 「保存が完了しました」通知用のステート
  const [saveSuccess, setSaveSuccess] = useState(false);

  // モバイル用のタブ切り替え
  const [mobileTab, setMobileTab] = useState(0);

  // PC用のタブ切り替え
  const [pcTab, setPcTab] = useState(0);

  // DBからユーザーの楽曲一覧を取得
  useEffect(() => {
    if (!userId) return;

    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching tracks:', error);
        return;
      }
      if (data) {
        setTracks(data as TrackData[]);
      }
    };
    fetchTracks();
  }, [userId]);

  // 未分類(= can_singing==null or song_favorite_level==null)
  const unclassifiedTracks = tracks.filter(
    (t) => t.can_singing == null || t.song_favorite_level == null
  );
  // 分類完了
  const completedTracks = tracks.filter(
    (t) => t.can_singing != null && t.song_favorite_level != null
  );

  // ==========================
  // 思い入れ (song_favorite_level: 1~4, null)
  // ==========================
  const handleFavoriteLevelChange = (trackId: string, level: number | null) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const base =
        newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!base) return newMap;
      newMap.set(trackId, { ...base, song_favorite_level: level });
      return newMap;
    });
  };

  // ==========================
  // 歌えないチェック => can_singing=0
  // ==========================
  // const handleCannotSingCheck = (trackId: string, checked: boolean) => {
  //   setUpdatedTracks((prev) => {
  //     const newMap = new Map(prev);
  //     const base =
  //       newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
  //     if (!base) return newMap;
  //
  //     const newVal = checked ? 0 : null; // 0 => 歌えない, null => 未選択
  //     newMap.set(trackId, { ...base, can_singing: newVal });
  //     return newMap;
  //   });
  // };

  // ==========================
  // 歌いやすさ (1~4, null)
  // ==========================
  const handleCanSingingChange = (trackId: string, level: number | null) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const base =
        newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!base) return newMap;
      newMap.set(trackId, { ...base, can_singing: level });
      return newMap;
    });
  };

  // ==========================
  // 分類完了判断 (保存ボタン用のカウント)
  // ==========================
  const updatedCount = Array.from(updatedTracks.values()).filter(
    (t) => t.can_singing != null && t.song_favorite_level != null
  ).length;

  // ==========================
  // 保存ボタン
  // ==========================
  const handleSave = async () => {
    if (updatedTracks.size === 0) return;

    const trackUpdates = Array.from(updatedTracks.values()).map((t) => ({
      spotify_track_id: t.spotify_track_id,
      user_id: t.user_id,
      can_singing: t.can_singing,
      song_favorite_level: t.song_favorite_level,
    }));

    try {
      const res = await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUpdates }),
      });
      if (!res.ok) {
        console.error('Failed to upsert tracks', await res.text());
        return;
      }

      // 成功時 => updatedTracksクリア & DB再取得
      setUpdatedTracks(new Map());
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('Error refetching tracks:', error);
      } else if (data) {
        setTracks(data as TrackData[]);
      }

      // 保存完了を通知
      setSaveSuccess(true);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // ==========================
  // 再分類 (PC / Mobile 共通)
  // ==========================
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [tempCanSinging, setTempCanSinging] = useState<number | null>(null);
  const [tempFavoriteLevel, setTempFavoriteLevel] = useState<number | null>(null);

  const startReclassify = (track: TrackData) => {
    setEditingTrackId(track.spotify_track_id);
    setTempCanSinging(track.can_singing ?? null);
    setTempFavoriteLevel(track.song_favorite_level ?? null);
  };

  const cancelReclassify = () => {
    setEditingTrackId(null);
    setTempCanSinging(null);
    setTempFavoriteLevel(null);
  };

  const saveReclassify = async () => {
    if (!editingTrackId) return;

    const singleUpdate = {
      spotify_track_id: editingTrackId,
      user_id: userId,
      can_singing: tempCanSinging,
      song_favorite_level: tempFavoriteLevel,
    };
    try {
      const res = await fetch('/api/tracks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackUpdates: [singleUpdate] }),
      });
      if (!res.ok) {
        console.error('Failed to upsert track', await res.text());
      } else {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', userId);
        if (!error && data) {
          setTracks(data as TrackData[]);
        }
      }

      // 再分類した曲のlocal stateを消す or 更新
      setUpdatedTracks((prev) => {
        const newMap = new Map(prev);
        newMap.delete(editingTrackId);
        return newMap;
      });

      setSaveSuccess(true);
    } catch (err) {
      console.error('Save error:', err);
    }
    setEditingTrackId(null);
    setTempCanSinging(null);
    setTempFavoriteLevel(null);
  };

  const isEditing = (trackId: string) => editingTrackId === trackId;

  // ==========================
  // Snackbarを閉じるハンドラ
  // ==========================
  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return; // clickawayは閉じない設定も可
    }
    setSaveSuccess(false);
  };

  // ==========================
  // 分類完了タブの検索機能
  // ==========================
  const [searchKeyword, setSearchKeyword] = useState('');
  // 検索キーワードでフィルタした分類完了曲
  const filteredCompletedTracks = completedTracks.filter((track) =>
    track.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // ==========================
  // 未分類タブの表示要素 (共通化)
  // ==========================
  const renderUnclassifiedTracks = (tracksForRender: TrackData[]) => {
    if (tracksForRender.length === 0) {
      return (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            曲は全て分類されました！
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            分類評価に間違いがある場合には<br />
            「分類完了」側で再度評価してください。<br />
            <br />
            ご協力ありがとうございましたm(_ _)m
          </Typography>
        </Paper>
      );
    }

    return tracksForRender.map((track) => {
      const updated = updatedTracks.get(track.spotify_track_id);
      const canSinging = updated?.can_singing ?? track.can_singing;
      const favLevel = updated?.song_favorite_level ?? track.song_favorite_level;

      return (
        <Paper key={track.spotify_track_id} sx={{ p: 2, mb: 2 }}>
          {/* 画像と曲名 */}
          <Box display="flex" gap={2}>
            {track.image_url && (
              <Image
                src={track.image_url}
                alt={track.name || 'No Album'}
                width={50}
                height={50}
                style={{ objectFit: 'cover' }}
              />
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {track.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {track.artist_name}
              </Typography>
            </Box>
          </Box>

          {/* コンパクトなレイアウト: 歌いやすさ, 思い入れ */}
          <Box
            mt={1}
            display="flex"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ flexWrap: 'wrap' }}
          >
            {/* 歌いやすさ (1~4) */}
            <Box display="flex" flexDirection="row" alignItems="center">
              <FormLabel sx={{ minWidth: '5rem', fontSize: 14, mr: 1 }}>歌える自信</FormLabel>
              <RadioGroup
                row
                value={
                  canSinging == null || canSinging === 0 ? '' : String(canSinging)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    handleCanSingingChange(track.spotify_track_id, null);
                  } else {
                    handleCanSingingChange(track.spotify_track_id, Number(val));
                  }
                }}
              >
                {[1, 2, 3, 4].map((num) => (
                  <FormControlLabel
                    key={num}
                    value={String(num)}
                    control={<Radio size="small" />}
                    label={String(num)}
                  />
                ))}
              </RadioGroup>
            </Box>

            {/* 思い入れ (1~4) */}
            <Box display="flex" flexDirection="row" alignItems="center">
              <FormLabel sx={{ minWidth: '4rem', fontSize: 14, mr: 3 }}>
                思い入れ
              </FormLabel>
              <RadioGroup
                row
                value={favLevel == null ? '' : String(favLevel)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    handleFavoriteLevelChange(track.spotify_track_id, null);
                  } else {
                    handleFavoriteLevelChange(track.spotify_track_id, Number(val));
                  }
                }}
              >
                {[1, 2, 3, 4].map((num) => (
                  <FormControlLabel
                    key={num}
                    value={String(num)}
                    control={<Radio size="small" />}
                    label={String(num)}
                  />
                ))}
              </RadioGroup>
            </Box>
          </Box>
        </Paper>
      );
    });
  };

  // ==========================
  // 分類完了タブの表示要素 (共通化)
  // ==========================
  const renderCompletedTracks = (tracksForRender: TrackData[]) => {
    if (tracksForRender.length === 0) {
      return (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            曲が分類されていません。
          </Typography>
        </Paper>
      );
    }

    return tracksForRender.map((track) => {
      const editing = isEditing(track.spotify_track_id);

      if (!editing) {
        return (
          <Paper
            key={track.spotify_track_id}
            sx={{ p: 2, mb: 2, cursor: 'pointer' }}
            onClick={() => startReclassify(track)}
          >
            <Box display="flex" gap={2}>
              {track.image_url && (
                <Image
                  src={track.image_url}
                  alt={track.name || 'No Album'}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover' }}
                />
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {track.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {track.artist_name}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              歌える自信:{' '}
              {track.can_singing === 0 ? '歌えない(×)' : track.can_singing}
              <br />
              思い入れ: {track.song_favorite_level}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (クリックで再分類)
            </Typography>
          </Paper>
        );
      } else {
        // 編集UI
        return (
          <Paper key={track.spotify_track_id} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" gap={2}>
              {track.image_url && (
                <Image
                  src={track.image_url}
                  alt={track.name || 'No Album'}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover' }}
                />
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {track.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {track.artist_name}
                </Typography>
              </Box>
            </Box>

            {/* 再分類UIのコンパクト化 */}
            <Box
              mt={2}
              display="flex"
              flexDirection="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ flexWrap: 'wrap' }}
            >
              {/* 歌いやすさ (1~4) */}
              <Box
                display="flex"
                flexDirection="row"
                alignItems="center"
                sx={{ mr: 2, mb: 1 }}
              >
                <FormLabel sx={{ minWidth: '5rem', fontSize: 14, mr: 1.05 }}>
                  歌える自信
                </FormLabel>
                <RadioGroup
                  row
                  value={
                    tempCanSinging == null || tempCanSinging === 0
                      ? ''
                      : String(tempCanSinging)
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setTempCanSinging(null);
                    } else {
                      setTempCanSinging(Number(val));
                    }
                  }}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <FormControlLabel
                      key={num}
                      value={String(num)}
                      control={<Radio size="small" />}
                      label={String(num)}
                    />
                  ))}
                </RadioGroup>
              </Box>

              {/* 思い入れ (1~4) */}
              <Box
                display="flex"
                flexDirection="row"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <FormLabel sx={{ minWidth: '4rem', fontSize: 14, mr: 3 }}>
                  思い入れ
                </FormLabel>
                <RadioGroup
                  row
                  value={tempFavoriteLevel == null ? '' : String(tempFavoriteLevel)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setTempFavoriteLevel(null);
                    } else {
                      setTempFavoriteLevel(Number(val));
                    }
                  }}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <FormControlLabel
                      key={num}
                      value={String(num)}
                      control={<Radio size="small" />}
                      label={String(num)}
                    />
                  ))}
                </RadioGroup>
              </Box>
            </Box>

            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
              <Button variant="outlined" onClick={cancelReclassify}>
                キャンセル
              </Button>
              <Button variant="contained" onClick={saveReclassify}>
                保存
              </Button>
            </Box>
          </Paper>
        );
      }
    });
  };

  // ==========================
  // UIレンダリング
  // ==========================
  return (
    <>
      {/* ダークモードを拒否するメタタグ */}
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>

      <Box display="flex" flexDirection="column" minHeight="100vh">
        {/* ヘッダー => Spotifyっぽい緑 */}
        <AppBar
          position="static"
          sx={{
            backgroundColor: '#1DB954', // Spotifyのイメージカラー
          }}
        >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              楽曲の分類
            </Typography>
          </Toolbar>
        </AppBar>

        <Container sx={{ flex: 1, py: 2, background: { md: 'linear-gradient(135deg, #f0fdfa 0%, #e0e7ff 100%)' } }}>
          {/* 説明エリア */}
          <Box
            sx={{
              maxWidth: 800,
              mx: 'auto',
              mb: 3,
              px: { xs: 0, md: 2 },
            }}
          >
            <Box
              sx={{
                background: '#fff',
                borderRadius: 4,
                boxShadow: '0 8px 32px 0 rgba(60,60,100,0.18), 0 1.5px 6px 0 rgba(30,30,60,0.10)',
                p: { xs: 2, md: 3 },
                fontSize: { xs: 15, md: 17 },
                color: '#222',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="12" fill="#1DB954" opacity="0.15" />
                  <path d="M12 7v5l4 2" stroke="#1DB954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#1DB954', letterSpacing: 0.5 }}>楽曲分類ガイド</span>
              </Box>
              <div style={{ lineHeight: 1.8 }}>
                このページでは、「<b>歌える自信</b>(1~4)」と「<b>思い入れ</b>(1~4)」を入力します。<br />
                <span style={{ fontWeight: 700, color: '#1DB954' }}>歌える自信</span>は「その曲を歌うとき、どのくらい不安がないか」です。<br />
                1: ほとんど自信がない ～ 4: とても自信がある<br />
                <br />
                <span style={{ fontWeight: 700, color: '#1DB954' }}>思い入れ</span>は「その曲に対する愛着の強さや，過去の経験がどのくらい含まれているか」です。<br />
                1: ほとんど思い入れがない ～ 4: とても思い入れがある<br />
                <br />
                分類をしたら、画面下部の「保存」ボタンを押してください。途中で中断しても大丈夫です。
              </div>
            </Box>
          </Box>

          {/* --- モバイル向けタブレイアウト --- */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                mb: 2,
                justifyContent: 'center',
              }}
            >
              <Button
                variant={mobileTab === 0 ? 'contained' : 'outlined'}
                onClick={() => setMobileTab(0)}
                sx={{
                  backgroundColor: mobileTab === 0 ? '#1DB954' : undefined,
                  color: mobileTab === 0 ? '#fff' : '#1DB954',
                  borderColor: '#1DB954',
                  fontWeight: 700,
                  px: 3,
                  boxShadow: mobileTab === 0 ? 2 : undefined,
                  '&:hover': {
                    backgroundColor: '#169e45',
                    color: '#fff',
                  },
                }}
              >
                未分類 ({unclassifiedTracks.length}曲)
              </Button>
              <Button
                variant={mobileTab === 1 ? 'contained' : 'outlined'}
                onClick={() => setMobileTab(1)}
                sx={{
                  backgroundColor: mobileTab === 1 ? '#1DB954' : undefined,
                  color: mobileTab === 1 ? '#fff' : '#1DB954',
                  borderColor: '#1DB954',
                  fontWeight: 700,
                  px: 3,
                  boxShadow: mobileTab === 1 ? 2 : undefined,
                  '&:hover': {
                    backgroundColor: '#169e45',
                    color: '#fff',
                  },
                }}
              >
                分類完了 ({completedTracks.length}曲)
              </Button>
            </Box>
            {/* --- 未分類 --- */}
            {mobileTab === 0 && (
              <Box sx={{ mt: 2 }}>
                {renderUnclassifiedTracks(unclassifiedTracks)}
              </Box>
            )}
            {/* --- 分類完了 --- */}
            {mobileTab === 1 && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  label="曲名で検索"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  sx={{ mb: 2 }}
                />
                {renderCompletedTracks(filteredCompletedTracks)}
              </Box>
            )}
          </Box>

          {/* --- PC向けタブレイアウト --- */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box
              sx={{
                maxWidth: 800,
                mx: 'auto',
                mt: 3,
                mb: 3,
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 3,
                boxShadow: 4,
                p: 4,
                border: '1px solid #e0e7ff',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  mb: 3,
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant={pcTab === 0 ? 'contained' : 'outlined'}
                  onClick={() => setPcTab(0)}
                  sx={{
                    backgroundColor: pcTab === 0 ? '#1DB954' : undefined,
                    color: pcTab === 0 ? '#fff' : '#1DB954',
                    borderColor: '#1DB954',
                    fontWeight: 700,
                    px: 4,
                    boxShadow: pcTab === 0 ? 2 : undefined,
                    '&:hover': {
                      backgroundColor: '#169e45',
                      color: '#fff',
                    },
                  }}
                >
                  未分類 ({unclassifiedTracks.length}曲)
                </Button>
                <Button
                  variant={pcTab === 1 ? 'contained' : 'outlined'}
                  onClick={() => setPcTab(1)}
                  sx={{
                    backgroundColor: pcTab === 1 ? '#1DB954' : undefined,
                    color: pcTab === 1 ? '#fff' : '#1DB954',
                    borderColor: '#1DB954',
                    fontWeight: 700,
                    px: 4,
                    boxShadow: pcTab === 1 ? 2 : undefined,
                    '&:hover': {
                      backgroundColor: '#169e45',
                      color: '#fff',
                    },
                  }}
                >
                  分類完了 ({completedTracks.length}曲)
                </Button>
              </Box>
              {/* --- PC: 未分類 --- */}
              {pcTab === 0 && (
                <Box sx={{ mt: 3 }}>
                  {renderUnclassifiedTracks(unclassifiedTracks)}
                </Box>
              )}
              {/* --- PC: 分類完了 --- */}
              {pcTab === 1 && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ maxWidth: 400, mb: 2 }}>
                    <TextField
                      label="曲名で検索"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </Box>
                  {renderCompletedTracks(filteredCompletedTracks)}
                </Box>
              )}
            </Box>
          </Box>
        </Container>

        {/* フッター => 未分類タブ時のみ保存ボタンが意味を持つが、PC/Mobileともに共通で表示 */}
        {(mobileTab === 0 || pcTab === 0) && (
          <Paper
            sx={{
              position: 'sticky',
              bottom: 0,
              py: 2,
              textAlign: 'center',
            }}
            elevation={3}
          >
            <Typography variant="body2" sx={{ mb: 1 }}>
              現在 {updatedCount} 曲入力されています
            </Typography>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{
                backgroundColor: '#1DB954',
                ':hover': { backgroundColor: '#169e45' },
              }}
            >
              保存
            </Button>
          </Paper>
        )}

        {/* Snackbar：保存が完了したら表示 */}
        <Snackbar
          open={saveSuccess}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity="success"
            sx={{ width: '100%' }}
            elevation={6}
            variant="filled"
          >
            保存が完了しました！
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
