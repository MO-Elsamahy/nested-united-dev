import mysql from 'mysql2/promise';
import { MemoryEventQueue } from './MemoryEventQueue';
import { ParserRegistry } from './ParserRegistry';
import { CentralEventProcessor } from './CentralEventProcessor';
import { PersistenceService } from '../services/PersistenceService';
import { AirbnbInboxParser, AirbnbOutgoingParser, AirbnbRealtimeParser } from '../adapters/airbnb/AirbnbEventParsers';

const globalForQueue = global as unknown as { eventQueue: MemoryEventQueue, pool: mysql.Pool };

function getPool(): mysql.Pool {
  if (!globalForQueue.pool) {
    globalForQueue.pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rentals_dashboard',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return globalForQueue.pool;
}

export function getEventQueue(): MemoryEventQueue {
  if (!globalForQueue.eventQueue) {
    const pool = getPool();
    const persistence = new PersistenceService(pool);
    const registry = new ParserRegistry();
    
    registry.register(new AirbnbInboxParser());
    registry.register(new AirbnbOutgoingParser());
    registry.register(new AirbnbRealtimeParser());

    const processor = new CentralEventProcessor(registry, persistence);
    globalForQueue.eventQueue = new MemoryEventQueue(pool, processor);
  }
  return globalForQueue.eventQueue;
}
