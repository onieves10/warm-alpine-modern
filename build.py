#!/usr/bin/env python3
"""Splice the immersive intro + top bar into the untouched mood board -> index.html"""
import pathlib, sys

here = pathlib.Path(__file__).parent
src  = (here / "moodboard-source.html").read_text(encoding="utf-8")
css  = (here / "parts" / "intro.css").read_text(encoding="utf-8")
ov   = (here / "parts" / "intro.html").read_text(encoding="utf-8")
js   = (here / "parts" / "intro.js").read_text(encoding="utf-8")

# 1) inject styles just before </head>
if "</head>" not in src:
    sys.exit("no </head> found")
src = src.replace("</head>", "<style id=\"wam-style\">\n" + css + "\n</style>\n</head>", 1)

# 2) inject overlay + top bar right after <body>
if "<body>" not in src:
    sys.exit("no <body> found")
src = src.replace("<body>", "<body>\n" + ov + "\n", 1)

# 3) inject controller just before </body> (after the board's own image script)
if "</body>" not in src:
    sys.exit("no </body> found")
src = src.replace("</body>", "<script id=\"wam-script\">\n" + js + "\n</script>\n</body>", 1)

out = here / "index.html"
out.write_text(src, encoding="utf-8")
print("built", out, f"({len(src):,} chars)")
