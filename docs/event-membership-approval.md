# Future work: approve join requests

## Status

Not implemented. Today (`supabase/migrations/0002_event_members.sql`),
visiting `.../events/[id]/join` while logged in joins an event **instantly**
— any authenticated user who has the link is in immediately, no owner
action required. This document sketches the follow-up where the owner
approves each request instead.

## Motivation

An owner sharing a join link in a group chat may not want *literally
anyone* who has the link (forwarded, screenshotted, etc.) to gain
read-access right away. An approval step lets them vet who joins, at the
cost of an extra step for the joiner.

## Data model change (non-breaking, additive)

Add a `status` column to `event_members`:

```sql
alter table event_members
  add column status text not null default 'approved'
    check (status in ('pending', 'approved'));
```

Defaulting to `'approved'` means every row created by today's instant-join
flow (and any migration written before this ships) keeps working exactly
as it does now — this is why the table exists *before* this feature, not
bundled with it. Turning approval on later is just:

1. Ship the column (default `'approved'`, no behavior change yet).
2. Change the join action to insert `status = 'pending'` instead of relying
   on the default.
3. Tighten the member-read RLS policies (below).

## RLS changes

Every "members read ..." policy added in `0002_event_members.sql` currently
checks `is_event_member(...)`. Redefine that helper (or add a second one,
`is_approved_member`) to also require `status = 'approved'`:

```sql
create or replace function is_event_member(e uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from event_members
    where event_id = e and user_id = auth.uid() and status = 'approved'
  );
$$;
```

Because every read policy already calls through this one function, this is
the *only* SQL change needed to make pending members unable to see
anything — no need to touch the seven per-table policies again.

The join action itself (insert) doesn't need a new policy: a user can
always insert a `pending` row for themselves under the existing "self joins
event" policy, whether or not it's later visible to them as `approved`.

## UI sketch

- **Owner side** — a "Pedidos pra entrar" section on the dashboard
  (`app/(app)/events/[id]/page.tsx`), visible only when there's at least
  one `event_members` row with `status = 'pending'` for this event (owner
  can already `select` all members via the existing "owner reads members"
  policy, `pending` or not). Each row: requester's name/email + Aprovar /
  Recusar buttons.
  - Approve: `update event_members set status = 'approved' where id = ...`.
  - Reject: `delete from event_members where id = ...` (matches "leaving"
    semantics — no separate `'rejected'` status needed unless the owner
    wants to remember and silently block a re-request later).
- **Requester side** — `.../join` no longer redirects straight to the
  event. After inserting the `pending` row, render a small "Pedido enviado,
  esperando o dono aprovar" page instead of `redirect()`-ing, since the
  member-read policies won't let them see the event yet anyway. Needs a way
  to *notice* once approved — simplest v1 is "check back later" (no
  realtime/notification), since the event will just start working the next
  time they load it once `status` flips to `approved`.

## Out of scope for this doc

Notifying the owner that a request is waiting (email/push), notifying the
requester once approved, and letting the owner remove an already-approved
member (today's `leaveEvent` is self-service only, by the member).
