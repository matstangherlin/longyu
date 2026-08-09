create index if not exists referral_qualification_reviews_reviewer_idx
  on public.referral_qualification_reviews (reviewer_id)
  where reviewer_id is not null;
