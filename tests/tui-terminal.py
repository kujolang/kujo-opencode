#!/usr/bin/env python3
"""Real OpenCode PTY acceptance; no mocked dialogs or standing grants.
Default and --ledger modes do not request inference.
--ledger explicitly approves only this disposable fixture’s profile/start/finish.
--automatic sends a real prompt using the visible OpenCode free model; --ship
also requires a successful scoped specialist receipt.
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
parser.add_argument('--ship', action='store_true', help='With --automatic, execute a real Ship specialist scan')
mode=parser.add_mutually_exclusive_group()
mode.add_argument('--ledger', action='store_true', help='Approve fixture-only profile/start/finish operations through the rendered UI')
mode.add_argument('--automatic', action='store_true', help='Exercise the automatic popup with the visible GLM-5.3-Flash Free model')
args = parser.parse_args()
if args.ship and not args.automatic:
    parser.error('--ship requires --automatic')
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
    choose('External services', 'Application gateway', 'service-picker')
    choose('Leash', 'Leash configuration', 'leash-configuration')
    wait('connection not checked', 'leash-configuration')
    wait('human decision', 'leash-guidance')
    send('\x1b')
    menu()
    choose('External services', 'Application gateway', 'service-picker')
    choose('Application gateway', 'Application gateway configuration', 'gateway-configuration')
    wait('connection not checked', 'gateway-configuration')
    wait('remain separate', 'gateway-guidance')
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
    if args.ledger or args.automatic:
        def allow(name):
            wait('Allow once', name)
            assert choice_style('Allow once')==selected and choice_style('Reject')!=selected, 'Allow once must be visibly selected before Enter'
            send('\r')
        def record():
            files=list(project.glob('.kujo/opencode-runledger/*/runs/*.json'))
            assert len(files)==1, 'Expected exactly one canonical session record'
            return json.loads(files[0].read_text())
        send('\x1b')
        menu()
        choose('Choose a profile', 'Choose Kujo capabilities', 'ship-profile')
        choose('Ship', 'Allow once', 'ship-approval')
        allow('ship-approval')
        wait('tools ready', 'ship-active')
        assert json.loads((project/'.kujo/opencode.json').read_text())['profile']=='kujo.profile.ship'
        if args.automatic:
            if args.ship:
                menu()
                choose('Choose a specialist', 'Ship readiness', 'specialist-picker')
                choose('Ship readiness', 'Ship readiness selected', 'specialist-selected')
            menu()
            choose('Lifecycle delivery', 'Enable automatic tracking', 'automatic-controls')
            choose('Enable automatic tracking', 'Allow once', 'automatic-enable-permission')
            allow('automatic-enable-permission')
            wait('Lifecycle delivery', 'automatic-enabled')
            assert json.loads((project/'.kujo/opencode.json').read_text())['lifecycle']['runledger'] is True
            send('\x1b')
            wait('GLM-5.3-Flash Free', 'automatic-visible-model')
            assert any('GLM-5.3-Flash Free' in line and 'OpenCode' in line for line in screen.display), 'Only the visible OpenCode free model is permitted for this gate'
            send('Use kujo_shipcheck_scan exactly once with {"path":"."}. Do not use shell or other tools. Report the receipt ID.' if args.ship else 'Reply OK. Do not use tools.')
            send('\r')
            wait('kujo.runledger.session', 'automatic-start-permission', seconds=60)
            assert not list(project.glob('.kujo/opencode-runledger/*/runs/*.json'))
            allow('automatic-start-permission')
            wait('Review this tracked attempt', 'automatic-completion', seconds=90)
            assert record()['status']=='in_progress'
            if args.ship:
                receipts=[json.loads(line) for line in (root/'kujo/receipts.jsonl').read_text().splitlines() if line.strip()]
                scans=[r for r in receipts if r.get('ability_id')=='kujo.shipcheck.repository.scan' and r.get('status')=='succeeded' and r.get('metadata',{}).get('agent_id')=='kujo-ship']
                (root/'specialist-evidence.json').write_text(json.dumps(scans,indent=2))
                assert scans, 'Ship specialist did not produce a successful native scan receipt'
            choose('Choose a verdict and finish', 'Your verdict for this session', 'automatic-verdict')
        else:
            menu()
            choose('Session RunLedger', 'Start tracking this session', 'ledger-start-menu')
            choose('Start tracking', 'Allow once', 'ledger-start-permission')
            assert not list(project.glob('.kujo/opencode-runledger/*/runs/*.json')), 'No record before human approval'
            allow('ledger-start-permission')
            wait('Status: in progress', 'ledger-start-result')
            wait('Use Record location', 'ledger-start-result')
            assert record()['status']=='in_progress'
            send('\x1b')
            menu()
            choose('Session RunLedger', 'Finish this session run', 'ledger-finish-menu')
            choose('Finish this session run', 'Your verdict for this session', 'human-verdict')
        choose('Partial', 'Allow once', 'ledger-finish-permission')
        assert record()['status']=='in_progress', 'Choosing a verdict alone must not finalize'
        allow('ledger-finish-permission')
        wait('Status: partial', 'ledger-finished')
        wait('Use Record location', 'ledger-finished')
        assert record()['status']=='partial'
        assert record()['prompt_file'] is None
        send('\x1b')
        menu()
        choose('Session RunLedger', 'Record location', 'finished-record-menu')
        choose('Record location', 'Canonical RunLedger record', 'record-location')
        wait('.json', 'record-location')
    result = dict(ok=True, host=version, dimensions=[args.columns,args.rows], root=str(root), initial_requested_session=session, model_call=args.automatic, effects_approved=args.ledger or args.automatic, rendered_ledger=args.ledger, rendered_automatic_completion=args.automatic, live_ship_specialist=args.ship)
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
