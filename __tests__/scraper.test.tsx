import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createClient } from '@supabase/supabase-js';
import ScraperDashboard from '@/components/ScraperDashboard';
import { useScraperStore } from '@/store/scraper';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [] })),
      })),
    })),
  })),
}));

// Mock fetch for API calls
const mockFetchResponse = {
  success: true,
  data: {
    url: 'https://example.com',
    title: 'Example Website',
    description: 'An example website',
    content: {
      text: 'Sample text content',
      links: [{ href: 'https://example.com/link', text: 'Example Link' }],
      images: [{ src: 'https://example.com/image.jpg', alt: 'Example Image' }],
      headings: [{ level: 1, text: 'Main Heading' }],
    },
  },
};

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockFetchResponse),
  })
) as any;

describe('ScraperDashboard', () => {
  beforeEach(() => {
    useScraperStore.setState({
      url: '',
      loading: false,
      error: null,
      scrapedData: null,
      savedPages: [],
      stats: null,
      searchTerm: '',
      selectedTimeframe: 'all',
    });
  });

  it('renders the dashboard with initial state', () => {
    render(<ScraperDashboard />);
    expect(screen.getByText('Web Scraper Dashboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter URL to scrape...')).toBeInTheDocument();
  });

  it('handles URL input and scraping', async () => {
    render(<ScraperDashboard />);
    const input = screen.getByPlaceholderText('Enter URL to scrape...');
    const button = screen.getByText('Scrape Website');

    await userEvent.type(input, 'https://example.com');
    await userEvent.click(button);

    expect(global.fetch).toHaveBeenCalledWith('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });

    await waitFor(() => {
      expect(screen.getByText('Example Website')).toBeInTheDocument();
    });
  });

  it('displays error state', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: false, error: 'Failed to scrape' }),
      })
    ) as any;

    render(<ScraperDashboard />);
    const button = screen.getByText('Scrape Website');

    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to scrape')).toBeInTheDocument();
    });
  });

  it('filters saved pages based on search term', async () => {
    useScraperStore.setState({
      savedPages: [
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example Site',
          scraped_at: new Date().toISOString(),
          content: { links: [], images: [], headings: [] },
        },
        {
          id: '2',
          url: 'https://test.com',
          title: 'Test Site',
          scraped_at: new Date().toISOString(),
          content: { links: [], images: [], headings: [] },
        },
      ],
    });

    render(<ScraperDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Search history...');
    await userEvent.type(searchInput, 'Example');

    await waitFor(() => {
      expect(screen.getByText('Example Site')).toBeInTheDocument();
      expect(screen.queryByText('Test Site')).not.toBeInTheDocument();
    });
  });
});