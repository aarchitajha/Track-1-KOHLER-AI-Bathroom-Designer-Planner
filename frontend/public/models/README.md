# Official Kohler 3D Model Directory

Place official Kohler 3D GLTF / GLB models here to automatically replace procedural geometry in the 3D visualizer.

## How It Works:
The 3D Bathroom Designer automatically checks this folder for 3D models matching either:
1. **Product SKU**: `public/models/{sku}.glb` (e.g. `K-5401-0.glb`, `K-2614-0.glb`)
2. **Collection / Product Type**: `public/models/{collection}-{category}.glb` (e.g. `veil-toilet.glb`, `vive-washbasin.glb`, `hone-faucet.glb`)

## Sourcing Official 3D Models:
1. **Studio Kohler**: Visit [studiokohler.com](https://www.studiokohler.com) → Search your product SKU or name → Specifications & Downloads → 3D Model (OBJ / 3DS / DWG / Revit).
2. **BIMobject Kohler Catalog**: Visit [bimobject.com/en/kohler](https://www.bimobject.com/en/kohler) → Download GLTF / Revit / IFC.
3. Convert `.obj` / `.dwg` / `.ifc` to `.glb` using [gltf.report](https://gltf.report) or Blender, then save the resulting `.glb` file here.

## Graceful Fallback:
If an official `.glb` file is not detected for a specific fixture, the designer automatically renders a high-fidelity procedural representation accurately proportioned and styled to Kohler's official product design language.
