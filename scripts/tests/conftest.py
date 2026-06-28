"""Pytest conftest: add scripts directory to sys.path so imports resolve."""
import os, sys

_SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
    print(f"DEBUG conftest: added {_SCRIPTS_DIR} to sys.path", file=sys.stderr)