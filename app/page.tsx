import { Metadata } from 'next';
import ScraperDashboard from '@/components/ScraperDashboard';

export const metadata: Metadata = {
  title: 'Web Scraper Dashboard',
  description: 'Advanced web scraping tool with content management',
};

export default function Home() {
  return <ScraperDashboard />;
}