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

const extractStructuredContent = ($: cheerio.CheerioAPI) => {
  // Extract all text content with structure
  const sections: any[] = [];
  
  $('body').children().each((_, element) => {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();
    const text = $el.text().trim();
    const html = $el.html() || '';
    
    if (text) {
      sections.push({
        type: tagName,
        text,
        html,
        classes: $el.attr('class'),
        id: $el.attr('id'),
      });
    }
  });

  return sections;
};

const extractMetaTags = ($: cheerio.CheerioAPI) => {
  const meta: any = {
    title: $('title').text().trim(),
    description: $('meta[name="description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [],
    author: $('meta[name="author"]').attr('content'),
    robots: $('meta[name="robots"]').attr('content'),
    viewport: $('meta[name="viewport"]').attr('content'),
    charset: $('meta[charset]').attr('charset'),
    ogTags: {},
    twitterTags: {},
    other: {},
  };

  // Extract all meta tags
  $('meta').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('name');
    const property = $el.attr('property');
    const content = $el.attr('content');

    if (property?.startsWith('og:')) {
      meta.ogTags[property.replace('og:', '')] = content;
    } else if (name?.startsWith('twitter:')) {
      meta.twitterTags[name.replace('twitter:', '')] = content;
    } else if (name && content) {
      meta.other[name] = content;
    }
  });

  return meta;
};

const extractScripts = ($: cheerio.CheerioAPI) => {
  const scripts: any[] = [];
  
  $('script').each((_, el) => {
    const $el = $(el);
    scripts.push({
      src: $el.attr('src'),
      type: $el.attr('type'),
      async: $el.attr('async') !== undefined,
      defer: $el.attr('defer') !== undefined,
      content: $el.html()?.trim(),
    });
  });

  return scripts;
};

const extractStyles = ($: cheerio.CheerioAPI) => {
  const styles: any[] = [];
  
  // External stylesheets
  $('link[rel="stylesheet"]').each((_, el) => {
    styles.push({
      type: 'external',
      href: $(el).attr('href'),
    });
  });

  // Inline styles
  $('style').each((_, el) => {
    styles.push({
      type: 'inline',
      content: $(el).html()?.trim(),
    });
  });

  return styles;
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
    const sections = extractStructuredContent($);
    const scripts = extractScripts($);
    const styles = extractStyles($);

    // Extract links with metadata
    const links = $('a').map((_, el) => {
      const $el = $(el);
      return {
        href: $el.attr('href'),
        text: $el.text().trim(),
        title: $el.attr('title'),
        rel: $el.attr('rel'),
        classes: $el.attr('class'),
        isExternal: $el.attr('href')?.startsWith('http'),
      };
    }).get();

    // Extract images with metadata
    const images = $('img').map((_, el) => {
      const $el = $(el);
      return {
        src: $el.attr('src'),
        alt: $el.attr('alt'),
        title: $el.attr('title'),
        width: $el.attr('width'),
        height: $el.attr('height'),
        classes: $el.attr('class'),
      };
    }).get();

    // Extract headings with hierarchy
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
        type: el.tagName.toLowerCase(),
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
        ).get(),
      };
    }).get();

    const content = {
      fullText,
      html,
      meta,
      sections,
      links,
      images,
      headings,
      lists,
      tables,
      scripts,
      styles,
      readingTime: calculateReadingTime(fullText),
      wordCount: fullText.split(/\s+/).length,
      sentiment: analyzeSentiment(fullText),
    };

    const performance = {
      loadTime: Date.now() - startTime,
      resourceCount: scripts.length + styles.length + images.length,
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