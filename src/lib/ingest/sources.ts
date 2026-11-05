export type SourceConfig = {
  id: string;
  name: string;
  homepage: string;
  feedUrl?: string;
  htmlUrl?: string;
  selectors?: string[];
  gnewsQuery?: string;
  gnewsPublishers?: string[];
  limit?: number;
};

export const SOURCES: SourceConfig[] = [
  {
    id: "bbc",
    name: "BBC News",
    homepage: "https://www.bbc.com/news",
    feedUrl: "https://feeds.bbci.co.uk/news/rss.xml",
    htmlUrl: "https://www.bbc.com/news",
    selectors: [
      "[data-testid='card-headline']",
      "h3[class*='Headline'] a",
      "h2 a[href*='/news/']",
    ],
  },
  {
    id: "reuters",
    name: "Reuters",
    homepage: "https://www.reuters.com",
    feedUrl:
      "https://news.google.com/rss/search?q=when:1d+source:reuters&hl=en-US&gl=US&ceid=US:en",
    gnewsQuery: "source:reuters",
    gnewsPublishers: ["Reuters"],
  },
  {
    id: "hn",
    name: "Hacker News",
    homepage: "https://news.ycombinator.com",
    feedUrl: "https://news.ycombinator.com/rss",
    htmlUrl: "https://news.ycombinator.com/",
    selectors: ["span.titleline > a", "td.title > a.storylink"],
  },
  {
    id: "nyt",
    name: "The New York Times",
    homepage: "https://www.nytimes.com",
    feedUrl: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    htmlUrl: "https://www.nytimes.com/",
    selectors: [
      "h3[class*='indicate-hover']",
      "a[href*='/202'] h3",
      "section h2, section h3",
    ],
    gnewsQuery: 'source:"The New York Times"',
    gnewsPublishers: ["The New York Times"],
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    homepage: "https://www.aljazeera.com",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    htmlUrl: "https://www.aljazeera.com/",
    selectors: ["h3 a", "article h2 a"],
    gnewsQuery: "source:aljazeera",
    gnewsPublishers: ["Al Jazeera"],
  },
  {
    id: "hindustantimes",
    name: "Hindustan Times",
    homepage: "https://www.hindustantimes.com",
    feedUrl: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
    htmlUrl: "https://www.hindustantimes.com/india-news",
    selectors: ["h3 a", "h2 a"],
    gnewsQuery: 'source:"Hindustan Times"',
    gnewsPublishers: ["Hindustan Times"],
  },
  {
    id: "guardian",
    name: "The Guardian",
    homepage: "https://www.theguardian.com",
    feedUrl: "https://www.theguardian.com/world/rss",
    htmlUrl: "https://www.theguardian.com/world",
    selectors: ["a[aria-label]", "h3 a", "h2 a"],
    gnewsQuery: 'source:"The Guardian"',
    gnewsPublishers: ["The Guardian"],
  },
  {
    id: "thehindu",
    name: "The Hindu",
    homepage: "https://www.thehindu.com",
    feedUrl:
      "https://www.thehindu.com/news/national/feeder/default.rss",
    htmlUrl: "https://www.thehindu.com/news/national/",
    selectors: ["h3 a", "h2 a"],
    gnewsQuery: 'source:"The Hindu"',
    gnewsPublishers: ["The Hindu"],
  },
  {
    id: "toi",
    name: "Times of India",
    homepage: "https://timesofindia.indiatimes.com",
    feedUrl: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    htmlUrl: "https://timesofindia.indiatimes.com/",
    selectors: ["h3 a", "span.w_tle a"],
    gnewsQuery: 'source:"Times of India"',
    gnewsPublishers: ["The Times of India", "Times of India"],
  },
  {
    id: "cnn",
    name: "CNN",
    homepage: "https://www.cnn.com",
    feedUrl:
      "https://news.google.com/rss/search?q=when:1d+source:CNN&hl=en-US&gl=US&ceid=US:en",
    gnewsQuery: "source:CNN",
    gnewsPublishers: ["CNN"],
  },
  {
    id: "ars",
    name: "Ars Technica",
    homepage: "https://arstechnica.com",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    htmlUrl: "https://arstechnica.com/",
    selectors: ["h2 a", "article h2 a"],
  },
  {
    id: "verge",
    name: "The Verge",
    homepage: "https://www.theverge.com",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    htmlUrl: "https://www.theverge.com/",
    selectors: ["h2 a", "h3 a"],
  },
  {
    id: "npr",
    name: "NPR",
    homepage: "https://www.npr.org",
    feedUrl: "https://feeds.npr.org/1001/rss.xml",
    htmlUrl: "https://www.npr.org/",
    selectors: ["h2 a", "h3 a"],
  },
];

export const SOURCES_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
