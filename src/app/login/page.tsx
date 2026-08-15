import { login } from "./actions";
import { Brain } from "lucide-react";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const resolvedParams = await searchParams;
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-sm border border-border">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4 shadow-sm">
            <Brain size={28} />
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Daily Brain Arena
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to start your daily mission.
          </p>
        </div>

        <form id="login-form" className="mt-8 space-y-6">
          {resolvedParams?.error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
              {resolvedParams.error}
            </div>
          )}
          {resolvedParams?.message && (
            <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400 text-center font-medium">
              {resolvedParams.message}
            </div>
          )}
          
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="employee@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Forgot your password?
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              className="group relative flex w-full justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors shadow-sm"
            >
              Sign In
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
