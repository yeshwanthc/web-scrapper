'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Search, Database, Link2, BarChart2, Clock, Hash, FileText, AlertCircle, Video, Image, Type } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useScraperStore } from '@/store/scraper';
import type { TimeFrame } from '@/lib/types';

export default function ScraperDashboard() {
  const {
    url,
    loading,
    error,
    scrapedData,
    savedPages,
    stats,
    searchTerm,
    selectedTimeframe,
    setUrl,
    scrapeUrl,
    loadSavedPages,
    setSearchTerm,
    setTimeframe,
  } = useScraperStore();

  useEffect(() => {
    loadSavedPages();
  }, [loadSavedPages]);

  const getTimeframeLabel = (timeframe: TimeFrame) => {
    switch (timeframe) {
      case 'day':
        return 'Last 24 Hours';
      case 'week':
        return 'Last Week';
      case 'month':
        return 'Last Month';
      default:
        return 'All Time';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col space-y-6">
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Globe className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Web Scraper Dashboard</h1>
          </div>
          
          <div className="flex space-x-4">
            <Input
              placeholder="Enter URL to scrape..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={scrapeUrl} disabled={loading}>
              {loading ? 'Scraping...' : 'Scrape Website'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </Card>

        {stats && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Content Statistics</h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-secondary rounded-lg">
                <FileText className="w-6 h-6 mb-2" />
                <div className="text-2xl font-bold">{stats.wordCount}</div>
                <div className="text-sm text-muted-foreground">Words</div>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <Link2 className="w-6 h-6 mb-2" />
                <div className="text-2xl font-bold">{stats.linkCount}</div>
                <div className="text-sm text-muted-foreground">Links</div>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <Hash className="w-6 h-6 mb-2" />
                <div className="text-2xl font-bold">{stats.headingCount}</div>
                <div className="text-sm text-muted-foreground">Headings</div>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <Image className="w-6 h-6 mb-2" />
                <div className="text-2xl font-bold">{stats.imageCount}</div>
                <div className="text-sm text-muted-foreground">Images</div>
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">
              <Type className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="media">
              <Image className="w-4 h-4 mr-2" />
              Media
            </TabsTrigger>
            <TabsTrigger value="links">
              <Link2 className="w-4 h-4 mr-2" />
              Links
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart2 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                {scrapedData ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4">{scrapedData.title}</h2>
                      <p className="text-muted-foreground mb-6">{scrapedData.description}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Paragraphs</h3>
                      <div className="space-y-4">
                        {scrapedData.content.sections
                          .filter(section => section.type === 'p')
                          .map((section, i) => (
                            <div key={i} className="p-4 bg-secondary/50 rounded-lg">
                              <p>{section.text}</p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Lists</h3>
                      <div className="grid gap-4">
                        {scrapedData.content.lists.map((list, i) => (
                          <div key={i} className="p-4 bg-secondary/50 rounded-lg">
                            {list.type === 'ol' ? (
                              <ol className="list-decimal list-inside">
                                {list.items.map((item, j) => (
                                  <li key={j} className="mb-2">{item}</li>
                                ))}
                              </ol>
                            ) : (
                              <ul className="list-disc list-inside">
                                {list.items.map((item, j) => (
                                  <li key={j} className="mb-2">{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Tables</h3>
                      <div className="space-y-4">
                        {scrapedData.content.tables.map((table, i) => (
                          <div key={i} className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr>
                                  {table.headers.map((header, j) => (
                                    <th key={j} className="p-2 bg-secondary text-left">{header}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, j) => (
                                  <tr key={j}>
                                    {row.map((cell, k) => (
                                      <td key={k} className="p-2 border border-secondary">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Enter a URL and click Scrape to view content
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                {scrapedData ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-3">Images</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {scrapedData.content.images.map((image, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={image.src}
                              alt={image.alt}
                              className="w-full h-auto rounded-lg shadow-md transition-transform group-hover:scale-105"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 rounded-b-lg">
                              <p className="text-sm font-medium truncate">{image.title || image.alt}</p>
                              {image.width && image.height && (
                                <p className="text-xs opacity-75">{image.width}x{image.height}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Videos</h3>
                      <div className="grid gap-4">
                        {scrapedData.content.sections
                          .filter(section => section.type === 'video' || section.html?.includes('<video'))
                          .map((video, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden">
                              <div dangerouslySetInnerHTML={{ __html: video.html }} />
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">iframes (Embedded Content)</h3>
                      <div className="grid gap-4">
                        {scrapedData.content.sections
                          .filter(section => section.type === 'iframe')
                          .map((iframe, i) => (
                            <div key={i} className="relative rounded-lg overflow-hidden bg-secondary/50 p-4">
                              <div dangerouslySetInnerHTML={{ __html: iframe.html }} />
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Enter a URL and click Scrape to view media content
                  </div>
                )}
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card className="p-6">
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-2 gap-4">
                  {scrapedData?.content.links.map((link, i) => (
                    <div key={i} className="p-3 bg-secondary rounded group hover:bg-accent transition-colors">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline block"
                      >
                        <div className="font-medium group-hover:text-primary">
                          {link.text}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {link.href}
                        </div>
                        {link.title && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {link.title}
                          </div>
                        )}
                      </a>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Content Distribution</h3>
                <div className="h-[300px]">
                  {stats && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Words', value: stats.wordCount },
                        { name: 'Links', value: stats.linkCount },
                        { name: 'Images', value: stats.imageCount },
                        { name: 'Headings', value: stats.headingCount },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6">
              <div className="mb-4">
                <Input
                  placeholder="Search history..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                <div className="flex space-x-2 mb-4">
                  {['all', 'day', 'week', 'month'].map((timeframe) => (
                    <Button
                      key={timeframe}
                      variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
                      onClick={() => setTimeframe(timeframe as TimeFrame)}
                      size="sm"
                    >
                      {getTimeframeLabel(timeframe as TimeFrame)}
                    </Button>
                  ))}
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-2 gap-4">
                  {savedPages
                    .filter((page) =>
                      Object.values(page).some(
                        (value) =>
                          typeof value === 'string' &&
                          value.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                    )
                    .map((page) => (
                      <Card key={page.id} className="p-4 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold truncate">{page.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{page.url}</p>
                        <div className="flex items-center space-x-2 mt-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(page.scraped_at).toLocaleString()}</span>
                        </div>
                        {page.content && (
                          <div className="mt-2 text-sm">
                            <div className="flex space-x-4 text-muted-foreground">
                              <span>{page.content.links?.length || 0} links</span>
                              <span>{page.content.images?.length || 0} images</span>
                              <span>{page.content.headings?.length || 0} headings</span>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}