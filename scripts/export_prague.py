#!/usr/bin/env python3
"""Statický mapový výřez z úplného auditního CSV PID Stop Listu (Alpha).
Použití:
 python scripts/export_prague.py zastavkobrani_territories.csv zastavkobrani_stop_points.csv pid-prague.js
Nevytváří schválené capture body ani nová herní UUID.
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

def export(territories_csv, points_csv, target):
    territories, points = load(territories_csv), load(points_csv)
    grouped = defaultdict(list)
    ids = set()
    for p in points:
        assert p["point_id"] not in ids, "Duplicita PID stop pointu: " + p["point_id"]
        ids.add(p["point_id"])
        grouped[p["territory_id"]].append([
            p["point_id"], p["platform"], float(p["lat"]), float(p["lon"]),
            p["modes"], int(p["is_metro"] == "True"), p["capture_review"],
            int(p["inside_prague"] == "True")
        ])
    rows = []
    for t in territories:
        ps = grouped[t["territory_id"]]
        assert len(ps) == int(t["point_count"]), "Neshoda stanovišť: " + t["name"]
        rows.append([
            t["territory_id"], t["name"], float(t["map_lat"]), float(t["map_lon"]),
            t["modes"], ps
        ])
    assert len(rows) == len(territories)
    assert sum(len(g[-1]) for g in rows) == len(points)
    code = '''"use strict";
// PID Stop List – auditní snapshot. Žádné GPS body nejsou schválené k obsazení.
const PID_PRAGUE = ''' + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + '''.map(([id,name,lat,lon,modes,points])=>({
 id,name,lat,lon,cats:modes?modes.split(';'):[],
 points:points.map(([id,platform,lat,lon,modes,metro,review,inside])=>({
  id,platform,lat,lon,cats:modes?modes.split(';'):[],
  isMetro:!!metro,captureEnabled:false,review,insidePrague:!!inside
 }))
}));
'''
    Path(target).write_text(code, encoding="utf-8")
    print(f"{len(rows)} herních území / {len(points)} nástupišť => {target}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Použití: export_prague.py territories.csv stop_points.csv pid-prague.js")
    export(*sys.argv[1:])
