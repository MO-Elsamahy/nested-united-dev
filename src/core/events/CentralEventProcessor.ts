import { RawPlatformEvent } from './types';
import { ParserRegistry } from './ParserRegistry';
import { PersistenceService } from '../services/PersistenceService';
import { IEventProcessor } from './MemoryEventQueue';
import { EventValidator } from './EventValidator';

export class CentralEventProcessor implements IEventProcessor {
  constructor(
    private parserRegistry: ParserRegistry,
    private persistenceService: PersistenceService
  ) {}

  async process(rawEvent: RawPlatformEvent): Promise<void> {
    if (!EventValidator.validate(rawEvent)) {
      throw new Error('Invalid raw event payload structure');
    }

    const normalized = this.parserRegistry.parse(rawEvent);
    if (!normalized) {
      throw new Error(`No parser handled event: ${rawEvent.platform}:${rawEvent.operationName}`);
    }

    // Persist normalized data
    await this.persistenceService.persistEvent(normalized);
  }
}
