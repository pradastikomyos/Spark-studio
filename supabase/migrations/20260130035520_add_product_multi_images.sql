-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create product_images table
CREATE TABLE product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_display_order ON product_images(product_id, display_order);
CREATE UNIQUE INDEX idx_product_images_one_primary ON product_images(product_id) WHERE is_primary = true;

-- RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON product_images FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert" ON product_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update" ON product_images FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete" ON product_images FOR DELETE TO authenticated USING (true);

-- Migrate existing images
INSERT INTO product_images (product_id, image_url, display_order, is_primary)
SELECT id, image_url, 0, true
FROM products
WHERE image_url IS NOT NULL AND image_url != '';
