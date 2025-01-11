import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';

// MUI
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Alert,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  Paper,
  Card,
  CardMedia,
  CardContent,
  useMediaQuery,
  useTheme,
  Snackbar,              // 追加
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

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

  // レスポンシブ判定 (md以上かどうか)
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // 全楽曲
  const [tracks, setTracks] = useState<TrackData[]>([]);
  // ローカル変更を記録
  const [updatedTracks, setUpdatedTracks] = useState<Map<string, TrackData>>(new Map());

  // ==========================
  // 「保存が完了しました」通知用のステート
  // ==========================
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ==========================
  // DBからユーザーの楽曲一覧を取得
  // ==========================
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

  // ==========================
  // 思い入れ (song_favorite_level: 1~4, null)
  // ==========================
  const handleFavoriteLevelChange = (trackId: string, level: number | null) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const base = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!base) return newMap;
      newMap.set(trackId, { ...base, song_favorite_level: level });
      return newMap;
    });
  };

  // ==========================
  // 歌えないチェック => can_singing=0
  // ==========================
  const handleCannotSingCheck = (trackId: string, checked: boolean) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const base = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!base) return newMap;

      const newVal = checked ? 0 : null; // 0 => 歌えない, null => 未選択
      newMap.set(trackId, { ...base, can_singing: newVal });
      return newMap;
    });
  };

  // ==========================
  // 歌いやすさ (1~4, null)
  // ==========================
  const handleCanSingingChange = (trackId: string, level: number | null) => {
    setUpdatedTracks((prev) => {
      const newMap = new Map(prev);
      const base = newMap.get(trackId) || tracks.find((t) => t.spotify_track_id === trackId);
      if (!base) return newMap;
      newMap.set(trackId, { ...base, can_singing: level });
      return newMap;
    });
  };

  // ==========================
  // 分類完了判断
  // ==========================
  const updatedCount = Array.from(updatedTracks.values()).filter(
    (t) => t.can_singing != null && t.song_favorite_level != null
  ).length;

  const completedTracks = tracks.filter(
    (t) => t.can_singing != null && t.song_favorite_level != null
  );

  // ==========================
  // 保存ボタン
  // ==========================
  const handleSave = async () => {
    if (updatedTracks.size === 0) return;

    const trackUpdates = Array.from(updatedTracks.values()).map((t) => ({
      spotify_track_id: t.spotify_track_id,
      user_id: t.user_id,
      can_singing: t.can_singing,
      song_favorite_level: t.song_favorite_level
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

      // ★ 保存完了したら「保存完了」を通知表示
      setSaveSuccess(true);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  // ==========================
  // モバイル用のタブ切り替え
  // ==========================
  const [mobileTab, setMobileTab] = useState(0);
  const handleChangeMobileTab = (event: React.SyntheticEvent, newValue: number) => {
    setMobileTab(newValue);
  };

  // 未分類の曲
  const unclassifiedTracks = tracks.filter(
    (t) => t.can_singing == null || t.song_favorite_level == null
  );

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
      song_favorite_level: tempFavoriteLevel
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

      // 分類変更後、updatedTracksの該当エントリを削除（または上書き）する
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
    // ユーザが画面タップなどで明示的に閉じようとしたとき
    if (reason === 'clickaway') {
      return; // クリックアウェイは閉じない設定も可能
    }
    setSaveSuccess(false);
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      {/* ヘッダー */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            曲の分類
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ flex: 1, py: 2 }}>
        {/* 説明エリア */}
        <Alert severity="info" sx={{ mb: 3 }}>
          このページでは、「歌いやすさ(0~4)」と「思い入れ(1~4)」を入力します。<br />
          0 は「歌えない」(チェックボックス)、1～4 は「歌える度合い」(ラジオボタン)、<br />
          思い入れは 1～4 段階 です。<br />
          分類完了した曲でもタップ/クリックで再分類ができます。
        </Alert>

        {/* モバイル向けタブレイアウト */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <Tabs
            value={mobileTab}
            onChange={handleChangeMobileTab}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={`未分類 (${unclassifiedTracks.length}曲)`} />
            <Tab label={`分類完了 (${completedTracks.length}曲)`} />
          </Tabs>

          {/* 未分類タブ */}
          {mobileTab === 0 && (
            <Box sx={{ mt: 2 }}>
              {unclassifiedTracks.map((track) => {
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

                    {/* 歌えない(checkbox) */}
                    <Box mt={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            icon={<CheckBoxOutlineBlankIcon />}
                            checkedIcon={<CloseIcon />}
                            checked={canSinging === 0}
                            onChange={(e) =>
                              handleCannotSingCheck(track.spotify_track_id, e.target.checked)
                            }
                          />
                        }
                        label="歌えない"
                      />
                    </Box>

                    {/* 歌いやすさ ラジオ */}
                    <Box mt={1}>
                      <FormControl>
                        <FormLabel>歌いやすさ (1~4)</FormLabel>
                        <RadioGroup
                          row
                          value={
                            canSinging == null || canSinging === 0
                              ? ''
                              : String(canSinging)
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
                              control={<Radio />}
                              label={String(num)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Box>

                    {/* 思い入れ ラジオ */}
                    <Box mt={1}>
                      <FormControl>
                        <FormLabel>思い入れ (1~4)</FormLabel>
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
                              control={<Radio />}
                              label={String(num)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}

          {/* 分類完了タブ */}
          {mobileTab === 1 && (
            <Box sx={{ mt: 2 }}>
              {completedTracks.map((track) => {
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
                        歌いやすさ: {track.can_singing === 0 ? '歌えない(×)' : track.can_singing}
                        <br />
                        思い入れ: {track.song_favorite_level}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (タップで再分類)
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

                      <Box mt={2}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              icon={<CheckBoxOutlineBlankIcon />}
                              checkedIcon={<CloseIcon />}
                              checked={tempCanSinging === 0}
                              onChange={(e) =>
                                setTempCanSinging(e.target.checked ? 0 : null)
                              }
                            />
                          }
                          label="歌えない"
                        />

                        <Box mt={2}>
                          <FormLabel>歌いやすさ (1~4)</FormLabel>
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
                                control={<Radio />}
                                label={String(num)}
                              />
                            ))}
                          </RadioGroup>
                        </Box>

                        <Box mt={2}>
                          <FormLabel>思い入れ (1~4)</FormLabel>
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
                                control={<Radio />}
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
              })}
            </Box>
          )}
        </Box>

        {/* PC Layout */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            曲一覧 (PC Layout)
          </Typography>

          {/* テーブル表示 */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">画像</TableCell>
                  <TableCell>曲名</TableCell>
                  <TableCell>アーティスト</TableCell>
                  <TableCell align="center">歌えない</TableCell>
                  <TableCell>歌いやすさ</TableCell>
                  <TableCell>思い入れ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tracks.map((track) => {
                  const updated = updatedTracks.get(track.spotify_track_id);
                  const canSinging = updated?.can_singing ?? track.can_singing;
                  const favLevel = updated?.song_favorite_level ?? track.song_favorite_level;

                  return (
                    <TableRow key={track.spotify_track_id}>
                      <TableCell align="center">
                        {track.image_url && (
                          <Image
                            src={track.image_url}
                            alt={track.name || 'No Album'}
                            width={64}
                            height={64}
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{track.name}</TableCell>
                      <TableCell>{track.artist_name}</TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Checkbox
                              icon={<CheckBoxOutlineBlankIcon />}
                              checkedIcon={<CloseIcon />}
                              checked={canSinging === 0}
                              onChange={(e) =>
                                handleCannotSingCheck(track.spotify_track_id, e.target.checked)
                              }
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl>
                          <FormLabel>歌いやすさ</FormLabel>
                          <RadioGroup
                            row
                            value={
                              canSinging == null || canSinging === 0
                                ? ''
                                : String(canSinging)
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
                                control={<Radio />}
                                label={String(num)}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl>
                          <FormLabel>思い入れ</FormLabel>
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
                                control={<Radio />}
                                label={String(num)}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 分類完了曲 (再分類) */}
          <Box mt={4}>
            <Typography variant="subtitle1" fontWeight="bold">
              分類完了曲: {completedTracks.length} 曲
            </Typography>
            <Box
              mt={2}
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
              gap={2}
            >
              {completedTracks.map((track) => {
                const editing = isEditing(track.spotify_track_id);

                if (!editing) {
                  return (
                    <Card
                      key={track.spotify_track_id}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => startReclassify(track)}
                    >
                      {track.image_url && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={track.image_url}
                          alt={track.name || 'No Album'}
                        />
                      )}
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {track.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {track.artist_name}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          歌いやすさ:{' '}
                          {track.can_singing === 0 ? '歌えない(×)' : track.can_singing}
                          <br />
                          思い入れ: {track.song_favorite_level}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          (クリックで再分類)
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                } else {
                  // 編集UI
                  return (
                    <Card key={track.spotify_track_id}>
                      {track.image_url && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={track.image_url}
                          alt={track.name || 'No Album'}
                        />
                      )}
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {track.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {track.artist_name}
                        </Typography>

                        <Box mt={2}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                icon={<CheckBoxOutlineBlankIcon />}
                                checkedIcon={<CloseIcon />}
                                checked={tempCanSinging === 0}
                                onChange={(e) =>
                                  setTempCanSinging(e.target.checked ? 0 : null)
                                }
                              />
                            }
                            label="歌えない"
                          />
                        </Box>

                        <Box mt={2}>
                          <FormLabel>歌いやすさ (1~4)</FormLabel>
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
                                control={<Radio />}
                                label={String(num)}
                              />
                            ))}
                          </RadioGroup>
                        </Box>

                        <Box mt={2}>
                          <FormLabel>思い入れ (1~4)</FormLabel>
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
                                control={<Radio />}
                                label={String(num)}
                              />
                            ))}
                          </RadioGroup>
                        </Box>

                        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
                          <Button variant="outlined" onClick={cancelReclassify}>
                            キャンセル
                          </Button>
                          <Button variant="contained" onClick={saveReclassify}>
                            保存
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* フッター (未分類タブまたはPCレイアウト時のみ表示) */}
      {(mobileTab === 0 || isDesktop) && (
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
          <Button variant="contained" color="primary" onClick={handleSave}>
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
  );
}
