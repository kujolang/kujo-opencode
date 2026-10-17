#!/usr/bin/env python3
"""Bind an accepted terminal fixture to immutable npm payload bytes (read-only)."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import tarfile

parser=argparse.ArgumentParser()
parser.add_argument('--tarball',required=True)
parser.add_argument('--fixture',required=True)
parser.add_argument('--host',required=True)
args=parser.parse_args()
root=Path(args.fixture).resolve()
archive=Path(args.tarball).resolve()
accepted=json.loads((root/'verification.json').read_text())
assert accepted['ok'] is True, 'Only accepted fixtures can establish candidate evidence'
installation=json.loads((root/'kujo/installation.json').read_text())
projection=Path(installation['projection_root']).resolve()
assert projection.is_relative_to(root), 'Projection must be owned by this fixture'
host=Path(args.host).resolve()
assert subprocess.check_output([str(host),'--version'],text=True).strip()==accepted['host']
sha=lambda value: hashlib.sha256(value).hexdigest()
files={}
with tarfile.open(archive,'r:gz') as tar:
    for member in tar.getmembers():
        if not member.name.startswith('package/') or member.isdir():
            continue
        relative=member.name[len('package/'):]
        top=relative.split('/')[0]
        if top not in ['bin','lib','catalog','assets','.generated','package.json','README.md','SECURITY.md','LICENSE']:
            continue
        assert member.isfile(), 'Candidate payload must contain regular files'
        target=(projection/relative).resolve()
        assert target.is_relative_to(projection), 'Payload path escapes the projection'
        expected=tar.extractfile(member).read()
        actual=target.read_bytes()
        assert actual==expected, f'Installed payload differs from the candidate: {relative}'
        files[relative]=sha(actual)
assert len(files)>=20, 'Candidate payload unexpectedly incomplete'
binary=projection/'native'/('kujo.exe' if platform.system()=='Windows' else 'kujo')
proof={'ok':True,'fixture':str(root),'tarball':str(archive),'tarball_sha256':sha(archive.read_bytes()),'host':accepted['host'],'host_sha256':sha(host.read_bytes()),'platform':platform.platform(),'runtime_sha256':sha(binary.read_bytes()),'payload_files_verified':len(files),'payload_manifest_sha256':sha(json.dumps(files,sort_keys=True,separators=(',',':')).encode()),'rendered_gateway':accepted.get('rendered_gateway',False),'rendered_leash':accepted.get('rendered_leash',False)}
(root/'candidate-verification.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
