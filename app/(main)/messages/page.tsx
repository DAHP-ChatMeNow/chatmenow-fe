export default function MessagesRootPage() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3 bg-white dark:bg-slate-900">
      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
         <span className="text-3xl text-slate-300 dark:text-slate-600">✉️</span>
      </div>
      <div className="text-center space-y-1">
          <p className="text-base font-semibold text-slate-900 dark:text-white">Chưa chọn cuộc hội thoại</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto">
            Chọn một người bạn từ danh sách bên trái để bắt đầu trò chuyện ngay.
          </p>
      </div>
    </div>
  );
}