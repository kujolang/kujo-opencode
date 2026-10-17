"""Owned terminal transport for rendered acceptance, with bounded reads/cleanup.
Windows uses pywinpty 3.0.5's ConPTY API; POSIX uses the native pty module.
This module never attaches to an existing terminal or shared OpenCode server.
"""
import codecs
import os
import queue
import select
import signal
import threading
import time


class Terminal:
    def __init__(self, argv, cwd, env, rows=24, columns=80):
        self.closed = False
        self.backend = 'conpty' if os.name == 'nt' else 'posix'
        self.decoder = codecs.getincrementaldecoder('utf8')('replace')
        if os.name == 'nt':
            from winpty import PtyProcess
            # String '0' forces ConPTY even when PYWINPTY_BACKEND is inherited:
            # upstream spawn uses `backend or environment` before int conversion.
            self.process = PtyProcess.spawn(argv, cwd=str(cwd), env=env,
                                            dimensions=(rows, columns), backend='0')
            self.pending = queue.Queue(maxsize=128)
            self.stopping = threading.Event()
            self.reader = threading.Thread(target=self._read_windows, daemon=True)
            self.reader.start()
        else:
            import fcntl
            import pty
            import struct
            import termios
            self.pid, self.fd = pty.fork()
            if self.pid == 0:
                try:
                    os.chdir(cwd)
                    os.execvpe(argv[0], argv, env)
                finally:
                    os._exit(127)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ,
                        struct.pack('HHHH', rows, columns, 0, 0))

    def _read_windows(self):
        while not self.stopping.is_set():
            try:
                value = self.process.read(65536)
            except (EOFError, OSError) as error:
                value = error
            while not self.stopping.is_set():
                try:
                    self.pending.put(value, timeout=.1)
                    break
                except queue.Full:
                    pass
            if isinstance(value, BaseException):
                break

    def read(self, timeout=.1):
        if self.closed:
            raise RuntimeError('Terminal is closed')
        if self.backend == 'conpty':
            try:
                value = self.pending.get(timeout=max(0, timeout))
            except queue.Empty:
                # Query the native child without changing PtyProcess.closed; its
                # close() must still release reader sockets after child exit.
                if not self.process.pty.isalive():
                    raise RuntimeError('Terminal exited before acceptance')
                return ''
            if isinstance(value, BaseException):
                raise RuntimeError('Terminal closed before acceptance') from value
            return value
        ready, _, _ = select.select([self.fd], [], [], max(0, timeout))
        if not ready:
            return ''
        try:
            data = os.read(self.fd, 65536)
        except OSError as error:
            raise RuntimeError('Terminal exited before acceptance') from error
        if not data:
            raise RuntimeError('Terminal closed before acceptance')
        return self.decoder.decode(data)

    def write(self, text):
        if self.closed:
            raise RuntimeError('Terminal is closed')
        if self.backend == 'conpty':
            self.process.write(text)
        else:
            data = text.encode('utf-8')
            while data:
                data = data[os.write(self.fd, data):]

    def close(self):
        if self.closed:
            return
        self.closed = True
        if self.backend == 'conpty':
            self.stopping.set()
            try:
                self.process.close(force=True)
            finally:
                self.reader.join(timeout=1)
            return
        try:
            try:
                os.kill(self.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            deadline = time.monotonic()+5
            while time.monotonic() < deadline:
                if os.waitpid(self.pid, os.WNOHANG)[0]:
                    break
                time.sleep(.1)
            else:
                os.kill(self.pid, signal.SIGKILL)
                os.waitpid(self.pid, 0)
        finally:
            os.close(self.fd)
