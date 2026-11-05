export type ReaderBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | {
      type: "image";
      src: string;
      caption?: string;
      credit?: string;
      width?: number;
      height?: number;
    };

export type ReaderStatus = "full" | "feed" | "summary" | "external";

export type ReaderPayload = {
  blocks: ReaderBlock[];
  text: string;
  wordCount: number;
  status: ReaderStatus;
  error: string | null;
  title: string | null;
  byline: string | null;
  siteName: string | null;
  excerpt: string | null;
  leadImageUrl: string | null;
};
