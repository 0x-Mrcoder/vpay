
import { connectDatabase } from '../config/database';
import { zainpayService } from '../services/ZainpayService';
import { logger } from '../utils/logger';

/**
 * Settlement Schedule Test Script
 * Tests T1/T7/T30 settlement schedule creation, retrieval, and deactivation
 */

async function testSettlementSchedule() {
    console.log('🚀 Starting Settlement Schedule Test Suite\n');

    await connectDatabase();
    await zainpayService.refreshConfig();

    const results = {
        passed: 0,
        failed: 0,
        tests: [] as { name: string; status: 'PASS' | 'FAIL'; message: string }[]
    };

    const addResult = (name: string, status: 'PASS' | 'FAIL', message: string) => {
        results.tests.push({ name, status, message });
        if (status === 'PASS') results.passed++;
        else results.failed++;
        console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${message}`);
    };

    // Get a test zainbox
    let testZainboxCode: string | null = null;

    try {
        console.log('📦 Getting test zainbox...');
        const zainboxes = await zainpayService.listZainboxes();
        if (zainboxes.code === '00' && zainboxes.data && zainboxes.data.length > 0) {
            testZainboxCode = zainboxes.data[0].codeName;
            console.log(`   Using zainbox: ${testZainboxCode}\n`);
        } else {
            console.error('❌ No zainboxes found for testing');
            process.exit(1);
        }
    } catch (error: any) {
        console.error('❌ Failed to get zainboxes:', error.message);
        process.exit(1);
    }

    // Test 1: Get current settlement schedule (should be none initially)
    try {
        console.log('\n📋 Test 1: Get Current Settlement Schedule');
        const current = await zainpayService.getSettlement(testZainboxCode);

        if (current.code === '00' && current.data) {
            addResult('Get Settlement Schedule', 'PASS', `Found existing schedule: ${current.data.scheduleType}`);
            console.log(`   Current schedule: ${JSON.stringify(current.data, null, 2)}`);
        } else {
            addResult('Get Settlement Schedule', 'PASS', 'No schedule configured (expected)');
        }
    } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('406')) {
            addResult('Get Settlement Schedule', 'PASS', 'No schedule configured (expected)');
        } else {
            addResult('Get Settlement Schedule', 'FAIL', error.message);
        }
    }

    // Test 2: Create T1 (Daily) Settlement Schedule
    try {
        console.log('\n💰 Test 2: Create T1 (Daily) Settlement Schedule');

        const t1Payload = {
            name: 'test-daily-settlement',
            zainboxCode: testZainboxCode,
            scheduleType: 'T1' as 'T1' | 'T7' | 'T30',
            schedulePeriod: 'Daily',
            settlementAccountList: [
                {
                    accountNumber: '1234567890',
                    bankCode: '058', // GTBank
                    percentage: '100'
                }
            ],
            status: true
        };

        const t1Result = await zainpayService.createSettlement(t1Payload);

        if (t1Result.code === '00') {
            addResult('Create T1 Settlement', 'PASS', 'Daily settlement schedule created');
        } else {
            addResult('Create T1 Settlement', 'FAIL', `Response code: ${t1Result.code}`);
        }
    } catch (error: any) {
        addResult('Create T1 Settlement', 'FAIL', error.message);
    }

    // Wait a bit before next test
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Verify T1 settlement was created
    try {
        console.log('\n🔍 Test 3: Verify T1 Settlement Created');
        const verify = await zainpayService.getSettlement(testZainboxCode);

        if (verify.code === '00' && verify.data && verify.data.scheduleType === 'T1') {
            addResult('Verify T1 Settlement', 'PASS', `T1 schedule confirmed: ${verify.data.schedulePeriod}`);
        } else {
            addResult('Verify T1 Settlement', 'FAIL', 'T1 schedule not found after creation');
        }
    } catch (error: any) {
        addResult('Verify T1 Settlement', 'FAIL', error.message);
    }

    // Test 4: Update to T7 (Weekly) Settlement Schedule
    try {
        console.log('\n📅 Test 4: Update to T7 (Weekly) Settlement Schedule');

        const t7Payload = {
            name: 'test-weekly-settlement',
            zainboxCode: testZainboxCode,
            scheduleType: 'T7' as 'T1' | 'T7' | 'T30',
            schedulePeriod: 'Friday',
            settlementAccountList: [
                {
                    accountNumber: '1234567890',
                    bankCode: '058',
                    percentage: '90'
                },
                {
                    accountNumber: '0987654321',
                    bankCode: '058',
                    percentage: '10'
                }
            ],
            status: true
        };

        const t7Result = await zainpayService.createSettlement(t7Payload);

        if (t7Result.code === '00') {
            addResult('Update to T7 Settlement', 'PASS', 'Weekly settlement schedule created');
        } else {
            addResult('Update to T7 Settlement', 'FAIL', `Response code: ${t7Result.code}`);
        }
    } catch (error: any) {
        addResult('Update to T7 Settlement', 'FAIL', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Verify T7 settlement
    try {
        console.log('\n🔍 Test 5: Verify T7 Settlement');
        const verify = await zainpayService.getSettlement(testZainboxCode);

        if (verify.code === '00' && verify.data && verify.data.scheduleType === 'T7') {
            addResult('Verify T7 Settlement', 'PASS', `T7 schedule confirmed: ${verify.data.schedulePeriod}`);
            console.log(`   Settlement accounts: ${verify.data.settlementAccounts?.length || 0}`);
        } else {
            addResult('Verify T7 Settlement', 'FAIL', 'T7 schedule not found');
        }
    } catch (error: any) {
        addResult('Verify T7 Settlement', 'FAIL', error.message);
    }

    // Test 6: Create T30 (Monthly) Settlement Schedule
    try {
        console.log('\n📆 Test 6: Create T30 (Monthly) Settlement Schedule');

        const t30Payload = {
            name: 'test-monthly-settlement',
            zainboxCode: testZainboxCode,
            scheduleType: 'T30' as 'T1' | 'T7' | 'T30',
            schedulePeriod: 'lastDayOfMonth',
            settlementAccountList: [
                {
                    accountNumber: '1234567890',
                    bankCode: '058',
                    percentage: '100'
                }
            ],
            status: true
        };

        const t30Result = await zainpayService.createSettlement(t30Payload);

        if (t30Result.code === '00') {
            addResult('Create T30 Settlement', 'PASS', 'Monthly settlement schedule created');
        } else {
            addResult('Create T30 Settlement', 'FAIL', `Response code: ${t30Result.code}`);
        }
    } catch (error: any) {
        addResult('Create T30 Settlement', 'FAIL', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 7: Verify T30 settlement
    try {
        console.log('\n🔍 Test 7: Verify T30 Settlement');
        const verify = await zainpayService.getSettlement(testZainboxCode);

        if (verify.code === '00' && verify.data && verify.data.scheduleType === 'T30') {
            addResult('Verify T30 Settlement', 'PASS', `T30 schedule confirmed: ${verify.data.schedulePeriod}`);
        } else {
            addResult('Verify T30 Settlement', 'FAIL', 'T30 schedule not found');
        }
    } catch (error: any) {
        addResult('Verify T30 Settlement', 'FAIL', error.message);
    }

    // Test 8: Deactivate settlement schedule
    try {
        console.log('\n🚫 Test 8: Deactivate Settlement Schedule');

        const deactivatePayload = {
            name: 'test-monthly-settlement',
            zainboxCode: testZainboxCode,
            scheduleType: 'T30' as 'T1' | 'T7' | 'T30',
            schedulePeriod: 'lastDayOfMonth',
            settlementAccountList: [
                {
                    accountNumber: '1234567890',
                    bankCode: '058',
                    percentage: '100'
                }
            ],
            status: false // Deactivate
        };

        const deactivateResult = await zainpayService.createSettlement(deactivatePayload);

        if (deactivateResult.code === '00') {
            addResult('Deactivate Settlement', 'PASS', 'Settlement schedule deactivated');
        } else {
            addResult('Deactivate Settlement', 'FAIL', `Response code: ${deactivateResult.code}`);
        }
    } catch (error: any) {
        addResult('Deactivate Settlement', 'FAIL', error.message);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total:  ${results.tests.length}`);
    console.log(`🎯 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests.filter(t => t.status === 'FAIL').forEach(t => {
            console.log(`   - ${t.name}: ${t.message}`);
        });
    }

    console.log('\n✨ Settlement Schedule test suite completed!\n');
    process.exit(results.failed > 0 ? 1 : 0);
}

testSettlementSchedule().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
