import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createClient } from '@supabase/supabase-js';
import type { ScrapedData, Stats, TimeFrame, SeoAnalysis } from '@/lib/types';
import { ScrapedDataSchema } from '@/lib/types';

// Initialize Supabase client only if environment variables are available
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

const supabase = getSupabaseClient();

interface ScraperState {
  url: string;
  loading: boolean;
  error: string | null;
  scrapedData: ScrapedData | null;
  savedPages: ScrapedData[];
  stats: Stats | null;
  seoAnalysis: SeoAnalysis | null;
  searchTerm: string;
  selectedTimeframe: TimeFrame;
}

interface ScraperActions {
  setUrl: (url: string) => void;
  scrapeUrl: () => Promise<void>;
  loadSavedPages: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setTimeframe: (timeframe: TimeFrame) => void;
  calculateStats: (data: ScrapedData) => void;
  analyzeSEO: (data: ScrapedData) => void;
}

const calculateSEOScore = (data: ScrapedData): SeoAnalysis => {
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

  // Title analysis
  if (data.title.length >= 30 && data.title.length <= 60) {
    checks.title.score = 100;
    checks.title.message = 'Title length is optimal';
  } else {
    checks.title.score = 50;
    checks.title.message = 'Title length should be between 30-60 characters';
  }

  // Description analysis
  if (data.description?.length >= 120 && data.description?.length <= 160) {
    checks.description.score = 100;
    checks.description.message = 'Description length is optimal';
  } else {
    checks.description.score = 50;
    checks.description.message = 'Description length should be between 120-160 characters';
  }

  // Headings analysis
  const hasH1 = data.content.headings.some(h => h.level === 1);
  const headingsHierarchy = data.content.headings.every((h, i, arr) => 
    i === 0 || h.level >= arr[i-1].level
  );
  
  if (hasH1 && headingsHierarchy) {
    checks.headings.score = 100;
    checks.headings.message = 'Heading structure is optimal';
  } else {
    checks.headings.score = 60;
    checks.headings.message = 'Improve heading hierarchy';
  }

  // Images analysis
  const imagesWithAlt = data.content.images.filter(img => img.alt).length;
  const imageScore = data.content.images.length > 0 
    ? (imagesWithAlt / data.content.images.length) * 100 
    : 100;
  
  checks.images.score = imageScore;
  checks.images.message = imageScore === 100 
    ? 'All images have alt text' 
    : 'Some images missing alt text';

  // Links analysis
  const internalLinks = data.content.links.filter(l => !l.isExternal).length;
  const externalLinks = data.content.links.filter(l => l.isExternal).length;
  
  if (internalLinks > 0 && externalLinks > 0) {
    checks.links.score = 100;
    checks.links.message = 'Good mix of internal and external links';
  } else {
    checks.links.score = 70;
    checks.links.message = 'Consider adding more diverse links';
  }

  // Meta tags analysis
  const hasMeta = data.content.meta && Object.keys(data.content.meta).length > 0;
  if (hasMeta) {
    checks.meta.score = 100;
    checks.meta.message = 'Meta tags are well-defined';
  } else {
    checks.meta.score = 50;
    checks.meta.message = 'Add more meta tags';
  }

  // Performance analysis
  const performanceScore = Math.min(100, 100 - (data.performance.loadTime / 1000));
  checks.performance.score = performanceScore;
  checks.performance.message = performanceScore >= 90 
    ? 'Performance is excellent' 
    : 'Performance needs improvement';

  // Readability analysis
  const readabilityScore = data.contentAnalysis.readabilityScore;
  checks.readability.score = readabilityScore;
  checks.readability.message = readabilityScore >= 60 
    ? 'Content is readable' 
    : 'Improve content readability';

  // Keywords analysis
  const hasKeywords = data.contentAnalysis.topKeywords.length > 0;
  checks.keywords.score = hasKeywords ? 100 : 50;
  checks.keywords.message = hasKeywords 
    ? 'Keywords are well distributed' 
    : 'Add more relevant keywords';

  // Mobile optimization
  const isMobileOptimized = data.content.meta.viewport !== undefined;
  checks.mobile.score = isMobileOptimized ? 100 : 50;
  checks.mobile.message = isMobileOptimized 
    ? 'Page is mobile-friendly' 
    : 'Optimize for mobile devices';

  // Calculate overall score
  const totalScore = Object.values(checks).reduce((sum, check) => sum + check.score, 0) / Object.keys(checks).length;

  // Generate recommendations
  const recommendations = Object.entries(checks)
    .filter(([_, check]) => check.score < 100)
    .map(([category, check]) => check.message);

  return {
    score: Math.round(totalScore),
    checks,
    recommendations,
  };
};

export const useScraperStore = create<ScraperState & ScraperActions>()(
  immer((set, get) => ({
    url: '',
    loading: false,
    error: null,
    scrapedData: null,
    savedPages: [],
    stats: null,
    seoAnalysis: null,
    searchTerm: '',
    selectedTimeframe: 'all',

    setUrl: (url) => set({ url }),

    scrapeUrl: async () => {
      try {
        set({ loading: true, error: null });
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: get().url }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to scrape website');
        }

        const validatedData = ScrapedDataSchema.parse(result.data);
        set((state) => {
          state.scrapedData = validatedData;
          state.error = null;
        });
        
        get().calculateStats(validatedData);
        get().analyzeSEO(validatedData);
        await get().loadSavedPages();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'An error occurred' });
      } finally {
        set({ loading: false });
      }
    },

    loadSavedPages: async () => {
      if (!supabase) {
        set({ error: 'Supabase is not configured' });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('scraped_pages')
          .select('*')
          .order('scraped_at', { ascending: false });

        if (error) throw error;
        
        set({ savedPages: data || [] });
      } catch (error) {
        set({ error: 'Failed to load saved pages' });
      }
    },

    setSearchTerm: (term) => set({ searchTerm: term }),

    setTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),

    calculateStats: (data) => {
      if (!data) return;

      const linkTypes = Object.entries(
        data.content.links.reduce((acc, link) => {
          const type = link.isExternal ? 'external' : 'internal';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, count]) => ({ type, count }));

      const headingsByLevel = data.content.headings.reduce((acc, h) => {
        acc[`h${h.level}`] = (acc[`h${h.level}`] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const headingChartData = Object.entries(headingsByLevel).map(([level, count]) => ({
        level,
        count,
      }));

      const contentDensity = ['header', 'main', 'footer'].map(section => {
        const sectionText = data.content.fullText.length;
        const sectionElements = data.content.links.length + data.content.images.length;
        return {
          section,
          density: sectionElements > 0 ? sectionText / sectionElements : 0,
        };
      });

      set({
        stats: {
          wordCount: data.content.wordCount || 0,
          linkCount: data.content.links.length,
          imageCount: data.content.images.length,
          headingCount: data.content.headings.length,
          readingTime: data.content.readingTime || 0,
          headingChartData,
          linkTypes,
          contentDensity,
          seoScore: data.seoAnalysis.score,
          performance: data.performance,
          contentAnalysis: data.contentAnalysis,
        },
      });
    },

    analyzeSEO: (data) => {
      const seoAnalysis = calculateSEOScore(data);
      set((state) => {
        state.seoAnalysis = seoAnalysis;
        if (state.stats) {
          state.stats.seoScore = seoAnalysis.score;
        }
      });
    },
  }))
);