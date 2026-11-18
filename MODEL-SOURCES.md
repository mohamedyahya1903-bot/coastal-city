# Original CC0 actor and vehicle sources
Verified 2026-11-18, private component trial only.

## Kenney Car Kit 3.1
- Creator page: https://kenney.nl/assets/car-kit
- Original creator download obtained through that page's Download > Continue without donating.
- Original ZIP: `models/kenney-car-kit-original.zip`, 4,814,237 bytes.
- Included `License.txt` states Creative Commons Zero (CC0), personal, educational and commercial use, attribution not required.
- Original taxi: `Models/GLB format/taxi.glb`, 175,608 bytes, 2,072 triangles, external `Textures/colormap.png`.
- The creator currently supplies GLB, FBX and OBJ, not plain .gltf in this ZIP. GLB is ordinary glTF 2.0 binary with no required compression extension. Not the mirrored taxi. No Draco decoder needed.
- Taxi resized to 3.8 m length, rotated to heading convention. Geometry unchanged.

## Quaternius Ultimate Modular Men
- Creator page: https://quaternius.com/packs/ultimatemodularcharacters.html
- Creator's own Download opens: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX?usp=sharing
- Creator distributes files in folders, not a single ZIP. Our transfer ZIP is packaging, not a claimed creator ZIP.
- Original License.txt from that folder explicitly states CC0 1.0 Universal.
- Original Beach.gltf: 3,166,143 bytes, 6,578 triangles, 24 animations, no external images. Has a sleeveless vest.
- Original Casual_2.gltf: 3,058,092 bytes, 5,776 triangles, 24 animations. Retained for comparison, not used in player trial.
- Runtime derivative player-vest-cc0.glb: 851,568 bytes. Beach geometry/rig/face retained, vest recoloured off-white, shorts dark blue, animation list reduced to Idle and Walk, unused buffer views removed, embedded base64 converted to binary. Shorts remain shorts, not claimed long trousers or exact GTA clothing. Original face, not copied proprietary character likeness.
- Derivation is reproducible using prepare-player.py, originals retained untouched.

## Component integration
Existing actors API preserved. New optional awaited method:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const actors = createActors(/* existing options */);
await actors.loadModels({ GLTFLoader, baseURL: './models/' });
```

Do not remove loading screen until promise resolves. An error should be reported rather than silently calling primitives the finished model pass. Required files: player-vest-cc0.glb, taxi.glb, Textures/colormap.png. Loader must match coordinator's pinned Three version. Local test used installed Three, not claim exact CDN parity.

Coordinator wiring still required: actors.update(dt, controls.state), onModeChange: driving => controls.setMode(driving). Phone pause should call controls.reset() so held inputs don't resume after closing it.

## Tests and limits
- Imported models loaded with zero page errors, walking/driving component and native touch axes/cancel/blur/ENTER tests pass.
- 28 existing logic assertions pass on actor motion/collision/save code.
- Rendered imported actor + taxi: 8,650 triangles. Close harness: 27 draw calls, 8,770 triangles total.
- Phone-view screenshot 844x390 inspected. Not a physical Galaxy M02s FPS measurement. Target 40-60 / floor30 remains unverified.
- Stub harness scenery is not the actual city or a completed game. Friends not implemented in this slice yet.
