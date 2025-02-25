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

const calculateReadabilityScore = (text: string): number => {
  const sentences = text.split(/[.!?]+/);
  const words = text.split(/\s+/);
  const syllables = text.toLowerCase().split(/[^aeiouy]+/).filter(Boolean);
  
  // Flesch Reading Ease score
  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables.length / words.length);
  return Math.max(0, Math.min(100, score));
};

const analyzeKeywords = (text: string) => {
  const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 3);
  const wordCount = words.length;
  const frequencies: Record<string, number> = {};
  
  words.forEach(word => {
    frequencies[word] = (frequencies[word] || 0) + 1;
  });

  const topKeywords = Object.entries(frequencies)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: (count / wordCount) * 100
    }));

  return {
    keywordDensity: frequencies,
    topKeywords
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

const calculatePerformanceMetrics = ($: cheerio.CheerioAPI) => {
  return {
    domNodes: $('*').length,
    scriptCount: $('script').length,
    styleCount: $('style, link[rel="stylesheet"]').length,
    imageCount: $('img').length,
    fontCount: $('link[rel="preload"][as="font"], link[rel="stylesheet"][href*="fonts"]').length,
  };
};

const analyzeSEO = ($: cheerio.CheerioAPI, url: string, meta: any) => {
  const checks = {
    title: { score: 0, message: '' },
    description: { score: 0, message: '' },
    headings: { score: 0, message: '' },
    images: { score: 0, message: '' },
    links: { score: 0, message: '' },
    meta: { score: 0, message: '' },
    performance: { score: 0, message: '' },
    readability: { score: 0, message: '' },
    keywords: { score: 0, message: '' },
    mobile: { score: 0, message: '' },
  };

  const recommendations: string[] = [];

  // Title analysis
  const title = $('title').text();
  if (title.length >= 30 && title.length <= 60) {
    checks.title.score = 100;
    checks.title.message = 'Title length is optimal';
  } else {
    checks.title.score = 50;
    checks.title.message = 'Title length should be between 30-60 characters';
    recommendations.push('Optimize title length to be between 30-60 characters');
  }

  // Meta description
  const description = $('meta[name="description"]').attr('content');
  if (description && description.length >= 120 && description.length <= 160) {
    checks.description.score = 100;
    checks.description.message = 'Meta description length is optimal';
  } else {
    checks.description.score = 50;
    checks.description.message = 'Meta description should be between 120-160 characters';
    recommendations.push('Add or optimize meta description length');
  }

  // Headings structure
  const h1Count = $('h1').length;
  const hasProperHeadingStructure = $('h2, h3, h4, h5, h6').toArray().every((h, i, arr) => {
    if (i === 0) return true;
    const prevLevel = parseInt(arr[i - 1].tagName.slice(1));
    const currentLevel = parseInt(h.tagName.slice(1));
    return currentLevel <= prevLevel + 1;
  });

  if (h1Count === 1 && hasProperHeadingStructure) {
    checks.headings.score = 100;
    checks.headings.message = 'Heading structure is optimal';
  } else {
    checks.headings.score = 60;
    checks.headings.message = 'Improve heading hierarchy';
    recommendations.push('Ensure proper heading hierarchy and single H1 tag');
  }

  // Image optimization
  const images = $('img');
  const imagesWithAlt = images.filter((_, img) => $(img).attr('alt')).length;
  const imageScore = images.length > 0 ? (imagesWithAlt / images.length) * 100 : 100;
  
  checks.images.score = imageScore;
  checks.images.message = imageScore === 100 ? 'All images have alt text' : 'Some images missing alt text';
  if (imageScore < 100) {
    recommendations.push('Add alt text to all images');
  }

  // Links analysis
  const links = $('a');
  const internalLinks = links.filter((_, a) => {
    const href = $(a).attr('href');
    return href && !href.startsWith('http');
  }).length;
  const externalLinks = links.length - internalLinks;

  if (internalLinks > 0 && externalLinks > 0) {
    checks.links.score = 100;
    checks.links.message = 'Good mix of internal and external links';
  } else {
    checks.links.score = 70;
    checks.links.message = 'Consider adding more diverse links';
    recommendations.push('Add a better mix of internal and external links');
  }

  // Meta tags
  const hasRequiredMeta = [
    'description',
    'viewport',
    'robots',
    'og:title',
    'og:description',
    'twitter:card'
  ].every(tag => {
    return $(`meta[name="${tag}"], meta[property="${tag}"]`).length > 0;
  });

  if (hasRequiredMeta) {
    checks.meta.score = 100;
    checks.meta.message = 'All important meta tags present';
  } else {
    checks.meta.score = 70;
    checks.meta.message = 'Missing some important meta tags';
    recommendations.push('Add missing meta tags for better social sharing');
  }

  // Mobile responsiveness
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const hasMobileOptimization = $('link[rel="amphtml"]').length > 0 || 
                               $('meta[name="format-detection"]').length > 0;

  if (hasViewport && hasMobileOptimization) {
    checks.mobile.score = 100;
    checks.mobile.message = 'Page is mobile-friendly';
  } else {
    checks.mobile.score = 60;
    checks.mobile.message = 'Improve mobile optimization';
    recommendations.push('Enhance mobile responsiveness');
  }

  // Calculate overall score
  const totalScore = Object.values(checks).reduce((sum, check) => sum + check.score, 0) / Object.keys(checks).length;

  return {
    score: Math.round(totalScore),
    checks,
    recommendations
  };
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
    const performanceMetrics = calculatePerformanceMetrics($);
    const seoAnalysis = analyzeSEO($, validUrl, meta);
    const keywordAnalysis = analyzeKeywords(fullText);
    const readabilityScore = calculateReadabilityScore(fullText);

    const content = {
      fullText,
      html,
      meta,
      ...structuredContent,
      readingTime: calculateReadingTime(fullText),
      wordCount: fullText.split(/\s+/).length,
      sentiment: analyzeSentiment(fullText),
    };

    // Ensure we have valid values for content analysis
    const paragraphCount = structuredContent.paragraphs.length || 1; // Prevent division by zero
    const wordCount = fullText.split(/\s+/).length || 1; // Prevent division by zero
    const sentenceCount = fullText.split(/[.!?]+/).length || 1; // Prevent division by zero

    const contentAnalysis = {
      ...keywordAnalysis,
      readabilityScore,
      sentenceCount,
      averageSentenceLength: wordCount / sentenceCount,
      paragraphCount,
      averageParagraphLength: wordCount / paragraphCount,
    };

    const performance = {
      loadTime: Date.now() - startTime,
      resourceCount: structuredContent.images.length + structuredContent.links.length,
      totalSize: html.length,
      ...performanceMetrics,
    };

    // Ensure we have a valid SEO score
    const seoScore = Math.round(seoAnalysis.score) || 0;

    // Store in Supabase
    if (supabase) {
      try {
        const { error: supabaseError } = await supabase.from('scraped_pages').insert([
          {
            url: validUrl,
            title: meta.title,
            description: meta.description,
            content,
            performance_metrics: performance,
            content_analysis: contentAnalysis,
            seo_score: seoScore,
            readability_score: readabilityScore,
            meta_tags: meta,
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
        contentAnalysis,
        seoAnalysis: {
          ...seoAnalysis,
          score: seoScore,
        },
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