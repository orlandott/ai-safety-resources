#!/usr/bin/env python3
"""Build the compact JSON payload embedded in the artifact page.

Reads merged.json (+ citations.json when present) and writes payload.json:
{ courses: [{id, name, provider, url, papers, readings}],
  works: [{t, a, y, u, x, k, n, cite, c: {courseId: 2|1}}] }   2=core, 1=optional
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).parent

COURSES = [
    {"id": "agisf", "name": "AI Alignment (AGI Safety Fundamentals)", "short": "AGI-SF",
     "provider": "BlueDot Impact", "url": "https://bluedot.org/courses/alignment",
     "match": "AGI Safety Fundamentals"},
    {"id": "tais", "name": "Technical AI Safety", "short": "BlueDot TAIS",
     "provider": "BlueDot Impact", "url": "https://bluedot.org/courses/technical-ai-safety",
     "match": "BlueDot Technical AI Safety"},
    {"id": "arena", "name": "ARENA", "short": "ARENA",
     "provider": "ARENA", "url": "https://www.arena.education/",
     "match": "ARENA"},
    {"id": "mls", "name": "Intro to ML Safety", "short": "Intro ML Safety",
     "provider": "Center for AI Safety", "url": "https://course.mlsafety.org/",
     "match": "Intro to ML Safety"},
    {"id": "aises", "name": "AI Safety, Ethics & Society", "short": "AISES",
     "provider": "Center for AI Safety", "url": "https://www.aisafetybook.com/virtual-course",
     "match": "AI Safety, Ethics & Society"},
    {"id": "lens", "name": "Lens Academy", "short": "Lens Academy",
     "provider": "Lens Academy", "url": "https://lensacademy.org/",
     "match": "Lens Academy"},
]
MATCH = {c["match"]: c["id"] for c in COURSES}


def short_authors(a):
    if not a:
        return None
    a = re.sub(r"\([^)]*\)", "", a).strip().strip(",")
    multiple = bool(re.search(r",| and | & |et al", a))
    first = re.split(r",| and | & ", a)[0].strip()
    first = re.sub(r"\s*et al\.?$", "", first).strip()
    return f"{first} et al." if multiple else first


def main():
    merged = json.loads((HERE / "merged.json").read_text())
    cites = {}
    cpath = HERE / "citations.json"
    if cpath.exists():
        data = json.loads(cpath.read_text())
        for e in data.get("counts", []):
            if e.get("citations") is None:
                continue
            if e.get("arxiv"):
                cites[e["arxiv"]] = e["citations"]
            cites[e["title"].lower()] = e["citations"]

    works = []
    for p in merged["papers"]:
        cmap = {}
        for cname, entry in p["courses"].items():
            cid = MATCH.get(cname)
            if cid:
                cmap[cid] = 2 if entry.get("core") else 1
        if not cmap:
            continue  # readings only in the no-paper-syllabus courses
        cite = None
        if p.get("arxiv") and p["arxiv"] in cites:
            cite = cites[p["arxiv"]]
        elif p["title"].lower() in cites:
            cite = cites[p["title"].lower()]
        works.append({
            "t": p["title"],
            "a": short_authors(p.get("authors")),
            "y": p.get("year"),
            "u": p.get("url"),
            "x": p.get("arxiv"),
            "k": p.get("type") or "other",
            "n": len(cmap),
            "cite": cite,
            "c": cmap,
        })

    for c in COURSES:
        c["readings"] = sum(1 for w in works if c["id"] in w["c"])
        c["papers"] = sum(1 for w in works if c["id"] in w["c"] and w["k"] == "paper")
        c.pop("match", None)

    payload = {"courses": COURSES, "works": works,
               "generated": "2026-08-21"}
    (HERE / "payload.json").write_text(json.dumps(payload, separators=(",", ":")))
    shared = [w for w in works if w["n"] >= 2]
    shared_papers = [w for w in shared if w["k"] == "paper"]
    print(f"works: {len(works)}, shared: {len(shared)}, shared papers: {len(shared_papers)}")
    print(f"payload size: {(HERE/'payload.json').stat().st_size/1024:.0f} KB")
    print("with citations:", sum(1 for w in works if w['cite'] is not None))


if __name__ == "__main__":
    main()
