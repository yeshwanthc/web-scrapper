# Supabase Integration Guide for Web Scraper

## 1. Environment Setup

1. Create a `.env` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

2. Get these values from your Supabase project:
   - Go to Project Settings > API
   - Copy the Project URL for `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the anon/public key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the service_role key for `SUPABASE_SERVICE_KEY`

## 2. Database Schema

The schema is already set up in the migrations, but here's what it creates:

```sql
CREATE TABLE scraped_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  title text,
  description text,
  favicon text,
  content jsonb,
  scraped_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## 3. Common Issues & Solutions

### Issue 1: Data Not Being Saved

1. Check Supabase Connection:
   ```typescript
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_KEY! // Use service key for admin operations
   );
   ```

2. Verify Environment Variables:
   ```typescript
   if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
     throw new Error('Supabase environment variables are missing');
   }
   ```

### Issue 2: Invalid Data Structure

1. Validate data before insertion:
   ```typescript
   const validateContent = (content: any) => {
     if (!content) return false;
     if (typeof content !== 'object') return false;
     if (!content.fullText) return false;
     return true;
   };
   ```

2. Clean data before saving:
   ```typescript
   const cleanContent = (content: any) => {
     return {
       ...content,
       images: content.images?.filter(img => img && img.src) || [],
       links: content.links?.filter(link => link && link.href) || [],
       headings: content.headings?.filter(h => h && h.text) || [],
     };
   };
   ```

### Issue 3: Image URL Problems

1. URL Normalization:
   ```typescript
   const normalizeUrl = (baseUrl: string, url: string) => {
     if (!url) return '';
     try {
       return new URL(url, baseUrl).href;
     } catch {
       return '';
     }
   };
   ```

2. Image Validation:
   ```typescript
   const isValidImage = (url: string) => {
     const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
     return extensions.some(ext => url.toLowerCase().endsWith(ext));
   };
   ```

## 4. Best Practices

1. Error Handling:
   ```typescript
   try {
     const { data, error } = await supabase
       .from('scraped_pages')
       .insert([newPage]);
     
     if (error) {
       console.error('Supabase error:', error);
       throw error;
     }
   } catch (error) {
     // Handle error appropriately
   }
   ```

2. Rate Limiting:
   ```typescript
   const RATE_LIMIT = 10; // requests per minute
   const queue = new Map();

   const isRateLimited = (url: string) => {
     const now = Date.now();
     const lastRequest = queue.get(url) || 0;
     if (now - lastRequest < (60000 / RATE_LIMIT)) {
       return true;
     }
     queue.set(url, now);
     return false;
   };
   ```

3. Content Validation:
   ```typescript
   const validateScrapedData = (data: any) => {
     const required = ['url', 'title', 'content'];
     return required.every(field => data[field]);
   };
   ```

## 5. Testing Supabase Integration

1. Test Connection:
   ```typescript
   async function testConnection() {
     try {
       const { data, error } = await supabase
         .from('scraped_pages')
         .select('count')
         .single();
       
       if (error) throw error;
       console.log('Supabase connection successful');
     } catch (error) {
       console.error('Supabase connection failed:', error);
     }
   }
   ```

2. Test Data Insertion:
   ```typescript
   async function testInsertion() {
     const testData = {
       url: 'https://example.com',
       title: 'Test Page',
       content: { text: 'Test content' },
       scraped_at: new Date().toISOString(),
     };

     try {
       const { data, error } = await supabase
         .from('scraped_pages')
         .insert([testData]);
       
       if (error) throw error;
       console.log('Test insertion successful');
     } catch (error) {
       console.error('Test insertion failed:', error);
     }
   }
   ```

## 6. Debugging Tips

1. Enable Supabase Debug Logging:
   ```typescript
   const supabase = createClient(url, key, {
     auth: { debug: true },
   });
   ```

2. Monitor Network Requests:
   - Use browser DevTools Network tab
   - Look for requests to your Supabase project URL
   - Check response status codes and payloads

3. Common Error Codes:
   - 401: Authentication failed (check keys)
   - 403: Permission denied (check RLS policies)
   - 409: Conflict (duplicate unique values)
   - 413: Payload too large (reduce content size)

## 7. Performance Optimization

1. Batch Operations:
   ```typescript
   const batchSize = 100;
   for (let i = 0; i < items.length; i += batchSize) {
     const batch = items.slice(i, i + batchSize);
     await supabase.from('scraped_pages').insert(batch);
   }
   ```

2. Content Size Optimization:
   ```typescript
   const optimizeContent = (content: any) => {
     return {
       ...content,
       html: content.html.substring(0, 1000000), // Limit HTML size
       fullText: content.fullText.substring(0, 100000), // Limit text size
     };
   };
   ```

## 8. Security Considerations

1. Use Service Key Only on Server:
   - Never expose SUPABASE_SERVICE_KEY in client code
   - Use anon key for client-side operations
   - Implement proper RLS policies

2. Sanitize Input:
   ```typescript
   const sanitizeUrl = (url: string) => {
     try {
       const parsed = new URL(url);
       return parsed.toString();
     } catch {
       throw new Error('Invalid URL');
     }
   };
   ```

## 9. Monitoring

1. Add Logging:
   ```typescript
   const log = (type: string, message: string, data?: any) => {
     console.log(`[${type}] ${message}`, data);
     // Add your logging service here
   };
   ```

2. Track Performance:
   ```typescript
   const trackPerformance = (operation: string, startTime: number) => {
     const duration = Date.now() - startTime;
     log('performance', `${operation} took ${duration}ms`);
   };
   ```

## 10. Maintenance

1. Regular Cleanup:
   ```typescript
   async function cleanupOldRecords() {
     const thirtyDaysAgo = new Date();
     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
     
     await supabase
       .from('scraped_pages')
       .delete()
       .lt('created_at', thirtyDaysAgo.toISOString());
   }
   ```

2. Health Checks:
   ```typescript
   async function healthCheck() {
     try {
       const start = Date.now();
       const { data, error } = await supabase
         .from('scraped_pages')
         .select('count')
         .single();
         
       const duration = Date.now() - start;
       return {
         status: error ? 'error' : 'healthy',
         latency: duration,
         error: error?.message,
       };
     } catch (error) {
       return { status: 'error', error: error.message };
     }
   }
   ```