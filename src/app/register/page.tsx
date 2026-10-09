import { signup } from "./actions";
import { Brain } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();
  
  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-sm border border-border">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4 shadow-sm">
            <Brain size={28} />
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Join the Arena
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Create an account to start playing.
          </p>
        </div>

        <form action={signup} className="mt-8 space-y-6">
          {resolvedParams?.error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center">
              {resolvedParams.error}
            </div>
          )}
          
          <div className="space-y-4 rounded-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="Jane Doe"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  required
                  className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                >
                  <option value="">Select...</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="position">
                  Position
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="e.g. Developer"
                />
              </div>
            </div>

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
                minLength={6}
                className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors shadow-sm"
          >
            Create Account
          </button>
        </form>
        
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
