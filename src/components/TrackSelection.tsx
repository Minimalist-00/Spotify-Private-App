import PageTimer from '@/components/pageTimer';
import Image from 'next/image';
import { useState } from 'react';

type TrackData = {
  spotify_track_id: string;
  user_id: string;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  can_singing?: number | null;
  song_favorite_level?: number | null;
  self_disclosure_level?: number;
};

interface TrackSelectionProps {
  tracks: TrackData[];
  selectedTrack: string;
  onTrackSelect: (trackId: string) => void;
  onConfirm: () => void;
  phaseNumber: number;
  showSearch?: boolean;
  layout?: 'grid' | 'list';
  title?: string;
}

// 文字列が長い場合にフォントサイズをさらに落とすための簡易ユーティリティ関数
function getTextSizeClass(str: string) {
  if (str.length > 30) {
    return 'text-xs';
  }
  return 'text-sm';
}

export default function TrackSelection({
  tracks,
  selectedTrack,
  onTrackSelect,
  onConfirm,
  phaseNumber,
  showSearch = false,
  layout = 'grid',
  title = "以下の楽曲から1つ選んでください。"
}: TrackSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // 楽曲リストをフィルタリング (検索)
  const filteredTracks = tracks.filter(track =>
    track.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col w-screen h-[100dvh] bg-gray-100">
      {/* タイマー */}
      <div className="absolute top-4 left-4 px-4 py-2 z-10">
        <PageTimer />
      </div>

      {/* メインコンテンツ部分をスクロール領域とし、p-6 で余白 */}
      <div className="flex-grow overflow-auto p-6 pb-24">
        <h1 className="text-3xl font-bold mb-4 text-center">
          {phaseNumber} フェーズ目です
        </h1>
        <p className="mb-6 text-center text-lg">
          {title}
        </p>

        {/* 検索入力欄 */}
        {showSearch && (
          <div className="mb-4 flex justify-center">
            <input
              className="border border-gray-300 rounded-md p-2 w-64"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="楽曲名で検索"
            />
          </div>
        )}

        {filteredTracks.length === 0 ? (
          <p className="text-center text-xl">
            {showSearch ? "該当する楽曲がありません。" : "楽曲がありません。"}
          </p>
        ) : (
          <div className={layout === 'grid' ? "grid grid-cols-2 md:grid-cols-4 gap-2" : "grid grid-cols-2 gap-4"}>
            {filteredTracks.map((track) => {
              const isSelected = selectedTrack === track.spotify_track_id;
              const borderColor = isSelected
                ? (layout === 'grid' ? 'border-blue-500' : 'border-green-500')
                : 'border-gray-300';
              const selectionColor = layout === 'grid' ? 'text-blue-500' : 'text-green-500';

              return (
                <div
                  key={track.spotify_track_id}
                  className={`relative flex ${layout === 'grid' ? 'items-center' : 'flex-col items-start'} border rounded-md p-2 shadow-sm cursor-pointer transition-transform hover:scale-105 ${borderColor}`}
                  onClick={() => onTrackSelect(track.spotify_track_id)}
                >
                  {track.image_url && (
                    <Image
                      src={track.image_url}
                      alt={track.name}
                      width={layout === 'grid' ? 50 : 100}
                      height={layout === 'grid' ? 50 : 100}
                      className="object-cover rounded-md"
                    />
                  )}

                  <div className={layout === 'grid' ? "ml-2 w-3/4" : "mt-2"}>
                    <h2
                      className={`${layout === 'grid' ? getTextSizeClass(track.name) : 'font-semibold text-lg'} font-semibold w-full truncate`}
                    >
                      {track.name}
                    </h2>
                    <p className={`${layout === 'grid' ? 'text-xs' : 'text-sm'} text-gray-600 truncate`}>
                      {track.album_name}
                    </p>
                    <p className={`${layout === 'grid' ? 'text-xs' : 'text-sm'} text-gray-500 truncate`}>
                      {track.artist_name}
                    </p>
                  </div>

                  {isSelected && (
                    <span className={`absolute top-1 right-1 ${selectionColor} font-semibold ${layout === 'grid' ? 'text-xs' : 'text-sm'}`}>
                      選択中
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 画面下部に固定のボタン */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gray-100">
        <button
          onClick={onConfirm}
          className="w-full py-4 bg-blue-600 text-white text-xl rounded-lg hover:bg-blue-700"
          disabled={!selectedTrack}
        >
          曲を決定する
        </button>
      </div>
    </div>
  );
} 