import { Lock } from 'lucide-react';

export const metadata = {
  title: 'Unauthorized Access — Phoenix Herald',
};

export default function UnauthorizedPage() {
  return (
    <div className="halftone flex min-h-[55vh] flex-col items-center justify-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gray-800">
        <Lock className="h-6 w-6 text-gray-500" />
      </div>
      <p className="mt-5 font-mono text-xl font-medium uppercase tracking-[0.3em] text-neutral-200">
        Access Denied
      </p>
      <p className="mt-2 text-sm text-gray-500">
        This page is restricted to Phoenix of War commanders.
      </p>
    </div>
  );
}