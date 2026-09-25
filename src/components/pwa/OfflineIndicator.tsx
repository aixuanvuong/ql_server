import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 text-amber-950 px-3.5 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md border border-amber-300 animate-in slide-in-from-bottom duration-300">
      <WifiOff className="w-4 h-4 text-amber-950 animate-pulse" />
      <span>Đang chạy chế độ Ngoại Tuyến (Offline PWA)</span>
    </div>
  );
};
