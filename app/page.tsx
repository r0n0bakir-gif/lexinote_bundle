import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getMissingAiEnvVars,
  getMissingPublicEnvVars,
  hasRequiredPublicEnvVars,
} from "@/lib/env";

export default function HomePage() {
  if (hasRequiredPublicEnvVars()) {
    redirect("/dashboard");
  }

  const missingVars = [...getMissingPublicEnvVars(), ...getMissingAiEnvVars()];

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
      <div className="mx-auto max-w-3xl rounded-3xl border border-stone-800 bg-stone-900 p-6 md:p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Setup required</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          LexiNote needs environment keys before it can start.
        </h1>
        <p className="mt-3 text-sm text-stone-300 md:text-base">
          Create a <code>.env.local</code> file in the project root and add the missing values below.
        </p>
        <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-950 p-4">
          <div className="text-sm font-medium text-stone-200">Missing variables</div>
          <ul className="mt-3 space-y-2 text-sm text-stone-400">
            {missingVars.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-950 p-4">
          <div className="text-sm font-medium text-stone-200">Example .env.local</div>
          <pre className="mt-3 overflow-x-auto text-sm text-stone-300">{`NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY`}</pre>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-2xl border border-stone-700 px-4 py-2 text-sm text-stone-200"
          >
            Open auth page
          </Link>
        </div>
      </div>
    </main>
  );
}
