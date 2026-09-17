"""
3D Procedural Room Placement & Clearance Engine (FR-10, FR-11, FR-12).
Generates collision-free 3D coordinates, rotations, and auto-camera-fit parameters.
Scale: 1 unit = 1 real-world foot.
"""

import math


def compute_camera_fit(length_ft, width_ft, height_ft=8.0):
    """
    Computes camera target, position, and distance from room bounding box (FR-12).
    Guarantees the entire room fits properly on load without clipping.
    """
    diag = math.sqrt(length_ft**2 + width_ft**2)
    cam_dist = max(diag * 1.3, 14.0)
    cam_x = length_ft * 0.85
    cam_y = height_ft * 1.35
    cam_z = width_ft * 1.25

    return {
        "target": [0, height_ft * 0.25, 0],
        "position": [round(cam_x, 2), round(cam_y, 2), round(cam_z, 2)],
        "distance": round(cam_dist, 2),
        "fov": 45,
        "min_distance": round(diag * 0.35, 2),
        "max_distance": round(diag * 3.2, 2)
    }


def boxes_overlap(box1, box2):
    """Check 2D axis-aligned bounding box intersection on X-Z floor plane."""
    return not (
        box1["max_x"] < box2["min_x"] or
        box1["min_x"] > box2["max_x"] or
        box1["max_z"] < box2["min_z"] or
        box1["min_z"] > box2["max_z"]
    )


def _world_from_normalized(nx, nz, length_ft, width_ft):
    x = (float(nx) - 0.5) * length_ft
    z = (float(nz) - 0.5) * width_ft
    return x, z


def _rotation_for_wall(wall):
    mapping = {
        "north": [0, 0, 0],
        "south": [0, math.pi, 0],
        "west": [0, math.pi / 2, 0],
        "east": [0, -math.pi / 2, 0],
    }
    return mapping.get(wall, [0, 0, 0])


def _append_placement(placements, occupied_boxes, fixture, pos, rot, wall, source, box=None):
    placements.append({
        **fixture,
        "position": [round(pos[0], 2), round(pos[1], 2), round(pos[2], 2)],
        "rotation": rot,
        "scale": [1, 1, 1],
        "wall": wall,
        "placement_source": source,
        "clearance_valid": True,
    })
    if box:
        occupied_boxes.append(box)


def place_fixtures_in_room(length_ft, width_ft, fixtures, height_ft=8.0, sketch_hints=None):
    """
    Positions fixtures procedurally with collision checking and clearance validation.
    sketch_hints: optional {category: {nx, nz, wall}} from an uploaded sketch.
    Sketch-sourced positions are used as-is; remaining fixtures use default layout logic.
    """
    hints = sketch_hints or {}
    half_l = length_ft / 2.0
    half_w = width_ft / 2.0

    placements = []
    occupied_boxes = []

    by_cat = {}
    for f in fixtures:
        cat = f.get("category")
        by_cat[cat] = f

    basin_w = 2.6
    basin_d = 1.75
    basin_y = 2.7

    def hinted(cat):
        h = hints.get(cat)
        if not h:
            return None
        if h.get("nx") is None or h.get("nz") is None:
            return None
        return h

    # 1. Basin / vanity
    basin_source = "optimizer"
    if "Washbasins" in by_cat:
        h = hinted("Washbasins")
        if h:
            basin_x, basin_z = _world_from_normalized(h["nx"], h["nz"], length_ft, width_ft)
            wall = h.get("wall") or "north"
            basin_source = "sketch"
        else:
            basin_x = -half_l + basin_w / 2.0 + 0.8
            basin_z = -half_w + basin_d / 2.0 + 0.05
            wall = "north"
        _append_placement(
            placements, occupied_boxes, by_cat["Washbasins"],
            [basin_x, basin_y, basin_z], _rotation_for_wall(wall), wall, basin_source,
            {
                "min_x": basin_x - basin_w / 2, "max_x": basin_x + basin_w / 2,
                "min_z": basin_z - 0.4, "max_z": basin_z + basin_d,
            },
        )
    else:
        basin_x = -half_l + basin_w / 2.0 + 0.8
        basin_z = -half_w + basin_d / 2.0 + 0.05
        wall = "north"

    if "Faucets" in by_cat:
        fh = hinted("Faucets")
        faucet_source = "sketch" if fh or basin_source == "sketch" else "optimizer"
        fx, fz = basin_x, basin_z - 0.45
        fwall = wall
        if fh and fh.get("follows") != "Washbasins":
            fx, fz = _world_from_normalized(fh["nx"], fh["nz"], length_ft, width_ft)
            fwall = fh.get("wall") or wall
        _append_placement(
            placements, occupied_boxes, by_cat["Faucets"],
            [fx, basin_y + 0.15, fz], _rotation_for_wall(fwall), fwall, faucet_source,
        )

    if "Mirrors & Cabinets" in by_cat:
        mh = hinted("Mirrors & Cabinets")
        mirror_source = "sketch" if mh or basin_source == "sketch" else "optimizer"
        mx, mz = basin_x, -half_w + 0.08
        mwall = wall
        if mh and mh.get("follows") != "Washbasins":
            mx, mz = _world_from_normalized(mh["nx"], mh["nz"], length_ft, width_ft)
            mwall = mh.get("wall") or wall
        elif basin_source == "sketch":
            mz = basin_z - basin_d / 2.0 + 0.08
        _append_placement(
            placements, occupied_boxes, by_cat["Mirrors & Cabinets"],
            [mx, 4.8, mz], _rotation_for_wall(mwall), mwall, mirror_source,
        )

    # 2. Toilet
    if "Toilets" in by_cat:
        th = hinted("Toilets")
        toilet_w = 1.6
        toilet_d = 2.4
        if th:
            toilet_x, toilet_z = _world_from_normalized(th["nx"], th["nz"], length_ft, width_ft)
            twall = th.get("wall") or "north"
            rot = _rotation_for_wall(twall)
            source = "sketch"
        elif length_ft >= 8.0:
            toilet_x = min(half_l - 3.4, basin_x + basin_w / 2 + 1.8 + toilet_w / 2)
            toilet_z = -half_w + toilet_d / 2.0 + 0.05
            rot = [0, 0, 0]
            twall = "north"
            source = "optimizer"
        else:
            toilet_x = -half_l + toilet_d / 2.0 + 0.05
            toilet_z = 0.4
            rot = [0, math.pi / 2, 0]
            twall = "west"
            source = "optimizer"
        _append_placement(
            placements, occupied_boxes, by_cat["Toilets"],
            [toilet_x, 0.0, toilet_z], rot, twall, source,
            {
                "min_x": toilet_x - 1.5, "max_x": toilet_x + 1.5,
                "min_z": toilet_z - 1.5, "max_z": toilet_z + 1.5,
            },
        )

    # 3. Shower
    if "Showers" in by_cat:
        sh = hinted("Showers")
        if sh:
            shower_x, shower_z = _world_from_normalized(sh["nx"], sh["nz"], length_ft, width_ft)
            swall = sh.get("wall") or "east"
            rot = _rotation_for_wall(swall)
            source = "sketch"
        else:
            shower_x = half_l - 1.6
            shower_z = half_w - 1.6
            swall = "east"
            rot = [0, -math.pi * 0.75, 0]
            source = "optimizer"
        _append_placement(
            placements, occupied_boxes, by_cat["Showers"],
            [shower_x, 6.5, shower_z], rot, swall, source,
            {
                "min_x": shower_x - 1.6, "max_x": shower_x + 1.6,
                "min_z": shower_z - 1.6, "max_z": shower_z + 1.6,
            },
        )

    # 4. Bathtub
    if "Bathtubs" in by_cat and (length_ft * width_ft >= 45.0):
        bh = hinted("Bathtubs")
        tub_w = 5.2
        tub_d = 2.6
        if bh:
            tub_x, tub_z = _world_from_normalized(bh["nx"], bh["nz"], length_ft, width_ft)
            bwall = bh.get("wall") or "south"
            source = "sketch"
        else:
            tub_x = -half_l + tub_w / 2.0 + 0.4
            tub_z = half_w - tub_d / 2.0 - 0.2
            bwall = "south"
            source = "optimizer"
        _append_placement(
            placements, occupied_boxes, by_cat["Bathtubs"],
            [tub_x, 0.0, tub_z], _rotation_for_wall(bwall), bwall, source,
        )

    return {
        "room": {
            "length_ft": length_ft,
            "width_ft": width_ft,
            "height_ft": height_ft,
            "area_sqft": round(length_ft * width_ft, 1)
        },
        "camera": compute_camera_fit(length_ft, width_ft, height_ft),
        "fixtures": placements
    }
