import {resolveKujoBinary} from '@kujolang/kujo-runtime';
import {resolve} from 'node:path';
import {verifyLifecycleDelivery} from './lifecycle-acceptance.mjs';
if(!process.env.WATCHDOG_TEST_SOURCE)throw Error('Set WATCHDOG_TEST_SOURCE to a canonical Watchdog checkout.');
console.log(JSON.stringify(await verifyLifecycleDelivery(resolveKujoBinary(),resolve(process.env.WATCHDOG_TEST_SOURCE))));
