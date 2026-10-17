#!/usr/bin/env python3
"""Real OpenCode PTY acceptance; no mocked dialogs, inference or auto-approval.
Requires the optional pinned tests/requirements-tui.txt environment (POSIX only).
"""
import argparse
import codecs
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import signal
import struct
import subprocess
import termios
import time
import tempfile
import uuid
import pyte

parser = argparse.ArgumentParser()
parser.add_argument('--host', default=os.environ.get('OPENCODE_BIN', 'opencode'))
parser.add_argument('--columns', type=int, default=80)
parser.add_argument('--rows', type=int, default=24)
args = parser.parse_args()
if args.columns < 80 or args.rows < 24:
    parser.error('Acceptance dimensions must be at least 80x24')
repo = Path(__file__).resolve().parent.parent
root = Path(tempfile.mkdtemp(prefix='kujo-rendered-tui-'))
project = root / 'project'
project.mkdir()
(project / 'README.md').write_text('# Terminal acceptance fixture\n')
subprocess.run(['git', 'init', '-q', str(project)], check=True)
env = dict(os.environ, KUJO_OPENCODE_HOME=str(root / 'kujo'), TERM='xterm-256color')
subprocess.run(['node', str(repo / 'bin/kujo-opencode.mjs'), 'setup', '--project', str(project), '--source-root', str(repo.parent), '--json'], env=env, check=True, stdout=subprocess.DEVNULL)
version = subprocess.check_output([args.host, '--version'], text=True).strip()
session = 'ses_kujo_terminal_' + uuid.uuid4().hex
screen = pyte.Screen(args.columns, args.rows)
stream = pyte.Stream(screen)
decoder = codecs.getincrementaldecoder('utf8')('replace')
pid, fd = pty.fork()
if pid == 0:
    os.chdir(project)
    # setup embeds the fixture data root; do not override the host globally.
    env.pop('KUJO_OPENCODE_HOME', None)
    os.execvpe(args.host, [args.host, '--standalone', '--session', session], env)
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', args.rows, args.columns, 0, 0))

def current():
    return '\n'.join(screen.display)

def pump(seconds=.2):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        ready, _, _ = select.select([fd], [], [], min(.1, max(0, deadline-time.monotonic())))
        if ready:
            try:
                data = os.read(fd, 65536)
            except OSError:
                raise RuntimeError('OpenCode terminal exited before acceptance')
            if not data:
                raise RuntimeError('OpenCode terminal closed')
            stream.feed(decoder.decode(data))

def wait(text, name, seconds=30):
    deadline = time.monotonic()+seconds
    while time.monotonic()<deadline:
        pump()
        if text in current():
            (root / (name+'.txt')).write_text(current())
            return
    (root / 'failure.txt').write_text(current())
    raise AssertionError(f'{text!r} not rendered; see {root}/failure.txt')

def send(text):
    os.write(fd, text.encode())
    pump(.35)

def menu():
    send('/kujo')
    wait('Open Kujo', 'slash-discovery')
    send('\r')
    wait('Status and capabilities', 'menu')

def choose(query, expected, name):
    send(query)
    pump(.25)
    send('\r')
    wait(expected, name)

try:
    wait('commands', 'session')
    menu()
    choose('Status and capabilities', 'Installation details', 'status')
    choose('Installation details', 'Kujo installation', 'installation')
    send('\x1b')
    menu()
    choose('Choose a profile', 'Create a project session', 'onboarding')
    send('\r')
    wait('Choose Kujo capabilities', 'profiles')
    choose('Review', 'Allow once', 'profile-permission')
    def choice_style(label):
        for row, line in enumerate(screen.display):
            if label in line:
                cell=screen.buffer[row][line.index(label)]
                return [cell.fg,cell.bg,cell.reverse,cell.bold]
        raise AssertionError('Permission choice disappeared')
    selected=choice_style('Allow once')
    send('\x1b[C')
    pump(.5)
    focus={'initial_selected':selected,'allow':choice_style('Allow once'),'reject':choice_style('Reject')}
    (root/'permission-focus.json').write_text(json.dumps(focus))
    assert focus['reject']==selected and focus['allow']!=selected, 'Reject must be visibly selected before Enter'
    send('\r')
    wait('Kujo needs attention', 'profile-denied')
    assert json.loads((project/'.kujo/opencode.json').read_text())['profile']=='kujo.profile.essentials'
    send('\x1b')
    menu()
    choose('Manage individual capabilities', 'From profile', 'capabilities')
    send('\x1b')
    menu()
    choose('Browser readiness', 'Check readiness again', 'browser')
    send('\x1b')
    menu()
    choose('Session RunLedger', 'Start tracking this session', 'runledger')
    send('\x1b')
    menu()
    choose('Lifecycle delivery', 'Enable automatic tracking', 'lifecycle')
    send('\x1b')
    menu()
    choose('Evidence history', 'Kujo evidence scope', 'evidence-scope')
    choose('This session', 'No receipts in this scope', 'empty-evidence')
    result = dict(ok=True, host=version, dimensions=[args.columns,args.rows], root=str(root), initial_requested_session=session, model_call=False, effects_approved=False)
    (root/'verification.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result))
finally:
    # Only the owned standalone terminal is stopped; never touch a user server.
    try:
        os.write(fd, b'\x03\x03')
        pump(.3)
    except (OSError, RuntimeError):
        pass
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if os.waitpid(pid, os.WNOHANG)[0]:
            break
        time.sleep(.1)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(fd)
