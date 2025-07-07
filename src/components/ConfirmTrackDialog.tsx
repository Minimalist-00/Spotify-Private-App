import React from 'react';

interface TrackInfo {
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
}

interface ConfirmTrackDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  track: TrackInfo | null;
}

const ConfirmTrackDialog: React.FC<ConfirmTrackDialogProps> = ({ open, onClose, onConfirm, track }) => {
  if (!open || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-center">カラオケに楽曲は入っていますか？</h2>
        <div className="flex flex-col items-center mb-4">
          {track.image_url && (
            <img src={track.image_url} alt={track.name} className="w-24 h-24 rounded mb-2 object-cover" />
          )}
          <div className="text-lg font-semibold">{track.name}</div>
          {track.artist_name && <div className="text-gray-600">{track.artist_name}</div>}
          {track.album_name && <div className="text-gray-400 text-sm">{track.album_name}</div>}
        </div>
        <div className="flex flex-col gap-3 mt-4">
          <button
            className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 font-bold text-lg"
            onClick={onConfirm}
          >
            はい
          </button>
          <button
            className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={onClose}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTrackDialog; 