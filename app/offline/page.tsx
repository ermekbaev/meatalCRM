export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold mb-2">Нет подключения</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Проверьте интернет-соединение. Страница автоматически загрузится, когда сеть появится.
        </p>
      </div>
    </div>
  );
}
