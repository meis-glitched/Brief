declare module "google-news-url-decoder" {
  export type DecodeResult =
    | { status: true; decoded_url: string }
    | { status: false; message: string };

  export class GoogleDecoder {
    decode(sourceUrl: string): Promise<DecodeResult>;
    decodeBatch(sourceUrls: string[]): Promise<DecodeResult[]>;
  }
}
