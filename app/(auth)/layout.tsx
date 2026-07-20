import Link from "next/link";
import { Snowflake } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-navy-900 via-navy-700 to-navy-900 px-4 py-12">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-glacier-300 text-navy-900">
            <Snowflake className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-white">SNOWOLF</span>
        </Link>
      </div>

      <div className="w-full max-w-md rounded-xl border border-white/10 bg-background p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
