import { getCookiesForPlatform, fetchAirbnbMessages, fetchAirbnbInboxList, PlatformAccount } from './platform-api';
import { session } from 'electron';
import axios from 'axios';

// 1. Mock Electron with domains so your filter logic catches them
jest.mock('electron', () => ({
  session: {
    fromPartition: jest.fn().mockImplementation((partition) => ({
      cookies: {
        get: jest.fn().mockResolvedValue([
          { name: '_auth_token', value: 'mocked_airbnb_token_123', domain: 'airbnb.com' },
          { name: 'session_id', value: 'mocked_session_abc', domain: '.airbnb.com' },
          { name: 'sneaky_tracker', value: 'ignore_me', domain: 'google.com' } // Should be filtered out
        ])
      }
    }))
  }
}));

// 2. Mock Axios
jest.mock('axios');

describe('Platform API Cookie & Fetch Tests', () => {
  // 3. Match your exact PlatformAccount interface
  const mockAccount: PlatformAccount = { 
      id: 'acc_123', 
      platform: 'airbnb', 
      partition: 'airbnb_acc1' 
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully extract, filter, and format cookies from the Electron partition', async () => {
    const cookieString = await getCookiesForPlatform(mockAccount);
    
    expect(session.fromPartition).toHaveBeenCalledWith('persist:airbnb_acc1');
    
    // Check that it kept the Airbnb cookies
    expect(cookieString).toContain('_auth_token=mocked_airbnb_token_123');
    expect(cookieString).toContain('session_id=mocked_session_abc');
    
    // Check that your filter successfully blocked the Google cookie
    expect(cookieString).not.toContain('sneaky_tracker=ignore_me');
  });

  it('should fetch the Airbnb inbox list', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
        data: { data: { node: { messagingInbox: { threads: { edges: [] } } } } }
    });

    const data = await fetchAirbnbInboxList(mockAccount) as any;
    
    expect(axios.get).toHaveBeenCalled();
    expect(data.data.node.messagingInbox.threads.edges).toBeDefined();
  });

  it('should fetch specific Airbnb thread messages using threadId', async () => {
    const mockThreadId = "TWVzc2FnZVRocmVhZDoyNDQ2NTMzMDI4";
    
    (axios.get as jest.Mock).mockResolvedValue({
        data: { data: { threadData: { id: mockThreadId, messageData: { messages: [] } } } }
    });

    // NOW PASSES BOTH ARGUMENTS TO FIX TS2554
    const data = await fetchAirbnbMessages(mockAccount, mockThreadId) as any;
    
    expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(mockThreadId), 
        expect.any(Object)
    );
    expect(data.data.threadData.id).toBe(mockThreadId);
  });
});