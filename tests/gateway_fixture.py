"""Private canonical CMS fixture for rendered gateway approval acceptance."""
import atexit
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import time
import urllib.request

class GatewayFixture:
    def __init__(self, root, source, repo):
        self.root=Path(root)/'gateway'
        self.root.mkdir()
        self.process=None
        atexit.register(self.close)
        self.source=Path(source).resolve()
        binary=subprocess.check_output(['node','--input-type=module','-e',"import {resolveKujoBinary} from '@kujolang/kujo-runtime';console.log(resolveKujoBinary())"],cwd=repo,text=True).strip()
        self.provenance={'source_commit':subprocess.check_output(['git','-C',str(self.source),'rev-parse','HEAD'],text=True).strip(),'runtime_sha256':hashlib.sha256(Path(binary).read_bytes()).hexdigest()}
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0))
            port=sock.getsockname()[1]
        self.origin=f'http://127.0.0.1:{port}'
        self.token=secrets.token_hex(32)
        env={k:v for k,v in os.environ.items() if not k.startswith('CMS_')}
        env.update(CMS_API_HOST='127.0.0.1',CMS_API_PORT=str(port),CMS_API_TOKEN=self.token,CMS_ALLOW_BOOTSTRAP_TOKEN='true',CMS_ENFORCE_BOOTSTRAP_TOKEN_ROTATION='false',CMS_DB_PATH=str(self.root/'cms.db'),CMS_SITE_URL=self.origin,CMS_EXTENSION_INBOX_DIR=str(self.root/'extensions-inbox'),CMS_EXTENSION_STORE_DIR=str(self.root/'extensions'),CMS_MEDIA_INBOX_DIR=str(self.root/'media-inbox'),CMS_MEDIA_STORE_DIR=str(self.root/'media'))
        self.process=subprocess.Popen([binary,'run','--interpreter','backend/runtime/main.kujo'],cwd=self.source,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(200):
            if self.process.poll() is not None:
                raise RuntimeError('Private CMS stopped during setup')
            try:
                self.request('/health')
                break
            except (OSError,TimeoutError):
                time.sleep(.1)
        else:
            raise RuntimeError('Private CMS did not become healthy')
        self.api('/v1/content-types',{'type_key':'fixture','label':'Fixture','singular_label':'Fixture'})
        entry=self.api('/v1/entries',{'content_type_key':'fixture','title':'Private rendered gateway fixture','slug':'private-rendered-gateway','status':'draft','body':'Acceptance only'})
        self.seo_path=f"/v1/entries/{entry['id']}/seo"
        self.before=self.state()
        # The canonical adapter validates the descriptor and creates an application
        # approval-required receipt. No mutation can happen at this stage.
        script="""import {listGateway,callGateway} from './lib/gateway.mjs';
const list=await listGateway();const tool=list.tools.find(t=>t.execution==='/v1/abilities/seo/update-entry/run');
if(!tool)throw Error('Missing fixture mutation descriptor');
const input={origin:list.origin,tool,input:{entry_id:JSON.parse(process.env.KUJO_FIXTURE_ENTRY),changes:{title:'Rendered gateway approved'},confirmed:true},invocation_id:'rendered-gateway-fixture',idempotency_key:'rendered-gateway-fixture-key'};
try{await callGateway(input);throw Error('Mutation did not require application approval');}catch(e){if(e.code!=='gateway_execution_incomplete'||e.details?.receipt?.status!=='approval_required')throw e;}
console.log(JSON.stringify(input));"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=repo,env=dict({k:v for k,v in os.environ.items() if not k.startswith('KUJO_ABILITY_GATEWAY_')},KUJO_ABILITY_GATEWAY_URL=self.origin,KUJO_ABILITY_GATEWAY_TOKEN=self.token,KUJO_FIXTURE_ENTRY=str(entry['id'])),text=True,capture_output=True,timeout=45)
        if result.returncode:
            raise RuntimeError('Canonical CMS approval-required preparation failed')
        self.input=json.loads(result.stdout)
        assert self.state()==self.before
        # The test controller grants only this private application's invocation.
        # OpenCode must still obtain a separate native approval before execution.
        grant=self.api('/v1/abilities/seo/update-entry/approvals',{'invocation_id':self.input['invocation_id']})
        self.input['approval_id']=grant['approval_id']
        assert self.state()==self.before
    def request(self,path,body=None):
        request=urllib.request.Request(self.origin+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=10) as response:
            return json.load(response)
    def api(self,path,body=None):
        return self.request(path,body)['data']
    def state(self):
        return self.api(self.seo_path)
    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
