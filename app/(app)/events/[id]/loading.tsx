import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown instantly while the event's Server Component pages (dashboard,
 * players, teams, summary, edit) fetch from Supabase — these routes are
 * force-dynamic (cookie-based auth), so there's no request cache to lean
 * on; this is what makes tab-switching *feel* instant instead of blank.
 */
export default function EventLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl sm:col-span-2" />
      </div>
    </div>
  );
}
