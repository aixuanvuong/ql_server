import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Nếu đang mở dưới dạng App độc lập (đã cài đặt), ẩn nút đi
  if (isInstalled) {
    return (
      <div
        title="Đang chạy ở chế độ Ứng dụng PWA Độc Lập"
        className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA App</span>
      </div>
    );
  }

  // Luồng cài đặt nhanh cho Chrome / Edge / Cốc Cốc / Android / Desktop
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          setInstalling(true);
          try {
            await install();
          } finally {
            setInstalling(false);
          }
        }}
        disabled={installing}
        title="Cài đặt ứng dụng Quản Lý Server về màn hình chính của thiết bị"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all transform active:scale-95 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="font-semibold">Cài Đặt App</span>
      </button>
    );
  }

  // Luồng hướng dẫn dành cho Safari trên iPhone / iPad
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Xem hướng dẫn cài đặt ứng dụng lên màn hình iPhone/iPad"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cài trên iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Cài đặt trên iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Bước 1: Bấm nút Chia sẻ (Share)</strong>
                    Trên thanh công cụ Safari (nằm ở dưới cùng hoặc trên cùng màn hình).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Bước 2: Chọn "Thêm vào MH chính"</strong>
                    Cuộn xuống danh sách tính năng và chạm vào <em>"Add to Home Screen"</em>.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                Đã hiểu, đóng hướng dẫn
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback: Khi trình duyệt chưa kích hoạt BeforeInstallPrompt (ví dụ máy tính Firefox hoặc đã có thể cài qua thanh địa chỉ)
  return (
    <button
      onClick={() => {
        alert(
          'Để cài đặt Web App:\n• Trên Chrome/Edge: Bấm biểu tượng Cài đặt (Install) ở góc phải thanh địa chỉ (URL).\n• Trên điện thoại: Mở menu (⋮) và chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính".'
        );
      }}
      title="Hướng dẫn cài đặt ứng dụng Web App"
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer"
    >
      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
      <span>Cài Web App</span>
    </button>
  );
};
