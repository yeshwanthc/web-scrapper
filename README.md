# Advanced Web Scraper Dashboard

A powerful web scraping tool built with Next.js that extracts comprehensive content from websites and stores it in Supabase.

## Features

- 🌐 Full webpage content extraction
- 📊 Detailed content analysis
- 🔍 Advanced search capabilities
- 📈 Visual analytics and statistics
- 🗄️ Supabase database integration
- 🎨 Beautiful UI with shadcn/ui
- 📱 Responsive design

## Content Extraction

The scraper captures:

- Full page HTML content
- Meta information
  - Title
  - Description
  - Keywords
  - Open Graph tags
  - Twitter cards
  - Favicon
- Document structure
  - Headings (h1-h6)
  - Paragraphs
  - Lists
  - Tables
- Media content
  - Images with alt text
  - Videos
  - Audio elements
- Links and navigation
  - Internal/external links
  - Navigation menus
  - Social media links
- Semantic content
  - Article sections
  - Main content
  - Sidebars
  - Headers/Footers
- Technical details
  - Scripts
  - Stylesheets
  - Performance metrics
  - Resource counts

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Supabase project at https://supabase.com

4. Create a `.env` file with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Database Schema

The `scraped_pages` table in Supabase stores:

- Basic metadata (id, url, title, description)
- Full page content
- Extracted elements (headings, links, images)
- Technical metrics
- Timestamps

## API Routes

### POST /api/scrape

Scrapes a website and stores the data in Supabase.

Request body:
```json
{
  "url": "https://example.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Website",
    "description": "Site description",
    "content": {
      "fullText": "Complete page text",
      "html": "Full HTML content",
      "meta": { ... },
      "links": [ ... ],
      "images": [ ... ],
      "headings": [ ... ],
      "sections": [ ... ]
    },
    "performance": {
      "loadTime": 123,
      "resourceCount": 45,
      "totalSize": 67890
    }
  }
}
```

## Error Handling

The scraper includes robust error handling for:
- Invalid URLs
- Network timeouts
- Rate limiting
- Malformed HTML
- Database connection issues

## Security

- Rate limiting on API routes
- Input validation
- Secure database access
- XSS protection
- CORS configuration

## License

MIT