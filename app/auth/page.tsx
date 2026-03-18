import { AuthForm } from "./auth-form";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-stone-950 px-4 py-10 text-stone-100">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">LexiNote</h1>
          <p className="mt-3 text-sm text-stone-400 md:text-base">Your AI-powered German vocabulary notebook and SRS study space.</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
