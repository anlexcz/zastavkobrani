#!/usr/bin/env python3
"""Vygeneruje vizuální polygonové oblasti zastávek PID ze snapshotu auditu.

python scripts/export_strategic_areas.py zastavkobrani_territories.csv pid-strategic.js

Závislosti: numpy, scipy, shapely (pip install numpy scipy shapely).
Geometrie NENÍ podkladem k obsazení; jsou to pouze grafické Voroného buňky.
"""
import csv
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Point, Polygon

RADIUS_M = 390
SIMPLIFY_M = 4
LAT_REF = 50.08
METERS_PER_LAT = 111320
METERS_PER_LON = METERS_PER_LAT * math.cos(math.radians(LAT_REF))

def generate(source, destination):
    with open(source, encoding="utf-8-sig", newline="") as handle:
        groups = list(csv.DictReader(handle))
    points = np.array([[float(row["map_lon"])*METERS_PER_LON,
                        float(row["map_lat"])*METERS_PER_LAT] for row in groups])
    if len({tuple(point) for point in points}) != len(points):
        raise ValueError("Shodné souřadnice více skupin: nutné explicitní řešení před exportem")
    minx,miny = points.min(axis=0)
    maxx,maxy = points.max(axis=0)
    margin = 40000
    border = np.array([
        [minx-margin,miny-margin],[maxx+margin,miny-margin],
        [maxx+margin,maxy+margin],[minx-margin,maxy+margin],
        [(minx+maxx)/2,miny-margin],[(minx+maxx)/2,maxy+margin],
        [minx-margin,(miny+maxy)/2],[maxx+margin,(miny+maxy)/2]
    ])
    voronoi = Voronoi(np.vstack([points,border]))
    features = []
    for index,(row,point) in enumerate(zip(groups,points)):
        region = voronoi.regions[voronoi.point_region[index]]
        if not region or -1 in region:
            raise ValueError("Neomezená Voroného buňka: " + row["name"])
        cell = Polygon(voronoi.vertices[region])
        shape = cell.intersection(Point(point).buffer(RADIUS_M,resolution=12)).simplify(
            SIMPLIFY_M,preserve_topology=True)
        if shape.geom_type != "Polygon" or shape.is_empty:
            raise ValueError("Neplatný výsledný polygon: " + row["name"])
        coords = [[round(x/METERS_PER_LON,7),round(y/METERS_PER_LAT,7)]
                  for x,y in shape.exterior.coords]
        features.append({
            "type":"Feature","properties":{"territoryId":row["territory_id"]},
            "geometry":{"type":"Polygon","coordinates":[coords]}
        })
    result = {"type":"FeatureCollection","features":features}
    output = ('"use strict";\n'
              '// PRACOVNÍ STRATEGICKÁ MAPA; nejde o schválené GPS hranice.\n'
              'const PID_STRATEGIC_POLYGONS=' +
              json.dumps(result,ensure_ascii=False,separators=(",",":")) + ';\n')
    Path(destination).write_text(output,encoding="utf-8")
    print(f"{len(features)} oblastí do {destination}")

if __name__ == "__main__":
    if len(sys.argv)!=3:
        raise SystemExit("Použití: export_strategic_areas.py territories.csv pid-strategic.js")
    generate(sys.argv[1],sys.argv[2])
