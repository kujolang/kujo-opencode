"""Disposable canonical daemon for terminal acceptance; no notification providers."""
import atexit
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import time
import urllib.request

class LeashFixture:
    def __init__(self, root, binary):
        self.root=Path(root)/'leash'
        self.root.mkdir()
        self.process=None
        self.config=self.root/'config.yml'
        atexit.register(self.close)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0))
            port=sock.getsockname()[1]
        self.origin=f'http://127.0.0.1:{port}'
        self.token=secrets.token_hex(32)
        cfg={'machine':{'name':'OpenCode fixture','id':'fixture'},'bind':{'host':'127.0.0.1','port':port},'auth':{'token':self.token,'jwt_secret':secrets.token_hex(32)},'storage':{'db_path':str(self.root/'leash.db')},'logging':{'audit_log_path':str(self.root/'audit.jsonl')},'notifications':{'fcm':{'enabled':False},'chatops':{'enabled':False,'dispatch_bridge':{'enabled':False}}}}
        with os.fdopen(os.open(self.config,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600),'w') as out:
            json.dump(cfg,out)
        self.process=subprocess.Popen([str(Path(binary).resolve()),str(self.config)],cwd=self.root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            if self.process.poll() is not None:
                raise RuntimeError('Private Leash daemon stopped during setup')
            try:
                self.request('/health')
                break
            except (OSError,TimeoutError):
                time.sleep(.1)
        else:
            raise RuntimeError('Private Leash daemon did not become healthy')
        self.token=self.request('/devices/register',{'name':'opencode-terminal-fixture'})['token']
    def request(self,path,body=None):
        request=urllib.request.Request(self.origin+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=3) as response:
            return json.load(response)
    def events(self):
        return self.request('/events')['events']
    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.config.unlink(missing_ok=True)
