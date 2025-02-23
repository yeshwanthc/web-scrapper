import { z } from 'zod';

export const ImageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
  title: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  classes: z.string().optional(),
});

export const LinkSchema = z.object({
  href: z.string(),
  text: z.string(),
  title: z.string().optional(),
  rel: z.string().optional(),
  classes: z.string().optional(),
  isExternal: z.boolean().optional(),
});

export const HeadingSchema = z.object({
  level: z.number().min(1).max(6),
  text: z.string(),
  id: z.string().optional(),
  classes: z.string().optional(),
});

export const ListSchema = z.object({
  type: z.enum(['ul', 'ol']),
  items: z.array(z.string()),
});

export const TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const ParagraphSchema = z.object({
  text: z.string(),
  html: z.string(),
  classes: z.string().optional(),
  id: z.string().optional(),
});

export const VideoSchema = z.object({
  type: z.string(),
  src: z.string(),
  title: z.string(),
  width: z.string().optional(),
  height: z.string().optional(),
  html: z.string(),
});

export const MetaSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  author: z.string().optional(),
  robots: z.string().optional(),
  viewport: z.string().optional(),
  charset: z.string().optional(),
  ogTags: z.record(z.string()).optional(),
  twitterTags: z.record(z.string()).optional(),
  other: z.record(z.string()).optional(),
});

export const ContentSchema = z.object({
  fullText: z.string(),
  html: z.string(),
  meta: MetaSchema,
  paragraphs: z.array(ParagraphSchema),
  images: z.array(ImageSchema),
  links: z.array(LinkSchema),
  headings: z.array(HeadingSchema),
  lists: z.array(ListSchema),
  tables: z.array(TableSchema),
  videos: z.array(VideoSchema),
  readingTime: z.number(),
  wordCount: z.number(),
  sentiment: z.object({
    score: z.number(),
    comparative: z.number(),
    positive: z.array(z.string()),
    negative: z.array(z.string()),
  }),
});

export const ScrapedDataSchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string().optional(),
  content: ContentSchema,
  performance: z.object({
    loadTime: z.number(),
    resourceCount: z.number(),
    totalSize: z.number(),
  }),
});

export type Image = z.infer<typeof ImageSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Heading = z.infer<typeof HeadingSchema>;
export type List = z.infer<typeof ListSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Paragraph = z.infer<typeof ParagraphSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type Meta = z.infer<typeof MetaSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type ScrapedData = z.infer<typeof ScrapedDataSchema>;

export interface Stats {
  wordCount: number;
  linkCount: number;
  imageCount: number;
  headingCount: number;
  readingTime: number;
  headingChartData: { level: string; count: number }[];
  linkTypes: { type: string; count: number }[];
  contentDensity: { section: string; density: number }[];
  seoScore: number;
  performance: {
    loadTime: number;
    resourceCount: number;
    totalSize: number;
  };
}

export type TimeFrame = 'all' | 'day' | 'week' | 'month';

export interface SeoAnalysis {
  score: number;
  checks: {
    title: { score: number; message: string };
    description: { score: number; message: string };
    headings: { score: number; message: string };
    images: { score: number; message: string };
    links: { score: number; message: string };
    meta: { score: number; message: string };
  };
}