export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const initSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
};

const normalizeUrl = (baseUrl: string, url: string): string => {
  if (!url) return '';
  try {
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      return `${urlObj.protocol}//${urlObj.host}${url}`;
    }
    return new URL(url, baseUrl).href;
  } catch (error) {
    console.error('URL normalization error:', error);
    return url;
  }
};

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    return path.endsWith('.jpg') || 
           path.endsWith('.jpeg') || 
           path.endsWith('.png') || 
           path.endsWith('.gif') || 
           path.endsWith('.webp') || 
           path.endsWith('.svg');
  } catch {
    return false;
  }
};

const calculateReadingTime = (text: string): number => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

const analyzeSentiment = (text: string) => {
  const positive = ['good', 'great', 'awesome', 'excellent', 'happy', 'best'];
  const negative = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful'];

  const words = text.toLowerCase().split(/\s+/);
  const positiveWords = words.filter(word => positive.includes(word));
  const negativeWords = words.filter(word => negative.includes(word));

  const score = words.length > 0 ? (positiveWords.length - negativeWords.length) / words.length : 0;
  return {
    score,
    comparative: words.length > 0 ? score / words.length : 0,
    positive: positiveWords,
    negative: negativeWords,
  };
};

const extractStructuredContent = ($: cheerio.CheerioAPI, baseUrl: string) => {
  // Extract paragraphs with proper structure
  const paragraphs = $('p').map((_, el) => {
    const $el = $(el);
    return {
      text: $el.text().trim(),
      html: $el.html() || '',
      classes: $el.attr('class'),
      id: $el.attr('id'),
    };
  }).get().filter(p => p.text.length > 0);

  // Extract images with proper URL normalization
  const images = $('img').map((_, el) => {
    const $el = $(el);
    const src = normalizeUrl(baseUrl, $el.attr('src') || '');
    if (!isValidImageUrl(src)) return null;
    
    return {
      src,
      alt: $el.attr('alt') || '',
      title: $el.attr('title') || '',
      width: $el.attr('width'),
      height: $el.attr('height'),
      classes: $el.attr('class'),
    };
  }).get().filter(Boolean);

  // Extract links with proper URL normalization
  const links = $('a').map((_, el) => {
    const $el = $(el);
    const href = normalizeUrl(baseUrl, $el.attr('href') || '');
    if (!href) return null;

    return {
      href,
      text: $el.text().trim(),
      title: $el.attr('title') || '',
      rel: $el.attr('rel'),
      classes: $el.attr('class'),
      isExternal: href.startsWith('http') && !href.includes(new URL(baseUrl).hostname),
    };
  }).get().filter(Boolean);

  // Extract headings
  const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
    const $el = $(el);
    return {
      level: parseInt(el.tagName[1]),
      text: $el.text().trim(),
      id: $el.attr('id'),
      classes: $el.attr('class'),
    };
  }).get();

  // Extract lists
  const lists = $('ul, ol').map((_, el) => {
    const $el = $(el);
    return {
      type: el.tagName.toLowerCase() as 'ul' | 'ol',
      items: $el.find('li').map((_, li) => $(li).text().trim()).get(),
    };
  }).get();

  // Extract tables
  const tables = $('table').map((_, el) => {
    const $el = $(el);
    return {
      headers: $el.find('th').map((_, th) => $(th).text().trim()).get(),
      rows: $el.find('tr').map((_, tr) => 
        $(tr).find('td').map((_, td) => $(td).text().trim()).get()
      ).get().filter(row => row.length > 0),
    };
  }).get();

  // Extract videos
  const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').map((_, el) => {
    const $el = $(el);
    return {
      type: el.tagName.toLowerCase(),
      src: normalizeUrl(baseUrl, $el.attr('src') || ''),
      title: $el.attr('title') || '',
      width: $el.attr('width'),
      height: $el.attr('height'),
      html: $el.toString(),
    };
  }).get();

  return {
    paragraphs,
    images,
    links,
    headings,
    lists,
    tables,
    videos,
  };
};

const extractMetaTags = ($: cheerio.CheerioAPI) => {
  const meta = {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [],
    author: $('meta[name="author"]').attr('content'),
    robots: $('meta[name="robots"]').attr('content'),
    viewport: $('meta[name="viewport"]').attr('content'),
    charset: $('meta[charset]').attr('charset'),
    ogTags: {} as Record<string, string>,
    twitterTags: {} as Record<string, string>,
    other: {} as Record<string, string>,
  };

  $('meta').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name');
    const property = $el.attr('property');
    const content = $el.attr('content');

    if (property?.startsWith('og:')) {
      meta.ogTags[property.replace('og:', '')] = content || '';
    } else if (name?.startsWith('twitter:')) {
      meta.twitterTags[name.replace('twitter:', '')] = content || '';
    } else if (name && content) {
      meta.other[name] = content;
    }
  });

  return meta;
};

export async function POST(req: Request) {
  const startTime = Date.now();
  let supabase;
  
  try {
    try {
      supabase = initSupabase();
    } catch (error) {
      console.error('Supabase initialization error:', error);
    }

    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    
    const response = await axios.get(validUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebScraper/1.0; +http://example.com)',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract all content
    const fullText = $('body').text().trim();
    const meta = extractMetaTags($);
    const structuredContent = extractStructuredContent($, validUrl);

    const content = {
      fullText,
      html,
      meta,
      ...structuredContent,
      readingTime: calculateReadingTime(fullText),
      wordCount: fullText.split(/\s+/).length,
      sentiment: analyzeSentiment(fullText),
    };

    const performance = {
      loadTime: Date.now() - startTime,
      resourceCount: structuredContent.images.length + structuredContent.links.length,
      totalSize: html.length,
    };

    // Store in Supabase
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase.from('scraped_pages').insert([
          {
            url: validUrl,
            title: meta.title,
            description: meta.description,
            content,
            performance,
            scraped_at: new Date().toISOString(),
          },
        ]);

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
        }
      } catch (error) {
        console.error('Failed to save to Supabase:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        url: validUrl,
        title: meta.title,
        description: meta.description,
        content,
        performance,
      },
      savedToDatabase: !!supabase,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to scrape website',
      },
      { status: 500 }
    );
  }
}