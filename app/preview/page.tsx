import Link from "next/link";

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-stone-950 p-8 text-stone-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-semibold">LexiNote Preview Entry</h1>
        <p className="text-stone-400">Open the main surfaces below to preview the current app structure included in this bundle.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard" className="rounded-2xl border border-stone-800 bg-stone-900 p-5">Dashboard</Link>
          <Link href="/words" className="rounded-2xl border border-stone-800 bg-stone-900 p-5">Notebook</Link>
          <Link href="/study" className="rounded-2xl border border-stone-800 bg-stone-900 p-5">Study</Link>
        </div>
      </div>
    </div>
  );
}
