"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMissingPublicEnvVars, hasRequiredPublicEnvVars } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasSupabaseEnv = hasRequiredPublicEnvVars();
  const missingPublicEnvVars = getMissingPublicEnvVars();

  async function ensureProfileClientSide() {
    await fetch("/api/profile/ensure", { method: "POST" });
  }

  async function handleEmailAuth() {
    try {
      if (!hasSupabaseEnv) {
        throw new Error(`Missing environment variables: ${missingPublicEnvVars.join(", ")}`);
      }

      setError(null);
      setMessage(null);
      setIsLoading(true);

      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await ensureProfileClientSide();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleAuth() {
    try {
      if (!hasSupabaseEnv) {
        throw new Error(`Missing environment variables: ${missingPublicEnvVars.join(", ")}`);
      }

      setError(null);
      setMessage(null);
      setIsLoading(true);

      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback` },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900 text-stone-100">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to LexiNote</CardTitle>
        <CardDescription className="text-stone-400">
          Sign in to sync your words, study progress, and dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => setMode("signin")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            className="rounded-2xl"
            onClick={() => setMode("signup")}
          >
            Sign up
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        </div>
        {!hasSupabaseEnv ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add {missingPublicEnvVars.map((key, index) => (
              <span key={key}>
                {index > 0 ? ", " : ""}
                <code>{key}</code>
              </span>
            ))}{" "}
            to <code>.env.local</code> before signing in.
          </div>
        ) : null}
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        <div className="flex flex-col gap-3">
          <Button onClick={handleEmailAuth} disabled={isLoading || !hasSupabaseEnv} className="rounded-2xl">
            {isLoading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleAuth}
            disabled={isLoading || !hasSupabaseEnv}
            className="rounded-2xl"
          >
            Continue with Google
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
