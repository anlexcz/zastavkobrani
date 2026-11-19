#!/usr/bin/env python3
"""Statické hrany sousedících strategických území PID pro barevné obrysy.
Spuštění:
 python scripts/export_owner_borders.py pid-strategic.js pid-owner-boundaries.js

Vstup vzniká ze scripts/export_strategic_areas.py, vyžaduje shapely.
Topologie je nezávislá na současných vlastnících; mění se pouze barvy hran.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path
from shapely.geometry import MultiLineString
from shapely.ops import linemerge

MARKER = "const PID_STRATEGIC_POLYGONS="

def read_polygons(path):
    content = Path(path).read_text(encoding="utf-8")
    return json.loads(content.split(MARKER, 1)[1].strip().rstrip(";"))

def as_lines(shape):
    if shape.geom_type == "LineString":
        return [list(shape.coords)]
    if shape.geom_type == "MultiLineString":
        return [list(line.coords) for line in shape.geoms]
    if shape.geom_type == "GeometryCollection":
        return [line for sub in shape.geoms for line in as_lines(sub)]
    raise ValueError("Neočekávaná geometrie " + shape.geom_type)

def generate(polygons_path, output_path):
    polygons = read_polygons(polygons_path)["features"]
    edges = defaultdict(list)
    for feature in polygons:
        territory_id = feature["properties"]["territoryId"]
        for ring in feature["geometry"]["coordinates"]:
            for first, second in zip(ring, ring[1:]):
                key = tuple(sorted((tuple(first), tuple(second))))
                edges[key].append(territory_id)
    groups = defaultdict(list)
    for (a, b), territories in edges.items():
        if len(territories) > 2:
            raise ValueError("Společnou hranu vlastní více než dvě buňky")
        group = (tuple(sorted(territories)) if len(territories) == 2
                 else (territories[0], None))
        groups[group].append((a, b))
    records = []
    for (a, b), segments in groups.items():
        merged = (linemerge(MultiLineString(segments)) if len(segments)>1
                  else MultiLineString(segments))
        lines = [[[round(x, 7), round(y, 7)] for x, y in line]
                 for line in as_lines(merged)]
        records.append([a, b, lines])
    records.sort(key=lambda item: (item[0], item[1] or ""))
    result = ('"use strict";\n'
              '// Statická topologie vnějších a společných Voroného hran; ne GPS.\n'
              'const PID_OWNER_BOUNDARIES='
              + json.dumps(records, ensure_ascii=False, separators=(",", ":"))
              + ';\n')
    Path(output_path).write_text(result, encoding="utf-8")
    print(len(polygons), "území,", len(records), "hraničních skupin")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Použití: export_owner_borders.py pid-strategic.js pid-owner-boundaries.js")
    generate(sys.argv[1], sys.argv[2])
