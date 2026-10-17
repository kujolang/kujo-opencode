"""Real owned-terminal checks, run on each matrix OS before OpenCode acceptance."""
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from terminal_transport import Terminal


class TerminalContract(unittest.TestCase):
    def until(self, terminal, text, timeout=10):
        output = ''
        deadline = time.monotonic()+timeout
        while time.monotonic() < deadline:
            output += terminal.read(.1)
            if text in output:
                return output
        self.fail('Terminal did not render expected fixture output')

    def test_real_input_unicode_dimensions_and_owned_cleanup(self):
        with tempfile.TemporaryDirectory(prefix='kujo terminal ') as directory:
            script = Path(directory)/'terminal fixture.py'
            script.write_text("import os, json\nprint(json.dumps({'size': list(os.get_terminal_size()), 'tty': os.isatty(0)}), flush=True)\nprint('READY', flush=True)\nvalue=input()\nprint('ECHO:'+value, flush=True)\ninput()\n", encoding='utf-8')
            terminal = Terminal([sys.executable, '-u', '-X', 'utf8', str(script)], directory,
                                dict(os.environ, PYTHONIOENCODING='utf-8'), rows=24, columns=80)
            try:
                output = self.until(terminal, 'READY')
                # ConPTY may add cursor/color sequences; locate the JSON payload.
                start = output.index('{')
                report, _ = json.JSONDecoder().raw_decode(output[start:])
                self.assertEqual(report, {'size': [80, 24], 'tty': True})
                terminal.write('Kujo café 界\r')
                self.assertIn('ECHO:Kujo café 界', self.until(terminal, 'ECHO:Kujo café 界'))
                before = time.monotonic()
            finally:
                terminal.close()
            self.assertLess(time.monotonic()-before, 7)
            terminal.close()
            with self.assertRaises(RuntimeError):
                terminal.read()

    def test_idle_read_is_bounded(self):
        terminal = Terminal([sys.executable, '-u', '-c', 'import time; time.sleep(30)'],
                            os.getcwd(), dict(os.environ))
        try:
            before = time.monotonic()
            terminal.read(.1)  # ConPTY startup control sequences are permitted.
            self.assertLess(time.monotonic()-before, 2)
        finally:
            terminal.close()

    def test_early_exit_is_reported_without_waiting_forever(self):
        terminal = Terminal([sys.executable, '-c', 'raise SystemExit(3)'],
                            os.getcwd(), dict(os.environ))
        try:
            deadline = time.monotonic()+10
            with self.assertRaises(RuntimeError):
                while time.monotonic() < deadline:
                    terminal.read(.1)
        finally:
            terminal.close()


if __name__ == '__main__':
    unittest.main()
