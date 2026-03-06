import { session } from 'electron';
import axios from 'axios';

export interface PlatformAccount {
    id: string;
    platform: 'airbnb' | 'gathern';
    partition: string;
}

const AIRBNB_API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';

export async function getCookiesForPlatform(account: PlatformAccount): Promise<string> {
    const ses = session.fromPartition(`persist:${account.partition}`);
    const cookies = await ses.cookies.get({});
    const domainFilter = account.platform === 'airbnb' ? 'airbnb.com' : 'gathern.co';

    return cookies
        .filter(c => c.domain?.includes(domainFilter))
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
}

/**
 * 1. THE MASTER LEDGER
 * Fetches the list of all active threads in the inbox.
 */
export async function fetchAirbnbInboxList(account: PlatformAccount) {
    const cookieString = await getCookiesForPlatform(account);
    const targetUrl = 'https://ar.airbnb.com/api/v3/ViaductInboxData/b80a8400adfc49f1d7a67000e1e478eea790029888d4458f4112f2f781ac8f40?operationName=ViaductInboxData&locale=ar&currency=SAR&variables=%7B%22getParticipants%22%3Atrue%2C%22numRequestedThreads%22%3A50%2C%22useUserThreadTag%22%3Atrue%2C%22userId%22%3A%22Vmlld2VyOjY2NTIxMzg1Ng%3D%3D%22%2C%22originType%22%3A%22USER_INBOX%22%2C%22threadVisibility%22%3A%22UNARCHIVED%22%2C%22threadTagFilters%22%3A%5B%5D%2C%22query%22%3Anull%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22b80a8400adfc49f1d7a67000e1e478eea790029888d4458f4112f2f781ac8f40%22%7D%7D';

    const response = await axios.get(targetUrl, {
        headers: {
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Airbnb-API-Key': AIRBNB_API_KEY
        }
    });
    return response.data;
}

/**
 * 2. THE DEEP SCANNER
 * Fetches up to 50 full messages for a specific conversation ID.
 */
export async function fetchAirbnbMessages(account: PlatformAccount, threadId: string) {
    const cookieString = await getCookiesForPlatform(account);
    const targetUrl = `https://ar.airbnb.com/api/v3/ViaductGetThreadAndDataQuery/0010054563db07c61f8ae4912cf8cdb0be3dfe89ee85a6d4d04cfcedbabfd30a?operationName=ViaductGetThreadAndDataQuery&locale=ar&currency=SAR&variables=%7B%22numRequestedMessages%22%3A50%2C%22getThreadState%22%3Atrue%2C%22getParticipants%22%3Atrue%2C%22mockThreadIdentifier%22%3Anull%2C%22mockMessageTestIdentifier%22%3Anull%2C%22getLastReads%22%3Atrue%2C%22forceUgcTranslation%22%3Afalse%2C%22isNovaLite%22%3Afalse%2C%22globalThreadId%22%3A%22${threadId}%22%2C%22originType%22%3A%22USER_INBOX%22%2C%22getInboxFields%22%3Atrue%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%220010054563db07c61f8ae4912cf8cdb0be3dfe89ee85a6d4d04cfcedbabfd30a%22%7D%7D`;

    const response = await axios.get(targetUrl, {
        headers: {
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Airbnb-API-Key': AIRBNB_API_KEY
        }
    });

    console.log(`✅ RAW JSON SECURED FOR THREAD: ${threadId}`);
    console.log(`JSON_START_${threadId}`);
    console.log(JSON.stringify(response.data, null, 2)); 
    console.log(`JSON_END_${threadId}`);
    return response.data;
}

export async function fetchAirbnbReservations(account: PlatformAccount) {
    const cookieString = await getCookiesForPlatform(account);
    const response = await axios.get('https://www.airbnb.com/api/v2/reservations?_format=for_hosting_sync&limit=20', {
        headers: {
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Airbnb-API-Key': AIRBNB_API_KEY
        }
    });
    return response.data;
}

export async function fetchGathernMessages(account: PlatformAccount) {
    console.log(`[Gathern] Fetching messages for ${account.id}...`);
    return [];
}