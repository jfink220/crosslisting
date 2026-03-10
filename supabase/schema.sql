-- ============================================================
-- Crosslisting App - Database Schema
-- Run this in Supabase: SQL Editor → New Query → Paste & Run
-- ============================================================


-- ── LISTINGS ─────────────────────────────────────────────────
CREATE TABLE listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  price       numeric(10,2) NOT NULL,
  condition   text NOT NULL CHECK (condition IN ('new','like_new','good','fair','poor')),
  category    text,
  brand       text,
  size        text,
  color       text,
  tags        text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings FOR DELETE USING (auth.uid() = user_id);


-- ── LISTING IMAGES ────────────────────────────────────────────
CREATE TABLE listing_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage images of own listings"
  ON listing_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_images.listing_id
        AND listings.user_id = auth.uid()
    )
  );


-- ── PLATFORMS ─────────────────────────────────────────────────
-- Seeded once by admin; users don't modify this table
CREATE TABLE platforms (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL UNIQUE,
  slug      text NOT NULL UNIQUE,
  logo_url  text
);

ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platforms"
  ON platforms FOR SELECT USING (true);

-- Seed supported platforms
INSERT INTO platforms (name, slug) VALUES
  ('eBay',              'ebay'),
  ('Poshmark',          'poshmark'),
  ('Mercari',           'mercari'),
  ('Depop',             'depop'),
  ('Etsy',              'etsy'),
  ('Facebook Marketplace', 'facebook'),
  ('Shopify',           'shopify');


-- ── PLATFORM ACCOUNTS ─────────────────────────────────────────
CREATE TABLE platform_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id  uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  username     text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform_id)
);

ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own platform accounts"
  ON platform_accounts FOR ALL USING (auth.uid() = user_id);


-- ── CROSSLISTINGS ─────────────────────────────────────────────
CREATE TABLE crosslistings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  platform_id          uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  platform_listing_id  text,
  platform_listing_url text,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','active','sold','failed','delisted')),
  listed_at            timestamptz,
  sold_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, platform_id)
);

ALTER TABLE crosslistings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crosslistings"
  ON crosslistings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = crosslistings.listing_id
        AND listings.user_id = auth.uid()
    )
  );


-- ── AUTO-UPDATE updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER crosslistings_updated_at
  BEFORE UPDATE ON crosslistings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── STORAGE BUCKET FOR IMAGES ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('listing-images', 'listing-images', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
