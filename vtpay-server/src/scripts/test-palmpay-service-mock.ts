
import { PalmPayService } from '../services/PalmPayService';

// Mock types
type MockCall = {
    url: string;
    data?: any;
    config?: any;
};

class MockAxios {
    public calls: MockCall[] = [];
    public interceptors = {
        request: { use: (_: any) => { } },
        response: { use: (_: any) => { } }
    };

    // Pre-defined responses
    private responses: Record<string, any> = {};

    constructor() { }

    public mockResponse(urlFragment: string, responseData: any) {
        this.responses[urlFragment] = responseData;
    }

    public async post(url: string, data?: any, config?: any) {
        console.log(`[MockAxios] POST ${url}`, data);
        this.calls.push({ url, data, config });

        // Find matching response
        const key = Object.keys(this.responses).find(k => url.includes(k));
        if (key) {
            return {
                data: this.responses[key],
                status: 200,
                statusText: 'OK',
                headers: {},
                config: { url }
            };
        }

        return {
            data: { respCode: '99', respMsg: 'Mock: No response defined' },
            status: 404
        };
    }

    public async get(url: string, config?: any) {
        console.log(`[MockAxios] GET ${url}`);
        this.calls.push({ url, config });

        const key = Object.keys(this.responses).find(k => url.includes(k));
        if (key) {
            return {
                data: this.responses[key],
                status: 200
            };
        }
        return { data: { respCode: '99' } };
    }
}

async function runTests() {
    console.log('--- Starting PalmPay Service Unit Tests (Mocked) ---');

    const mockClient = new MockAxios();
    // @ts-ignore - bypassing strict AxiosInstance interface type check for mock
    const service = new PalmPayService(mockClient as any);

    // Test 1: createVirtualAccount
    console.log('\nTest 1: createVirtualAccount');
    mockClient.mockResponse('/virtual-account/create', {
        respCode: '00',
        respMsg: 'Success',
        data: {
            accountNumber: '1234567890',
            accountName: 'Test Account',
            bankName: 'PalmPay'
        }
    });

    try {
        const result = await service.createVirtualAccount({
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            customerMobile: '08012345678',
            externalReference: 'REF-001',
            bvn: '12345678901'
        });

        console.log('Result:', result);
        if (result.accountNumber === '1234567890') {
            console.log('PASS: Virtual Account created');
        } else {
            console.error('FAIL: Unexpected result');
        }
    } catch (error) {
        console.error('FAIL: Exception thrown', error);
    }

    // Test 2: resolveBankAccount
    console.log('\nTest 2: resolveBankAccount');
    mockClient.mockResponse('/bank/resolve', {
        respCode: '00',
        respMsg: 'Success',
        data: {
            accountNumber: '0000000000',
            accountName: 'Verified User',
            bankCode: '044'
        }
    });

    try {
        const result = await service.resolveBankAccount({
            bankCode: '044',
            accountNumber: '0000000000'
        });

        console.log('Result:', result);
        if (result.accountName === 'Verified User') {
            console.log('PASS: Bank Account resolved');
        } else {
            console.error('FAIL: Unexpected result');
        }
    } catch (error) {
        console.error('FAIL: Exception thrown', error);
    }

    // Test 3: Error Handling
    console.log('\nTest 3: Error Handling');
    mockClient.mockResponse('/virtual-account/create_fail', {
        respCode: '99',
        respMsg: 'Simulation Failure'
    });

    // We can't easily change the URL called by service method, 
    // so we mock the response for the URL it *does* call, but temporarily.
    // Or we rely on the fact that if we don't mock it, it returns 404/error (our default mock behavior).

    // Let's force a failure by mocking with error response overrides
    mockClient.mockResponse('/virtual-account/create', {
        respCode: '99',
        respMsg: 'Simulated API Error'
    });

    try {
        await service.createVirtualAccount({
            customerName: 'Fail User',
            customerEmail: 'fail@example.com',
            customerMobile: '08000000000',
            externalReference: 'REF-FAIL',
            bvn: '00000000000'
        });
        console.error('FAIL: Should have thrown error but did not');
    } catch (error: any) {
        console.log(`PASS: Caught expected error: ${error.message}`);
    }

    console.log('\n--- Tests Completed ---');
}

runTests();
