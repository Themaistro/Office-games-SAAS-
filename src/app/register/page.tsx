import { signup } from "./actions";
import { Brain } from "lucide-react";
import Link from "next/link";
import { getActiveDepartments, type DepartmentOption } from "@/lib/departments";
import { findInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const resolvedParams = await searchParams;
  const invitation = resolvedParams.invite ? await findInvitation(resolvedParams.invite) : null;
  if (resolvedParams.invite && !invitation) return <main className="mx-auto max-w-md px-5 py-20"><h1 className="text-2xl font-bold">Invitation unavailable</h1><p className="mt-3 text-muted-foreground">This link has expired or has already been used. Ask your administrator for a new invitation.</p><Link href="/login" className="mt-6 inline-block font-bold text-primary">Sign in to an existing account</Link></main>;
  let configuredDepartments: DepartmentOption[];
  try {
    configuredDepartments = await getActiveDepartments();
  } catch {
    return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12"><section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/5"><Brain size={30} className="text-primary" /><h1 className="mt-5 text-2xl font-bold tracking-tight">We couldn’t load registration</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Our connection is temporarily unavailable. Please try again in a moment. Your account hasn’t been created yet.</p><a href="/register" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Try again</a><Link href="/" className="ml-4 text-sm font-bold text-muted-foreground hover:text-primary">Back to home</Link></section></main>;
  }
  const departmentOptions = configuredDepartments;
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-card p-8 shadow-xl shadow-primary/5 border border-border/60">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4 shadow-sm">
            <Brain size={28} />
          </div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
            Join Office Games
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Create your player profile and join your team.
          </p>
        </div>

        <form action={signup} className="mt-8 space-y-6">
          {invitation && <><input type="hidden" name="invitation_token" value={resolvedParams.invite}/><p className="rounded-xl bg-primary/5 p-3 text-sm">You’re invited to join your team. Complete your player profile below.</p></>}
          {resolvedParams?.error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
              {resolvedParams.error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                defaultValue={invitation?.full_name}
                name="full_name"
                type="text"
                required
                className="relative block w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
                  className="relative block w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                >
                  <option value="">Select...</option>
                  {departmentOptions.map((dept) => (
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
                  className="relative block w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
                defaultValue={invitation?.email}
                readOnly={Boolean(invitation)}
                name="email"
                type="email"
                required
                className="relative block w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
                className="relative block w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all shadow-md hover:-translate-y-0.5"
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

