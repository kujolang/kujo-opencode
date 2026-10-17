import test from 'node:test';import assert from 'node:assert/strict';
import {hostPackage} from '../scripts/install-test-host.mjs';
test('matrix selects exact v2 official native packages and portable x64 baseline builds',()=>{
 for(const platform of ['darwin','linux','win32'])for(const arch of ['x64','arm64'])assert.equal(hostPackage('2.0.32',platform,arch),`@opencode/cli-${platform==='win32'?'windows':platform}-${arch}${arch==='x64'?'-baseline':''}@2.0.32`);
 for(const version of ['latest','1.19.3','2.0.32;echo secret','2.0.32\n','../2.0.32'])assert.throws(()=>hostPackage(version,'linux','x64'));
 assert.throws(()=>hostPackage('2.0.32','freebsd','x64'));assert.throws(()=>hostPackage('2.0.32','linux','ia32'));
});
