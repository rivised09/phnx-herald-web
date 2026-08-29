import { Flame } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-black/40 bg-discord-bg-darker/60 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-discord-muted sm:flex-row sm:px-6">
        <p className="inline-flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-phoenix-500" />
          Phoenix Herald — We rise from the ashes.
        </p>
        <p className="inline-flex items-center gap-1.5">
          <span>Developed by:</span>
          <span className="font-semibold text-red-500">福riv</span>
        </p>
      </div>
    </footer>
  );
}