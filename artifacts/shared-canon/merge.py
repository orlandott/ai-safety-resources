#!/usr/bin/env python3
"""Merge per-course reading-list JSON files into one cross-course paper index.

Reads every scratchpad/data/*.json (single-course files with {"course", "sessions": [...]}
or multi-course files with {"courses": [...]}) and emits merged.json:
papers keyed by identity (arXiv ID when available, else normalized title),
each carrying the list of courses that assign it.
"""
import json
import pathlib
import re
import unicodedata

DATA = pathlib.Path(__file__).parent / "data"
OUT = pathlib.Path(__file__).parent / "merged.json"

# Alternate-URL fingerprints that identify the same work as an arXiv ID would.
# transformer-circuits.pub / distill.pub pieces have stable URLs; use the path.
URL_ID_HOSTS = ("transformer-circuits.pub", "distill.pub", "functions.baulab.info")


def norm_title(t: str) -> str:
    t = unicodedata.normalize("NFKD", t)
    t = t.lower()
    # Drop parenthesized nicknames: "…(DCGAN)" / "…(AlphaZero)"
    t = re.sub(r"\([^)]*\)", " ", t)
    # Drop subtitle after colon/question mark only if the head is long enough
    # to be distinctive ("Can we scale human feedback for complex AI tasks? An
    # intro..." should match the same article cited without its subtitle).
    head = re.split(r"[:?]", t)[0].strip()
    if len(head) >= 25:
        t = head
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def arxiv_id(reading: dict) -> str | None:
    a = reading.get("arxiv")
    if a:
        m = re.search(r"(\d{4}\.\d{4,5})", str(a))
        if m:
            return m.group(1)
    url = reading.get("url") or ""
    m = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})", url)
    if m:
        return m.group(1)
    return None


def url_id(reading: dict) -> str | None:
    url = (reading.get("url") or "").rstrip("/")
    for host in URL_ID_HOSTS:
        if host in url:
            path = url.split(host, 1)[1]
            path = re.sub(r"/index\.html$", "", path)
            return f"{host}{path}"
    return None


# Lens Academy is a multi-course platform; its column aggregates only the
# first-party published AI-safety courses. Excluded: EA Introductory Program
# (EA Handbook, not AI safety), Facilitator Training (pedagogy), partner-run
# curricula (AI Safety Atlas, AFFINE), and AI Futurism (in the repo but no
# public course page).
LENS_INCLUDE_PREFIXES = (
    "AI Risk Fundamentals",
    "Navigating Superintelligence",
    "Forecasting, Modeling, and Shaping AI Futures",
    "AI-safety plans",
    "Verifying International AI Agreements",
)


def iter_courses(payload: dict):
    if payload.get("course") == "Lens Academy":
        kept = []
        for s in payload.get("sessions", []):
            sub = s.get("course", "")
            if any(sub.startswith(p) for p in LENS_INCLUDE_PREFIXES):
                kept.append(s)
        yield dict(payload, sessions=kept)
    elif "courses" in payload:
        yield from payload["courses"]
    else:
        yield payload


def main():
    papers: dict[str, dict] = {}
    title_index: dict[str, str] = {}  # norm title -> key already in papers
    courses_seen = []

    for path in sorted(DATA.glob("*.json")):
        payload = json.loads(path.read_text())
        for course in iter_courses(payload):
            cname = course["course"]
            if cname not in courses_seen:
                courses_seen.append(cname)
            for sess in course.get("sessions", []):
                for r in sess.get("readings", []):
                    key = arxiv_id(r) or url_id(r)
                    nt = norm_title(r.get("title", ""))
                    if not key:
                        key = title_index.get(nt, f"title:{nt}")
                    elif nt in title_index and title_index[nt] != key:
                        # Same title already stored under another key (e.g. one
                        # course linked arXiv, another linked a PDF) — unify.
                        key = title_index[nt]
                    title_index.setdefault(nt, key)

                    p = papers.setdefault(key, {
                        "key": key,
                        "title": r.get("title", ""),
                        "authors": r.get("authors"),
                        "year": r.get("year"),
                        "url": r.get("url"),
                        "arxiv": arxiv_id(r),
                        "type": r.get("type"),
                        "courses": {},
                    })
                    # Prefer arXiv URL + shortest clean title + any non-null fields
                    if r.get("year") and not p["year"]:
                        p["year"] = r["year"]
                    if r.get("authors") and not p["authors"]:
                        p["authors"] = r["authors"]
                    # An entry any course records as a paper is a paper (e.g.
                    # AISES lists arXiv:2306.12001 as a textbook chapter).
                    if r.get("type") == "paper":
                        p["type"] = "paper"
                    if p["arxiv"] and "arxiv.org" not in (p["url"] or "") and arxiv_id(r):
                        p["url"] = f"https://arxiv.org/abs/{p['arxiv']}"
                    entry = p["courses"].setdefault(cname, {
                        "core": False, "sessions": []})
                    if r.get("core"):
                        entry["core"] = True
                    label = f"{sess.get('n', '?')}: {sess.get('title', '')[:60]}"
                    if label not in entry["sessions"]:
                        entry["sessions"].append(label)

    out = {
        "courses": courses_seen,
        "papers": sorted(
            (dict(p, courses=p["courses"], count=len(p["courses"]))
             for p in papers.values()),
            key=lambda p: (-p["count"], p["title"].lower()),
        ),
    }
    OUT.write_text(json.dumps(out, indent=1))
    shared = [p for p in out["papers"] if p["count"] >= 2]
    print(f"courses: {courses_seen}")
    print(f"total distinct works: {len(out['papers'])}; shared by >=2 courses: {len(shared)}")
    for p in shared[:25]:
        print(f"  {p['count']}x  {p['title'][:70]}  [{', '.join(p['courses'])}]")


if __name__ == "__main__":
    main()
