import { RawPlatformEvent } from './types';

export class EventValidator {
  static validate(event: any): event is RawPlatformEvent {
    if (!event) return false;
    if (!event.accountId || typeof event.accountId !== 'string') return false;
    if (event.platform !== 'airbnb' && event.platform !== 'gathern') return false;
    if (!event.operationName || typeof event.operationName !== 'string') return false;
    if (!event.payload) return false;
    
    return true;
  }
}
