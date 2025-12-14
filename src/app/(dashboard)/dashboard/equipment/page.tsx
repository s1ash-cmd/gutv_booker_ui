export default function Home() {
  return (
    <main className="p-6">
      <div className="flex justify-center">
        <div className="w-full max-w-xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-purple-500/5 border border-border/50 rounded-xl p-8">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="relative text-center">
              <h1 className="text-3xl font-bold mb-2">
                Оборудование
              </h1>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
