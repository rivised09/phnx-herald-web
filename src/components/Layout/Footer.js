export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-neutral-950 py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-500 sm:flex-row sm:px-6">
        <p className="inline-flex items-center gap-1.5">
          <span className="text-gray-400">▰</span>
          Phoenix Herald — server / 973
        </p>
        <p className="inline-flex items-center gap-1.5">
          <span>Developed by</span>
          <span className="font-semibold text-gray-400">福riv</span>
        </p>
      </div>
    </footer>
  );
}