#!/usr/bin/env python3
"""Rebuild shared-canon.html from the course data files.

Pipeline: merge.py (data/*.json -> merged.json) -> build_data.py (-> payload.json)
-> inject payload into page.template.html -> shared-canon.html.
Run from this directory: python3 build.py
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent

subprocess.run([sys.executable, HERE / "merge.py"], check=True)
subprocess.run([sys.executable, HERE / "build_data.py"], check=True)

template = (HERE / "page.template.html").read_text()
payload = (HERE / "payload.json").read_text().replace("</", "<\\/")
html = template.replace("__PAYLOAD__", payload).replace(
    "__DATE__", "from syllabus snapshots taken August 21, 2026")
(HERE / "shared-canon.html").write_text(html)
print(f"built shared-canon.html ({len(html) // 1024} KB)")
