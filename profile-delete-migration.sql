drop policy if exists "friend_status_delete_all" on public.friend_status;

create policy "friend_status_delete_all"
on public.friend_status
for delete
using (true);
