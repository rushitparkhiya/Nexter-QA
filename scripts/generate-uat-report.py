#!/usr/bin/env python3
"""
Orbit — UAT HTML Report Generator
Reads screenshots + videos from a flow test run and generates a self-contained HTML report.
All media embedded as base64 — one file, no external dependencies.

Usage:
  python3 scripts/generate-uat-report.py --snaps reports/screenshots/flows-compare --videos reports/videos --out reports/my-report.html

Called automatically by: scripts/generate-uat-report.sh
Also called by gauntlet.sh after flow tests.

Report structure (auto-detected from file naming convention):
  Screenshots: {plugin-prefix}-{NN}-{slug}.png  e.g. nxt-01-dashboard.png, rm-03-settings.png
  Videos:      {plugin-prefix}-{NN}-{slug}.webm e.g. nxt-01-discovery.webm, rm-03-settings.webm
"""
import argparse, base64, os, re, json
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--title",  default="UAT Flow Report")
parser.add_argument("--out",    default="reports/uat-report.html")
parser.add_argument("--snaps",  default="reports/screenshots/flows-compare")
parser.add_argument("--videos", default="reports/videos")
parser.add_argument("--data",   default="reports/compare-data.json")
args = parser.parse_args()

SNAP  = args.snaps
VDIR  = args.videos
OUT   = args.out
TITLE = args.title

# ─── Helpers ──────────────────────────────────────────────────────────────────

def b64(path, mime):
    if not os.path.exists(path): return ""
    with open(path,"rb") as f: return f"data:{mime};base64,{base64.b64encode(f.read()).decode()}"

def b64img(name): return b64(os.path.join(SNAP, name), "image/png")
def b64vid(name): return b64(os.path.join(VDIR, name), "video/webm")

def img_tag(name, caption=""):
    src = b64img(name)
    if not src: return f'<div class="no-media">Screenshot not found: {name}</div>'
    return f'<figure><img src="{src}" loading="lazy" onclick="zoom(this)" alt="{caption}"><figcaption>{caption}</figcaption></figure>'

def vid_tag(name, caption=""):
    src = b64vid(name)
    if not src: return f'<div class="no-media">Video not found: {name}</div>'
    return f'<figure class="vf"><video controls preload="metadata" playsinline><source src="{src}" type="video/webm"></video><figcaption>▶ {caption}</figcaption></figure>'

def pair(left_html, right_html, left_label="Plugin A", right_label="Plugin B"):
    return f'''<div class="pair">
  <div class="side sa"><div class="side-lbl">{left_label}</div>{left_html}</div>
  <div class="side sb"><div class="side-lbl">{right_label}</div>{right_html}</div>
</div>'''

def notes_block(items):
    li = "".join(f"<li>{i}</li>" for i in items)
    return f'<div class="notes"><strong>UAT Notes</strong><ul>{li}</ul></div>'

def checklist_block(items):
    """items: list of (status, text) where status is pass/fail/warn"""
    li = ""
    icons = {"pass":"✓","fail":"✗","warn":"⚠"}
    for s,t in items:
        li += f'<li class="c-{s}"><span class="ci">{icons.get(s,"·")}</span><span>{t}</span></li>'
    return f'<ul class="cl">{li}</ul>'

def gap_block(title, priority, body):
    return f'<div class="gap {priority}"><div class="gh"><span class="gt">{title}</span><span class="gp {priority}">{priority.upper()}</span></div><p>{body}</p></div>'

def section(id_, num, title, body):
    return f'''<div class="sec" id="{id_}">
  <div class="sh"><span class="snum">{num}</span><h2>{title}</h2></div>
  {body}
</div>'''

# ─── Auto-discover media ───────────────────────────────────────────────────────

def list_media(directory, ext):
    if not os.path.isdir(directory): return []
    return sorted([f for f in os.listdir(directory) if f.endswith(ext)])

all_imgs  = list_media(SNAP, ".png")
all_vids  = list_media(VDIR, ".webm")

# Group by prefix (nxt-/rm- or first token before dash-number)
def group_by_prefix(files):
    groups = {}
    for f in files:
        m = re.match(r'^([a-z]+)-(\d+)-(.+)\.(png|webm)$', f)
        if m:
            prefix, num, slug, ext = m.groups()
            groups.setdefault(prefix, []).append((int(num), slug, f))
    return {k: sorted(v) for k,v in groups.items()}

img_groups = group_by_prefix(all_imgs)
vid_groups = group_by_prefix(all_vids)

prefixes = sorted(set(list(img_groups.keys()) + list(vid_groups.keys())))
# Detect plugin A / plugin B  (first prefix = A, second = B if two prefixes)
plugin_a = prefixes[0] if len(prefixes) > 0 else "plugin-a"
plugin_b = prefixes[1] if len(prefixes) > 1 else None

label_a = plugin_a.upper().replace("-"," ")
label_b = plugin_b.upper().replace("-"," ") if plugin_b else "Comparison"

# Try to read compare-data.json for real numbers
try:
    with open(args.data) as f: cdata = json.load(f)
except:
    cdata = {}

# ─── CSS ──────────────────────────────────────────────────────────────────────

CSS = """
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#21262d;--bd:#30363d;--t:#e6edf3;--mu:#8b949e;
--g:#3fb950;--r:#f85149;--y:#d29922;--b:#58a6ff;--ca:#9b70e0;--cb:#f07050}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--t);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.65}
a{color:var(--b)}
.hdr{background:linear-gradient(135deg,#1a1f35,#0d1117);border-bottom:1px solid var(--bd);padding:32px 44px}
.hdr h1{font-size:26px;font-weight:700;margin-bottom:6px}
.sub{color:var(--mu);font-size:13px;margin-bottom:12px}
.badges{display:flex;gap:8px;flex-wrap:wrap}
.badge{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700}
.ba{background:rgba(155,112,224,.15);color:var(--ca);border:1px solid var(--ca)}
.bb{background:rgba(240,112,80,.15);color:var(--cb);border:1px solid var(--cb)}
.bi{background:rgba(88,166,255,.1);color:var(--b);border:1px solid rgba(88,166,255,.3)}
.bp{background:rgba(63,185,80,.1);color:var(--g);border:1px solid rgba(63,185,80,.3)}
nav{background:var(--bg2);border-bottom:1px solid var(--bd);padding:0 44px;display:flex;gap:0;overflow-x:auto;position:sticky;top:0;z-index:100}
nav a{padding:12px 14px;font-size:13px;color:var(--mu);text-decoration:none;white-space:nowrap;border-bottom:2px solid transparent;transition:.15s}
nav a:hover{color:var(--t);border-bottom-color:var(--b)}
.wrap{max-width:1380px;margin:0 auto;padding:36px 44px}
.sec{margin-bottom:52px;scroll-margin-top:50px}
.sh{display:flex;align-items:center;gap:10px;margin-bottom:22px;padding-bottom:12px;border-bottom:1px solid var(--bd)}
.snum{background:rgba(88,166,255,.1);color:var(--b);font-size:11px;font-weight:700;padding:3px 9px;border-radius:4px}
.sh h2{font-size:19px;font-weight:700}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.side{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px}
.sa{border-top:2px solid var(--ca)}.sb{border-top:2px solid var(--cb)}
.side-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:3px 8px;border-radius:4px;display:inline-block}
.sa .side-lbl{background:rgba(155,112,224,.15);color:var(--ca)}
.sb .side-lbl{background:rgba(240,112,80,.15);color:var(--cb)}
figure{margin:0}
figure img{width:100%;border-radius:6px;border:1px solid var(--bd);cursor:zoom-in;display:block}
figure img:hover{opacity:.88}
figcaption{font-size:11px;color:var(--mu);margin-top:5px}
.vf video{width:100%;border-radius:6px;border:1px solid var(--bd);background:#000}
.no-media{padding:24px;text-align:center;color:var(--mu);font-size:12px;background:var(--bg3);border-radius:6px}
.notes{background:rgba(88,166,255,.05);border:1px solid rgba(88,166,255,.18);border-radius:8px;padding:14px 18px;margin:14px 0}
.notes strong{font-size:13px;color:var(--b);display:block;margin-bottom:7px}
.notes ul{padding-left:17px}
.notes li{font-size:13px;color:var(--mu);margin-bottom:3px}
.cl{list-style:none;display:flex;flex-direction:column;gap:5px;margin:14px 0}
.cl li{display:flex;align-items:flex-start;gap:9px;font-size:13px;padding:7px 11px;border-radius:6px}
.c-pass{background:rgba(63,185,80,.07)}.c-fail{background:rgba(248,81,73,.07)}.c-warn{background:rgba(210,153,34,.07)}
.ci{font-weight:700;flex-shrink:0;width:14px}
.c-pass .ci{color:var(--g)}.c-fail .ci{color:var(--r)}.c-warn .ci{color:var(--y)}
.pass{color:var(--g);font-weight:700}.fail{color:var(--r);font-weight:700}.warn{color:var(--y);font-weight:700}
.gap{border-radius:8px;padding:13px 17px;margin-bottom:9px;border:1px solid var(--bd)}
.p1{border-left:3px solid var(--r)}.p2{border-left:3px solid var(--y)}.p3{border-left:3px solid var(--b)}
.gh{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.gt{font-weight:600;font-size:14px}
.gp.p1{background:rgba(248,81,73,.15);color:var(--r);font-size:11px;padding:2px 7px;border-radius:4px;font-weight:700}
.gp.p2{background:rgba(210,153,34,.15);color:var(--y);font-size:11px;padding:2px 7px;border-radius:4px;font-weight:700}
.gap p{font-size:13px;color:var(--mu)}
table{width:100%;border-collapse:collapse;background:var(--bg2);border-radius:10px;overflow:hidden;margin:14px 0}
th{background:var(--bg3);padding:10px 13px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mu)}
td{padding:11px 13px;border-bottom:1px solid var(--bg3);font-size:13px;vertical-align:top}
tr:last-child td{border-bottom:none}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:36px}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:22px}
.card.ca{border-top:3px solid var(--ca)}.card.cb{border-top:3px solid var(--cb)}
.card h3{font-size:16px;margin-bottom:16px}
.row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bg3);font-size:13px}
.row:last-child{border-bottom:none}
.rl{color:var(--mu)}
.vg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}
.vc{background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:16px}
.vc h4{font-size:11px;color:var(--mu);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
.vc .w{font-size:15px;font-weight:700}.w.wa{color:var(--ca)}.w.wb{color:var(--cb)}.w.wt{color:var(--b)}
.vc p{font-size:12px;color:var(--mu);margin-top:5px}
.lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:999;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
.lb.on{display:flex}
.lb img{max-width:92vw;max-height:92vh;border-radius:8px;object-fit:contain}
.footer{padding:24px 0;border-top:1px solid var(--bd);color:var(--mu);font-size:12px;text-align:center;margin-top:20px}
@media(max-width:860px){.pair,.cards,.vg{grid-template-columns:1fr}.wrap,.hdr{padding:18px}nav{padding:0 18px}}
"""

# ─── Build per-flow sections from discovered files ─────────────────────────────

def make_flow_section(idx, name, a_imgs, b_imgs, a_vids, b_vids):
    """Auto-generate a flow section from discovered media files."""
    body = ""
    # Pair screenshots
    max_imgs = max(len(a_imgs), len(b_imgs))
    for i in range(max_imgs):
        af = a_imgs[i] if i < len(a_imgs) else None
        bf = b_imgs[i] if i < len(b_imgs) else None
        ac = af.replace(".png","").replace("-"," ") if af else ""
        bc = bf.replace(".png","").replace("-"," ") if bf else ""
        left  = img_tag(af, ac)  if af else '<div class="no-media">—</div>'
        right = img_tag(bf, bc)  if bf else '<div class="no-media">—</div>'
        body += pair(left, right, label_a, label_b)
    # Pair videos
    max_vids = max(len(a_vids), len(b_vids))
    for i in range(max_vids):
        av = a_vids[i] if i < len(a_vids) else None
        bv = b_vids[i] if i < len(b_vids) else None
        ac = f"{label_a} — recording" if av else ""
        bc = f"{label_b} — recording" if bv else ""
        left  = vid_tag(av, ac)  if av else '<div class="no-media">—</div>'
        right = vid_tag(bv, bc)  if bv else '<div class="no-media">—</div>'
        body += pair(left, right, label_a, label_b)
    return section(f"flow{idx}", f"Flow {idx}", name.replace("-"," ").title(), body)

# Group images and videos by their number slot
a_imgs_by_num = {}
b_imgs_by_num = {}
a_vids_by_num = {}
b_vids_by_num = {}

for (num, slug, fname) in img_groups.get(plugin_a, []):
    a_imgs_by_num.setdefault(num, []).append(fname)
if plugin_b:
    for (num, slug, fname) in img_groups.get(plugin_b, []):
        b_imgs_by_num.setdefault(num, []).append(fname)
for (num, slug, fname) in vid_groups.get(plugin_a, []):
    a_vids_by_num.setdefault(num, []).append(fname)
if plugin_b:
    for (num, slug, fname) in vid_groups.get(plugin_b, []):
        b_vids_by_num.setdefault(num, []).append(fname)

all_nums = sorted(set(
    list(a_imgs_by_num.keys()) + list(b_imgs_by_num.keys()) +
    list(a_vids_by_num.keys()) + list(b_vids_by_num.keys())
))

# Flow name from first matching slug
def flow_name(num):
    for (n, slug, _) in img_groups.get(plugin_a, []):
        if n == num: return slug
    for (n, slug, _) in img_groups.get(plugin_b or "", []):
        if n == num: return slug
    return f"flow-{num}"

# ─── Stats ────────────────────────────────────────────────────────────────────

total_imgs  = len(all_imgs)
total_vids  = len(all_vids)
total_flows = len(all_nums)
now = datetime.now().strftime("%Y-%m-%d %H:%M")

# ─── Nav links ────────────────────────────────────────────────────────────────

nav_links = '<a href="#overview">Overview</a>'
for num in all_nums:
    nav_links += f'<a href="#flow{num}">{num} · {flow_name(num).replace("-"," ").title()}</a>'

# ─── Auto-generate flow sections ──────────────────────────────────────────────

flow_sections = ""
for num in all_nums:
    flow_sections += make_flow_section(
        num,
        flow_name(num),
        a_imgs_by_num.get(num, []),
        b_imgs_by_num.get(num, []),
        a_vids_by_num.get(num, []),
        b_vids_by_num.get(num, []),
    )

# ─── HTML ─────────────────────────────────────────────────────────────────────

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title>
<style>{CSS}</style>
</head>
<body>
<div class="lb" id="lb" onclick="this.classList.remove('on')">
  <img id="lbimg" src="" alt="">
</div>

<div class="hdr">
  <h1>{TITLE}</h1>
  <div class="sub">Generated: {now} &nbsp;·&nbsp; Docker (wp-env) + Playwright &nbsp;·&nbsp;
    {total_imgs} screenshots · {total_vids} videos · {total_flows} flows</div>
  <div class="badges">
    <span class="badge ba">{label_a}</span>
    {"<span class='badge bb'>" + label_b + "</span>" if plugin_b else ""}
    <span class="badge bi">UAT: Dev · QA · PM · Designer · End User</span>
    <span class="badge bp">Generated by Orbit</span>
  </div>
</div>

<nav>{nav_links}</nav>

<div class="wrap">

<div class="sec" id="overview">
  <div class="sh"><span class="snum">Overview</span><h2>Media Index</h2></div>
  <table>
    <thead><tr><th>Plugin</th><th>Screenshots</th><th>Videos</th><th>Flows</th></tr></thead>
    <tbody>
      <tr><td><strong>{label_a}</strong></td>
        <td>{len([f for g in a_imgs_by_num.values() for f in g])}</td>
        <td>{len([f for g in a_vids_by_num.values() for f in g])}</td>
        <td>{len(all_nums)}</td>
      </tr>
      {"<tr><td><strong>" + label_b + "</strong></td><td>" + str(len([f for g in b_imgs_by_num.values() for f in g])) + "</td><td>" + str(len([f for g in b_vids_by_num.values() for f in g])) + "</td><td>" + str(len(all_nums)) + "</td></tr>" if plugin_b else ""}
    </tbody>
  </table>
  <p style="color:var(--mu);font-size:13px;margin-top:8px">
    Click any screenshot to zoom. Videos are embedded and playable inline.
    Each flow section shows side-by-side screenshots, then side-by-side video recordings.
  </p>
</div>

{flow_sections}

<div class="footer">
  Generated by <strong>Orbit UAT</strong> &nbsp;·&nbsp;
  <a href="https://github.com/adityaarsharma/orbit">github.com/adityaarsharma/orbit</a>
</div>

</div>
<script>
function zoom(img){{
  document.getElementById('lbimg').src = img.src;
  document.getElementById('lb').classList.add('on');
}}
document.addEventListener('keydown', e => {{
  if(e.key === 'Escape') document.getElementById('lb').classList.remove('on');
}});
</script>
</body>
</html>"""

os.makedirs(os.path.dirname(OUT) if os.path.dirname(OUT) else ".", exist_ok=True)
with open(OUT, "w") as f:
    f.write(HTML)

size = os.path.getsize(OUT) / 1024 / 1024
print(f"Report: {OUT} ({size:.1f}MB) — {total_imgs} screenshots, {total_vids} videos, {total_flows} flows")
