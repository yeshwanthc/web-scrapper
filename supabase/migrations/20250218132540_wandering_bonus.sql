/*
  # Create scraped_pages table

  1. New Tables
    - `scraped_pages`
      - `id` (uuid, primary key)
      - `url` (text)
      - `title` (text)
      - `description` (text)
      - `favicon` (text)
      - `content` (jsonb)
      - `scraped_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `scraped_pages` table
    - Add policy for authenticated users to read all data
    - Add policy for authenticated users to insert data
*/

CREATE TABLE IF NOT EXISTS scraped_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  favicon text,
  content jsonb,
  scraped_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scraped_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scraped pages"
  ON scraped_pages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scraped pages"
  ON scraped_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);