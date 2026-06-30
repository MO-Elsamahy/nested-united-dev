import { RawPlatformEvent, NormalizedEvent } from './types';

export interface IEventParser {
  canParse(operationName: string, platform: string): boolean;
  parse(event: RawPlatformEvent): NormalizedEvent | null;
}

export class ParserRegistry {
  private parsers: IEventParser[] = [];

  register(parser: IEventParser) {
    this.parsers.push(parser);
  }

  parse(event: RawPlatformEvent): NormalizedEvent | null {
    const parser = this.parsers.find(p => p.canParse(event.operationName, event.platform));
    if (!parser) {
      console.warn(`[ParserRegistry] ⚠️ No parser registered for ${event.platform}:${event.operationName}`);
      return null;
    }

    try {
      return parser.parse(event);
    } catch (e: any) {
      console.error(`[ParserRegistry] ❌ Parsing failed for ${event.platform}:${event.operationName}`, e);
      throw e;
    }
  }
}
