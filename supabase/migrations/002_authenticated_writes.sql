-- Authenticated community writes. Guests remain read-only.
-- API forwards the verified Google JWT so auth.uid() is always authoritative.

drop policy if exists "Public insert user reviews" on public.user_reviews;
drop policy if exists "Public update likes" on public.user_reviews;
drop policy if exists "Public delete user reviews" on public.user_reviews;

create policy "members create own reviews" on public.user_reviews for insert to authenticated
  with check (auth.uid() = user_id);
create policy "members delete own reviews" on public.user_reviews for delete to authenticated
  using (auth.uid() = user_id);

create policy "members like admin reviews" on public.admin_review_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "members unlike admin reviews" on public.admin_review_likes for delete to authenticated
  using (auth.uid() = user_id);

create policy "members create comments" on public.admin_review_comments for insert to authenticated
  with check (auth.uid() = user_id and is_pinned = false and is_hidden = false);
create policy "members delete own comments" on public.admin_review_comments for delete to authenticated
  using (auth.uid() = user_id);

create policy "members like comments" on public.comment_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "members unlike comments" on public.comment_likes for delete to authenticated
  using (auth.uid() = user_id);

create policy "members like user reviews" on public.user_review_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "members unlike user reviews" on public.user_review_likes for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.admin_review_likes to authenticated;
grant select, insert, delete on public.admin_review_comments to authenticated;
grant select, insert, delete on public.comment_likes to authenticated;
grant select, insert, delete on public.user_review_likes to authenticated;
grant select, insert, delete on public.user_reviews to authenticated;
grant usage, select on all sequences in schema public to authenticated;
