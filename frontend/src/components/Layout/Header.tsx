import { Clapperboard } from "lucide-react";

export const Header: React.FC = () => (
  <header className="border-b border-white/6">
    <div className="mx-auto flex h-16 max-w-2xl items-center px-5">
      <span className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-linear-to-br from-brand-500 to-accent-400 text-white">
          <Clapperboard className="size-4" />
        </span>
        <span className="text-[15px] font-bold tracking-tight text-white">
          Reel
        </span>
      </span>
    </div>
  </header>
);
