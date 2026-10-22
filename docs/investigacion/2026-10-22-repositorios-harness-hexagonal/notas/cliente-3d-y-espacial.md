# Cliente 3D web y stack espacial de Popayán Planetario: frameworks, librerías y repositorios base (estado al 22-oct-2026)

> Método: los metadatos de repositorios (estrellas, licencia, último push y última release) salen de la API de GitHub (`gh api repos/...`) y las versiones de npm salen de `npm view`, ambos consultados el 22-oct-2026. Los tamaños de bundle salen de la API de bundlephobia. Cuando una fuente es secundaria (blog o agregador) lo indico. La nota no toma decisiones: presenta opciones, trade-offs y riesgos para el MVP del 10-dic-2026.

## Framework de render: three.js puro vs react-three-fiber + drei vs Threlte vs TresJS vs Babylon.js vs PlayCanvas; estado de WebGPU (WebGPURenderer, TSL) y soporte en Android de gama media

### Takeaway
Los seis motores están vivos, con push en las últimas 48 h y licencias permisivas (MIT o Apache-2.0). El ecosistema three.js (three r186 y R3F 9.8.2 + drei 10.7.9) tiene la mayor masa crítica y las utilidades de rendimiento más maduras para un MVP en TypeScript. El cambio grande de 2026 es que three.js y R3F v10 (todavía en alpha) se mueven hacia WebGPURenderer + TSL. El manual oficial de three.js aún llama "experimental" a ese renderer, y no acepta `ShaderMaterial`/GLSL, que es justo la técnica que el proyecto tiene planeada. Para el MVP de diciembre, WebGL 2 es la base segura en Android de gama media. WebGPU solo es fiable en Chrome Android 12+ con GPUs Qualcomm/ARM.

### Cited Findings
**Repositorios verificados (GitHub/npm, 22-oct-2026)**

| Proyecto | Estrellas | Licencia | Última versión estable | Último push |
|---|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 116.782 | MIT | r186, release 24-sep-2026 ([release](https://github.com/mrdoob/three.js/releases/tag/r186)); npm `three@0.186.1` ([npm](https://www.npmjs.com/package/three)) | 22-oct-2026 |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 33.168 | MIT | v9.8.2 (15-oct-2026); v10.0.0-alpha.6 (17-oct-2026, prerelease) ([releases](https://github.com/pmndrs/react-three-fiber/releases)) | 21-oct-2026 |
| [pmndrs/drei](https://github.com/pmndrs/drei) | 10.043 | MIT | v10.7.9 (25-sep-2026) | 21-oct-2026 |
| [threlte/threlte](https://github.com/threlte/threlte) (Svelte) | 3.356 | MIT | `@threlte/core@8.6.1` (npm); `@threlte/extras@9.22.3` (21-oct-2026) | 21-oct-2026 |
| [Tresjs/tres](https://github.com/Tresjs/tres) (Vue) | 3.772 | MIT | `@tresjs/core@5.10.0` (npm) | 22-oct-2026 |
| [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js) | 26.218 | Apache-2.0 | 9.32.0 (22-oct-2026) ([release](https://github.com/BabylonJS/Babylon.js/releases/tag/9.32.0)) | 22-oct-2026 |
| [playcanvas/engine](https://github.com/playcanvas/engine) | 17.115 | MIT | v2.23.3 (15-oct-2026) ([release](https://github.com/playcanvas/engine/releases/tag/v2.23.3)) | 22-oct-2026 |
| [playcanvas/react](https://github.com/playcanvas/react) | 544 | MIT | `@playcanvas/react@0.11.7` (npm) | 28-sep-2026 |

- El peso en bundlephobia de una importación completa es: `three@0.186.1` 736 kB minificado / 185 kB gzip; `@react-three/fiber@9.8.2` 183 kB / 57,7 kB gzip; `playcanvas@2.23.3` 2,5 MB / 637 kB gzip. Para `@babylonjs/core`, `@threlte/core` y `@tresjs/core`, bundlephobia no devolvió datos — [bundlephobia three](https://bundlephobia.com/package/three@0.186.1), [bundlephobia R3F](https://bundlephobia.com/package/@react-three/fiber@9.8.2), [bundlephobia playcanvas](https://bundlephobia.com/package/playcanvas@2.23.3)
- R3F 9.8.2 declara como peer dependencies `react >=19 <19.4`, `three >=0.156` y, para la variante nativa, `expo-gl >=11`, `expo >=43` y `react-native >=0.78` — [npm @react-three/fiber](https://www.npmjs.com/package/@react-three/fiber)
- **WebGPURenderer (manual oficial de three.js):** "If a device/browser doesn't support WebGPU, the renderer can automatically fall back to using a WebGL 2 backend". Se importa desde `three/webgpu` y su inicialización es asíncrona (`setAnimationLoop()` o `await renderer.init()`). La opción `forceWebGL: true` fuerza el backend WebGL 2 — [three.js manual: WebGPURenderer](https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html)
- **Limitaciones según el mismo manual:** `ShaderMaterial`, `RawShaderMaterial` y `onBeforeCompile()` "are not supported in WebGPURenderer. This part of your application must be ported to node materials and TSL". `EffectComposer` tampoco está soportado, porque WebGPURenderer trae un stack de postprocesado propio. Además, "The renderer itself is still in an experimental state… depending on your application and scene setup, you will encounter missing features or a better performance with WebGLRenderer" — [three.js manual: WebGPURenderer](https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html)
- TSL se escribe en JavaScript y "can be transpiled to WGSL or GLSL depending on the available backend" — [three.js manual](https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html)
- El constructor de WebGPURenderer expone `forceWebGL`, `antialias`, `logarithmicDepthBuffer`, `reversedDepthBuffer` y `outputBufferType` (por defecto `HalfFloatType`; `UnsignedByteType` ahorra memoria a costa de calidad) — [three.js docs WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- Blogs secundarios fechan la "production readiness" de WebGPURenderer en r171 (septiembre de 2025) y recomiendan probar el fallback WebGL en Android de gama media desde el día uno. Esto contrasta con el término "experimental" que mantiene el manual oficial — [utsubo (secundaria)](https://www.utsubo.com/blog/threejs-2026-what-changed); [three.js manual](https://github.com/mrdoob/three.js/blob/dev/manual/pages/webgpurenderer.html)
- **R3F v10 alpha:** soporta `WebGLRenderer` y `WebGPURenderer` (`state.gl` pasa a ser `state.renderer`), trae un nuevo scheduler para `useFrame` y hooks TSL (`useUniforms`, `useNodes`, `usePostProcessing`). Los mantenedores piden "Consider all features experimental" — [R3F v10.0.0-alpha.1](https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.1)
- **R3F v10.0.0-alpha.6 (17-oct-2026):** WebGPURenderer pasa a ser el renderer por defecto. Para seguir usando GLSL personalizado hay que importar `Canvas` desde `@react-three/fiber/legacy`. Un material GLSL dentro de un canvas WebGPU emite un warning, y `gl={...}` en el import por defecto lanza un error — [R3F v10.0.0-alpha.6](https://github.com/pmndrs/react-three-fiber/releases/tag/v10.0.0-alpha.6)
- **Threlte** llega a los node materials/TSL "through the `webgpu` export of `@threlte/core`" — [Threlte docs (repo)](https://github.com/threlte/threlte/blob/main/apps/docs/src/content/learn/advanced/webgpu.mdx). **TresJS** ofrece `TresCanvas` desde `@tresjs/core/webgpu` y los componentes de cientos desde `@tresjs/cientos/webgpu` — [Tres docs (repo)](https://github.com/Tresjs/tres/blob/main/apps/cientos-docs/content/1.getting-started/6.webgpu.md)
- **Babylon.js 9.0** salió el 26-mar-2026 con clustered lighting, luz volumétrica y un pipeline de Gaussian splats. Según la fuente, todo funciona sobre WebGPU y sobre WebGL 2 — [Cinevva (secundaria)](https://app.cinevva.com/signals/2026-03-27-browser-rendering-best-month); [radiancefields (secundaria)](https://radiancefields.com/platforms/babylon-js)
- **Soporte de WebGPU (caniuse, datos StatCounter de septiembre de 2026):** 87,82 % de uso global. Chrome for Android 156 aparece con soporte. Firefox for Android 158 lo tiene "disabled by default". Safari iOS lo soporta desde 26.0. Samsung Internet lo soporta desde 24. Safari macOS 26+ figura como soporte "parcial" — [caniuse WebGPU](https://caniuse.com/webgpu)
- En Chrome Android, WebGPU está activo desde Chrome 121 "on devices running Android 12 and greater powered by Qualcomm and ARM GPUs" — [Chrome for Developers: WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview); [Chrome 121](https://developer.chrome.com/blog/new-in-webgpu-121)
- Chrome 127 añadió un modo de compatibilidad experimental sobre OpenGL ES para dispositivos sin Vulkan 1.1+, que requiere activar flags — [Chrome 127](https://developer.chrome.com/blog/new-in-webgpu-127)
- Una guía secundaria afirma que Chrome 139+ añade GPUs Imagination en Android 16+ y que las GPUs Samsung Xclipse (Exynos) siguen "in progress". No pude contrastarlo con una fuente primaria — [Cinevva (secundaria)](https://app.cinevva.com/guides/webgl-webgpu-not-supported-fix)

### Inferences
- **Camino más rápido a un MVP pulido (opciones, no decisión):**
  - (a) **R3F 9.x + drei sobre WebGLRenderer.** Es la opción estable, con el mayor catálogo de helpers de rendimiento y cámara. Permite los shaders GLSL previstos y deja migrar a v10/WebGPU después de diciembre.
  - (b) **three.js puro en TypeScript.** Tiene menos capas y un bundle algo menor, pero hay que reimplementar a mano lo que drei ya trae (LOD, instancias, monitor de rendimiento, controles de cámara).
  - (c) **Threlte o TresJS.** Son equivalentes funcionales de R3F en Svelte o Vue, con un ecosistema unas diez veces menor en estrellas. Solo tienen sentido si el equipo ya domina esos frameworks.
  - (d) **Babylon.js o PlayCanvas.** Son motores completos con editor (PlayCanvas) y WebGPU maduro, pero no reutilizan el ecosistema three.js (globe.gl, three-globe, camera-controls, gltfjsx). El bundle de PlayCanvas (637 kB gzip) pesa unas 3,4 veces lo que three.
- **Tensión entre "GLSL shaders" y WebGPU:** si el MVP escribe GLSL (`ShaderMaterial`) queda atado a WebGLRenderer, o a `@react-three/fiber/legacy` en v10. Escribir los efectos de galaxia y órbitas en TSL desde el inicio cubre WebGPU y el fallback WebGL 2 con un solo código, a cambio de usar un renderer que el propio three.js llama experimental. Conviene validar ambas rutas con un prototipo en un teléfono real.
- **No conviene depender de R3F v10 para el 10-dic:** está en alpha.6, con cambios que rompen compatibilidad entre alphas.
- **WebGL 2 como base:** WebGPU en Android depende del vendor de GPU y de la versión de Android, Firefox Android lo tiene desactivado y su estado en WebViews no está verificado (ver la ruta móvil). Lo razonable es tratar WebGL 2 como baseline y WebGPU como mejora progresiva.

### Gaps
- No obtuve tamaños de bundle tree-shaken de Babylon.js, Threlte ni TresJS (bundlephobia falló), ni un benchmark independiente WebGL 2 vs WebGPU en teléfonos Android de gama media en 2026.
- No encontré datos de cuota de vendors de GPU (Qualcomm/ARM/Xclipse/PowerVR) en los teléfonos de gama media más vendidos en Colombia. Ese dato define qué porcentaje de usuarios tendría WebGPU.
- No verifiqué en una fuente primaria la fecha exacta de Babylon.js 9.0 (las dos fuentes son secundarias).

## Proyectos de referencia para experiencias astronómicas a escala espacial, navegación multiescala "fly-to" e instanciado de planetas y partículas

### Takeaway
"100,000 Stars" existe como experimento documentado de Google Data Arts (three.js + CSS3D), pero no hay repositorio público en la organización `dataarts`. NASA Eyes no publica su código y su tecnología web actual no está documentada. Las referencias reutilizables con licencia permisiva y actividad reciente son three-globe y globe.gl (que ya integran h3-js), Solar-Wanderer (navegación multiescala real, MIT), spacekit (MIT) y camera-controls para las transiciones fly-to.

### Cited Findings
- "100,000 Stars" es un Chrome Experiment del equipo Data Arts de Google, "built with THREE.js and CSS3D". Visualiza estrellas cercanas a partir de la base de datos HYG (Hipparcos + Yale + Gliese) con coordenadas xyz precalculadas. El case study cubre el render, la gestión de shaders y las etiquetas CSS combinadas con WebGL — [web.dev case study](https://web.dev/case-studies/100000stars)
- `github.com/dataarts/100000stars` devuelve 404. La organización `dataarts` sí contiene `webgl-globe` (3.768 estrellas, archivado, licencia NOASSERTION), `dat.gui` (7.728 estrellas, Apache-2.0, activo) y `armsglobe` (archivado) — [GitHub dataarts](https://github.com/dataarts); [dataarts/webgl-globe](https://github.com/dataarts/webgl-globe)
- NASA Eyes on the Solar System usaba en 2013 un plug-in de navegador basado en Unity — [JPL News](https://www.jpl.nasa.gov/news/nasa-gives-public-new-internet-tool-to-explore-the-solar-system). La versión web interactiva de 2022 navega con las teclas ASWD/QEZC, pero no se publicó su tecnología de render — [Vatican Observatory (secundaria)](https://www.vaticanobservatory.org/sacred-space-astronomy/nasas-new-web-based-solar-system-exploration-app). `github.com/nasa/eyes` no existe (404, API de GitHub)
- Google Orbit Viewer usa trayectorias de JPL Horizons con "in-browser WebGL & Three.js rendering" — [Experiments with Google](https://experiments.withgoogle.com/orbit-viewer)
- **hyqzz/Solar-Wanderer** (MIT, 757 estrellas, push 19-oct-2026) se describe como "1:1 Real-Time Solar System Explorer… NASA JPL ephemeris, WebGL2, Three.js. From solar surface to 100,000 AU Oort Cloud" — [GitHub](https://github.com/hyqzz/Solar-Wanderer)
- **typpo/spacekit** (MIT, 584 estrellas, push 12-oct-2026) es una "Javascript library for 3D space visualizations". Su versión en npm es `spacekit.js@0.1.1` — [GitHub](https://github.com/typpo/spacekit); [npm](https://www.npmjs.com/package/spacekit.js)
- sanderblue/solar-system-threejs (Apache-2.0, 412 estrellas) no recibe push desde el 7-dic-2022 — [GitHub](https://github.com/sanderblue/solar-system-threejs)
- **vasturiano/three-globe** (MIT, 1.641 estrellas, push 14-oct-2026, npm 2.45.6) y **globe.gl** (MIT, 3.204 estrellas, npm 2.46.2) dependen de `h3-js` 4, `three-geojson-geometry` y `@tweenjs/tween.js` — [npm three-globe](https://www.npmjs.com/package/three-globe); [GitHub globe.gl](https://github.com/vasturiano/globe.gl)
- globe.gl ofrece capas H3: `hexBinPointsData` / `hexBinResolution` (resolución H3 de 0 a 15, por defecto 4), `hexPolygonsData` (teselar polígonos GeoJSON en hexágonos) y `hexBinMerge`, que fusiona todos los hexágonos en un solo objeto "for improved rendering performance". Con la fusión activa se pierden las transiciones y los eventos de click/hover — [globe.gl README](https://github.com/vasturiano/globe.gl)
- **yomotsu/camera-controls** (MIT, 2.439 estrellas, v3.1.2, 10,3 kB gzip) ofrece transiciones suaves con `enableTransition` y `smoothTime` (0,25 s por defecto). drei lo expone como `<CameraControls>` — [camera-controls README](https://github.com/yomotsu/camera-controls); [bundlephobia](https://bundlephobia.com/package/camera-controls@3.1.2); [drei README](https://github.com/pmndrs/drei)
- Las escenas multiescala tienen soporte nativo de profundidad logarítmica e invertida (`logarithmicDepthBuffer`, `reversedDepthBuffer`) en WebGPURenderer — [three.js docs WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
- **Instanciado:** R3F recomienda como máximo unas 1000 draw calls ("optimally a few hundred or less") y muestra `instancedMesh` dibujando 100.000 objetos en una sola draw call — [R3F Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance). `BatchedMesh` de three.js agrupa objetos "with the same material but with different geometries" en un único multi-draw — [three.js BatchedMesh.js](https://github.com/mrdoob/three.js/blob/dev/src/objects/BatchedMesh.js)
- Otros motores geoespaciales activos: NASA-AMMOS/3DTilesRendererJS (Apache-2.0, 2.506 estrellas) y CesiumGS/cesium (Apache-2.0, 15.872 estrellas) — [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS); [Cesium](https://github.com/CesiumGS/cesium)
- **googlemaps/js-three** (Apache-2.0, 214 estrellas): su última release en GitHub es v4.0.18 (20-feb-2025), mientras que npm `@googlemaps/three` marca 4.0.13. Las fuentes no coinciden. Último push: 22-jun-2026 — [GitHub](https://github.com/googlemaps/js-three); [npm](https://www.npmjs.com/package/@googlemaps/three)

### Inferences
- Para el patrón "galaxia (comuna) → sistema (nicho) → planeta (marca)", la referencia más cercana en navegación multiescala es Solar-Wanderer, y para fly-to reutilizable lo es camera-controls. three-globe/globe.gl sirven de referencia sobre cómo acoplar h3-js a three.js, pero su modelo es un globo esférico, no un mapa plano por comunas.
- `InstancedMesh` encaja con los elementos repetidos que se generan en código (estrellas, partículas, anillos orbitales, marcadores de bajo LOD). Los planetas de marca son GLB distintos, así que el instanciado no les aplica tal cual: o se usa `BatchedMesh` (que exige material común, por ejemplo con un atlas o array de texturas) o un LOD lejano instanciado con un impostor y el GLB completo solo de cerca.
- googlemaps/js-three ya está descartado como mapa base por la decisión del proyecto. Además, la discrepancia entre la versión de GitHub y la de npm sugiere un mantenimiento irregular.

### Gaps
- No verifiqué si el sitio original de 100,000 Stars sigue en línea ni si hay un mirror del código con licencia clara.
- No encontré documentación técnica pública del motor de NASA Eyes en su versión web de 2022 en adelante.
- No evalué el rendimiento real de Solar-Wanderer ni de spacekit en teléfonos de gama media.

## Pipeline de assets: glTF-Transform (Draco/Meshopt/KTX2), KTX-Software / basis_universal, gltfjsx, buenas prácticas Blender → glTF y cómo cumplir ≤ 1 MB / < 20.000 triángulos

### Takeaway
La cadena estándar en 2026 es exportar desde Blender (que ya exporta Draco, Meshopt y WebP), pasar `gltf-transform optimize` (Meshopt y simplificación con meshoptimizer por defecto, texturas KTX2 con el CLI `ktx` de KTX-Software ≥ 4.4.0) y opcionalmente generar componentes con gltfjsx. Todas las piezas son MIT o Apache-2.0. Blender no exporta KTX2, así que ese paso siempre es posterior a la exportación. En R3F nativo (expo-gl), las texturas KTX2 no funcionan (ver la ruta móvil).

### Cited Findings
- **glTF-Transform** (MIT, 1.989 estrellas, push 20-oct-2026, `@gltf-transform/cli@4.5.1`) no publica releases en GitHub. Las versiones viven en npm — [GitHub](https://github.com/donmccurdy/glTF-Transform); [npm](https://www.npmjs.com/package/@gltf-transform/cli)
- `gltf-transform optimize` aplica "the most common optimizations in one easy step". Se recomienda correr `gltf-transform inspect` antes. Comandos separados: `draco`, `meshopt`, `quantize`, `etc1s`, `uastc`, `simplify`, `resize`, `instance`, `palette`, `join`, `flatten`, `prune` — [gltf-transform.dev/cli](https://gltf-transform.dev/cli)
- Valores por defecto de `optimize` según el código fuente:

  | Opción | Valor por defecto |
  |---|---|
  | `--compress` | `meshopt` |
  | `--texture-compress` | `auto` (acepta `ktx2`, `webp`, `avif`, `auto`, `false`) |
  | `--texture-size` | 2048 |
  | `--simplify` | `true` (con meshoptimizer; `--simplify-error`, `--simplify-ratio`) |
  | `--instance` | `true` (instanciado GPU con mallas compartidas) |
  | `--palette` | `true` |
  | `--flatten` | `true` |
  | `--join` | `true` |
  | `--meshopt-level` | `high` |

  — [cli.ts](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/cli/src/cli.ts)
- La compresión KTX2 ejecuta el CLI `ktx create` de KTX-Software y exige `KTX_SOFTWARE_VERSION_MIN = '4.4.0'`. Si no lo encuentra: "Command "ktx" not found. Please install KTX-Software 4.4.0+" — [toktx.ts](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/cli/src/transforms/toktx.ts)
- **KhronosGroup/KTX-Software:** v4.4.2 (4-oct-2025), 1.388 estrellas. GitHub reporta la licencia como NOASSERTION; el LICENSE.md aclara que los archivos propios son Apache-2.0 y que incorpora otras licencias abiertas "we believe to be mutually compatible" (cumple REUSE) — [release](https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2); [LICENSE.md](https://github.com/KhronosGroup/KTX-Software/blob/main/LICENSE.md)
- **BinomialLLC/basis_universal:** Apache-2.0, v2_50 (3-ago-2026) — [release](https://github.com/BinomialLLC/basis_universal/releases/tag/v2_50)
- `KTX2Loader` de three.js transcodifica Basis Universal "to a supported GPU compressed texture format", "relies on Web Assembly" y necesita configurar `setTranscoderPath` y `detectSupport(renderer)` — [KTX2Loader.js](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/KTX2Loader.js)
- **zeux/meshoptimizer** (MIT, v1.3 del 25-sep-2026): su decodificador corre a "3-6 GB/s on modern desktop CPUs". Según el autor, librerías como Draco "maximize the compression ratio at the cost of disturbing the vertex/index order… or decompression performance". El esquema está disponible como `EXT_meshopt_compression` y `KHR_meshopt_compression`. La comparación con Draco es del propio autor de meshoptimizer: es una fuente interesada — [meshoptimizer README](https://github.com/zeux/meshoptimizer)
- **google/draco:** Apache-2.0, 1.5.9 (16-oct-2026) — [release](https://github.com/google/draco/releases/tag/1.5.9)
- **Exportador glTF de Blender** (KhronosGroup/glTF-Blender-IO, Apache-2.0, push 22-oct-2026). En exportación soporta `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_meshopt_compression`, `EXT_mesh_gpu_instancing`, `KHR_texture_transform` y la familia `KHR_materials_*`. Su lista de exportación no incluye KTX2 — [scene_gltf2.rst](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst)
- El mismo exportador permite formato WebP ("all textures will be saved as WebP, without any png/jpg fallback"), lee los materiales desde Principled BSDF, admite AO horneado y normal maps horneados desde Cycles (espacio tangente, +X/+Y/+Z) y exporta instancias GPU con `EXT_mesh_gpu_instancing` — [scene_gltf2.rst](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst)
- **pmndrs/gltfjsx** (MIT, 5.884 estrellas, `gltfjsx@6.5.3`): último push el 4-nov-2024, sin releases en GitHub — [GitHub](https://github.com/pmndrs/gltfjsx); [npm](https://www.npmjs.com/package/gltfjsx). R3F indica que el código que genera "links geometries and materials for reuse" — [R3F Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)

### Inferences
- **Pipeline candidato para el presupuesto de 1 MB y < 20k triángulos:**
  1. En Blender: modelar con un único Principled BSDF por planeta, hornear AO y detalle en texturas, aplicar modificadores y exportar GLB sin compresión.
  2. `gltf-transform inspect` para medir triángulos y VRAM.
  3. `gltf-transform optimize --compress meshopt --texture-compress ktx2 --texture-size 1024` (o menos, porque el valor por defecto de 2048 es alto para un planeta pequeño), con `--simplify-ratio` ajustado hasta quedar bajo 20k triángulos.
  4. Validar en CI que el GLB final pese ≤ 1 MB.

  Meshopt (decodificador ligero y rápido) se perfila mejor que Draco para móviles. Es una inferencia a partir de la documentación de meshoptimizer, no de un benchmark propio.
- KTX2 reduce la VRAM en el teléfono porque la textura queda comprimida en GPU, y eso importa más que el peso de descarga cuando hay decenas de planetas en escena. Tiene dos costes: el transcodificador WASM en el cliente y la instalación de KTX-Software en la máquina o el CI que construye los assets.
- gltfjsx lleva casi dos años sin push. Funciona, pero es un riesgo de mantenimiento leve. Su función (componentes JSX tipados) es opcional: con `useGLTF` y glTF-Transform basta.
- Para validar la decisión "galaxias, órbitas y señales generadas en código" no hace falta ninguna herramienta adicional. Solo los planetas de marca y el mapa pasan por este pipeline.

### Gaps
- No verifiqué desde qué versión de Blender viene la exportación `KHR_meshopt_compression` (la documentación es de la rama main del add-on), porque la página del manual de Blender devolvió 404.
- No hay un benchmark propio de tiempos de decodificación Draco vs Meshopt ni de transcodificación KTX2 en Android de gama media.
- No encontré una guía oficial con la relación tamaño/calidad recomendada (ETC1S vs UASTC) para planetas estilizados.

## Espacial: uber/h3-js (versión, tamaño), H3 en el servidor (h3-pg en Supabase PG17), deck.gl H3HexagonLayer, turf.js y conversión de polígonos OSM de comunas a un GLB

### Takeaway
h3-js 4.5.0 (Apache-2.0, julio de 2026) pesa unos 65 kB gzip, lo que es significativo en móvil. h3-pg (ahora en `postgis/h3-pg`, v4.5.0) existe, pero **Supabase no lo ofrece**: no aparece en la lista de extensiones de su imagen de Postgres y los issues que lo pedían se cerraron derivándolos a una votación. Para convertir OSM en GLB no hay una librería única y mantenida: hay que encadenar Overpass → osmtogeojson → turf → geometría three.js → GLTFExporter/glTF-Transform, o modelar en Blender con add-ons GPL.

### Cited Findings
- **uber/h3-js:** Apache-2.0, 1.094 estrellas, v4.5.0 (1-jul-2026), con la librería core actualizada a v4.5.0, la nueva función `reverseDirectedEdge` y un arreglo para llamadas `gridDisk` sobredimensionadas que corrompían las siguientes — [release v4.5.0](https://github.com/uber/h3-js/releases/tag/v4.5.0)
- h3-js@4.5.0 pesa 213 kB minificado y 65,5 kB gzip, sin dependencias — [bundlephobia](https://bundlephobia.com/package/h3-js@4.5.0)
- **h3-pg:** el repositorio activo es `postgis/h3-pg` (Apache-2.0, 386 estrellas, v4.5.0 del 8-jun-2026). `zachasme/h3-pg` está archivado — [postgis/h3-pg release](https://github.com/postgis/h3-pg/releases/tag/v4.5.0); [zachasme/h3-pg](https://github.com/zachasme/h3-pg)
- En SQL, las funciones de h3-pg usan snake_case, por ejemplo `h3_latlng_to_cell`. Hay paquetes para Debian/Ubuntu y RHEL, y también una integración `h3_postgis` — [Crunchy Data docs h3-pg 4.5.0](https://access.crunchydata.com/documentation/h3-pg/4.5.0/)
- **Supabase:** el directorio `nix/ext` de `supabase/postgres` incluye `postgis`, `pgrouting`, `pgvector`, `timescaledb`, `pg_cron` y otras, pero **no h3** — [supabase/postgres nix/ext](https://github.com/supabase/postgres/tree/HEAD/nix/ext). Los issues "Add h3 extension" (#245, cerrado en 2022) y "Feature Request: h3-pg extension" (#664, cerrado en 2024) se cerraron remitiendo a la votación centralizada de extensiones — [issue 245](https://github.com/supabase/postgres/issues/245); [issue 664](https://github.com/supabase/postgres/issues/664); [discusión 679](https://github.com/orgs/supabase/discussions/679)
- OVHcloud sí lista `h3` y `h3_postgis` como extensiones de su Postgres gestionado (otro proveedor) — [OVHcloud](https://docs.ovhcloud.com/fr/guides/public-cloud/databases/postgresql-extensions.md)
- **deck.gl:** MIT, 14.694 estrellas, v9.4.0 (5-sep-2026) — [release](https://github.com/visgl/deck.gl/releases/tag/v9.4.0). `H3HexagonLayer` (en `@deck.gl/geo-layers`) exige que "all hexagons within one H3HexagonLayer must use the same resolution". Por defecto asume que todos los hexágonos visibles tienen la forma del central (modo instanciado) y cambia a `highPrecision` con pentágonos, resoluciones 0–5 o resoluciones mezcladas. En bundles precompilados requiere cargar `h3-js@^4` antes — [deck.gl H3HexagonLayer](https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer)
- **Turf:** MIT, 10.523 estrellas, v7.4.0 (3-ago-2026) — [release](https://github.com/Turfjs/turf/releases/tag/v7.4.0). El paquete completo `@turf/turf@7.4.0` pesa 525 kB minificado / 137 kB gzip — [bundlephobia](https://bundlephobia.com/package/@turf/turf@7.4.0)
- **osmtogeojson:** MIT, 751 estrellas, último push 23-abr-2026. El dist-tag `latest` de npm apunta a `3.0.0-beta.5` (una beta) — [GitHub](https://github.com/tyrasd/osmtogeojson); [npm](https://www.npmjs.com/package/osmtogeojson)
- **w3reality/three-geo:** MIT, v1.4.5, último push 25-feb-2025. Construye terreno 3D a partir del DEM RGB "provided by the Mapbox Maps API" (requiere token de Mapbox) — [GitHub](https://github.com/w3reality/three-geo)
- **Add-ons de Blender para OSM:** domlysz/BlenderGIS (GPL-3.0, 9.516 estrellas, último push 20-dic-2025) — [GitHub](https://github.com/domlysz/BlenderGIS). vvoovv/blosm (código GPL; la versión premium se vende en Gumroad; push 8-sep-2026) — [GitHub](https://github.com/vvoovv/blosm)
- `three-geojson-geometry` (vasturiano, MIT, v2.1.1) es una de las dependencias de three-globe — [npm](https://www.npmjs.com/package/three-geojson-geometry)

### Inferences
- **Dónde calcular H3:** como Supabase no tiene h3-pg, las opciones son:
  - (a) calcular los índices H3 en la capa de aplicación (h3-js en Node/Edge) al escribir cada comercio y guardarlos como columna `text`/`bigint` indexada, con PostGIS para las consultas geométricas;
  - (b) un Postgres propio o de otro proveedor con h3-pg;
  - (c) precomputar en Redis junto al `Float32Array` de radios.
- **h3-js en el cliente:** los 65 kB gzip se pueden evitar si el servidor envía las celdas y los centroides ya resueltos. El cliente solo necesitaría h3-js para dibujar bordes de celdas en tiempo real.
- **deck.gl:** es un motor de render separado, con su propio contexto y viewports cartográficos. Puede servir como vista 2D/2.5D alternativa para la sección "Mapa" o como fallback ligero, pero integrarlo dentro de la escena three.js de las galaxias añade complejidad.
- **Pipeline OSM → GLB candidato:**
  1. Overpass (relaciones de comunas) → osmtogeojson → turf (`simplify`, limpieza, `area`/`centroid`).
  2. Proyección local en metros centrada en Popayán.
  3. `THREE.Shape`/`ExtrudeGeometry` por comuna.
  4. `GLTFExporter` → `gltf-transform optimize` (meshopt + quantize) → validar ≤ 3 MB.

  Todo es MIT/Apache y reproducible en CI. La alternativa es importar en Blender con BlenderGIS o blosm (GPL) y modelar a mano. Que un add-on GPL usado como herramienta no "contamine" el GLB resultante es una lectura habitual, no una opinión legal. three-geo no aplica porque depende de Mapbox.
- **Atribución ODbL:** debe acompañar al GLB derivado y a cualquier GeoJSON publicado, porque son bases de datos o productos derivados de OSM.

### Gaps
- No pude verificar con Overpass que las 9 comunas de Popayán existan hoy como relaciones `boundary` en OSM, ni su `admin_level`: los servidores overpass-api.de, kumi.systems y private.coffee respondieron 406, 502 o "at capacity".
- No verifiqué si la votación de extensiones de Supabase (discusión 679) registra h3 ni su estado actual: la página se truncó.
- No obtuve el tamaño de los paquetes modulares de Turf (por ejemplo `@turf/simplify`), que suelen ser mucho menores que `@turf/turf`.

## Rendimiento y UX: instancing, LOD, frustum culling, DPR adaptativo (drei PerformanceMonitor), Lighthouse/INP en teléfonos de gama media y fallback accesible (modo 2D/ligero)

### Takeaway
drei y R3F traen casi todo el kit de rendimiento listo (`PerformanceMonitor`, `AdaptiveDpr`, `AdaptiveEvents`, `Detailed`, `Instances`, `Merged`, `Bvh`, `BakeShadows`, renderizado bajo demanda). detect-gpu permite asignar un "tier" por GPU y enviar al tier 0 a una experiencia sin WebGL. El riesgo de INP (umbral "bueno" ≤ 200 ms en p75) está en el hilo principal: parseo del bundle 3D, decodificación de assets y render. OffscreenCanvas en un worker es la mitigación documentada, pero el wrapper de R3F para eso tiene poco mantenimiento.

### Cited Findings
- **Guía de rendimiento de R3F:**
  - `frameloop="demand"` con `invalidate()` para renderizar solo cuando algo cambia.
  - Reutilizar geometrías y materiales (`useLoader` cachea por URL).
  - Máximo de unas 1000 draw calls, idealmente unos cientos.
  - `instancedMesh` para 100.000 objetos.
  - `<Detailed distances={[0, 10, 20]}>` para LOD.
  - `Suspense` anidado para cargar baja calidad primero.
  - `PerformanceMonitor`: `onIncline`/`onDecline`, `factor` de 0 a 1 que arranca en 0,5, `flipflops`/`onFallback`.
  - `performance.regress()` con `debounce` de 200 ms.
  - `startTransition` para repartir la creación de objetos (510 `TextGeometry`: unos 5 fps sin concurrencia frente a cerca de 60 fps con ella).

  — [R3F Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- El README de drei lista `CameraControls`, `Instances`, `Merged`, `Detailed`, `BakeShadows`, `AdaptiveDpr`, `AdaptiveEvents`, `Bvh` y `PerformanceMonitor` — [drei README](https://github.com/pmndrs/drei)
- **gkjohnson/three-mesh-bvh** (MIT, 3.526 estrellas, v0.9.16, push 22-oct-2026) acelera el raycasting que usa `Bvh` — [GitHub](https://github.com/gkjohnson/three-mesh-bvh)
- **pmndrs/detect-gpu** (MIT, 1.223 estrellas). El paquete se renombró a `@pmndrs/detect-gpu` (6.0.27) y el antiguo `detect-gpu` quedó en 5.0.70. Asigna tiers según benchmarks de render. Asigna `tier: 0` si no puede crear un contexto WebGL, si la GPU está en la blocklist o si renderiza a menos de 15 fps: "One should provide a fallback to a non-WebGL experience". Por defecto descarga los benchmarks desde unpkg; se pueden autoalojar con `benchmarksURL` — [detect-gpu README](https://github.com/pmndrs/detect-gpu); [npm](https://www.npmjs.com/package/@pmndrs/detect-gpu)
- **INP:** "good" es ≤ 200 ms y "poor" > 500 ms, medido en el percentil 75 de cargas de página, segmentado entre móvil y escritorio — [web.dev Optimize INP](https://web.dev/articles/optimize-inp); [web.dev INP](https://web.dev/articles/inp)
- Mover el trabajo de canvas a un worker con OffscreenCanvas mantiene la UI receptiva aunque el hilo principal esté ocupado. three.js necesita un objeto `style` simulado en el canvas transferido — [web.dev OffscreenCanvas](https://web.dev/articles/offscreen-canvas)
- Una fuente secundaria estima que three.js añade unos 563 kB al bundle y que su parseo puede congelar la página — [Evil Martians (secundaria)](https://evilmartians.com/chronicles/faster-webgl-three-js-3d-graphics-with-offscreencanvas-and-web-workers). Bundlephobia mide 736 kB minificado / 185 kB gzip para `three@0.186.1` — [bundlephobia](https://bundlephobia.com/package/three@0.186.1)
- **pmndrs/react-three-offscreen** (MIT, 527 estrellas, `@react-three/offscreen@0.0.8`): último push 30-ene-2025 — [GitHub](https://github.com/pmndrs/react-three-offscreen)
- **Herramientas de medición:** utsuboco/r3f-perf (MIT, v7.2.3) no recibe push desde el 20-dic-2024 — [GitHub](https://github.com/utsuboco/r3f-perf). mrdoob/stats.js (MIT) tiene su último push el 11-oct-2024 — [GitHub](https://github.com/mrdoob/stats.js)
- **pmndrs/postprocessing:** licencia Zlib (permisiva), push 5-oct-2026 — [GitHub](https://github.com/pmndrs/postprocessing)
- **GSAP** es gratuito incluso para uso comercial desde su adquisición por Webflow, pero bajo la "standard no charge license" propia, no una licencia OSI — [GSAP README](https://github.com/greensock/GSAP)
- Una fuente secundaria recomienda diferir el bundle 3D hasta después del primer pintado y probar los navegadores integrados en apps (in-app browsers) antes del lanzamiento — [threejsresources (secundaria)](https://threejsresources.com/webgpu/vs-webgl)

### Inferences
- **Arquitectura de UX orientada a INP y a teléfonos de gama media:**
  - Shell HTML ligero con el dock de 5 secciones (pintado sin esperar a three.js).
  - Carga diferida del canvas 3D.
  - `getGPUTier` al inicio para elegir calidad: el tier 0 va al modo 2D/ligero, y los tiers 1–3 reciben DPR, postprocesado y densidad de partículas escalados.
  - `PerformanceMonitor` + `AdaptiveDpr` en ejecución.
  - `frameloop="demand"` en las vistas estáticas (Perfil, Noticias) para ahorrar batería.
- **Fallback accesible:** las secciones Noticias, Perfil y Mi universo pueden ser HTML accesible (listas y tarjetas) sin depender del canvas. Así el modo 2D es la misma app sin la capa 3D, no un producto aparte. Encaja con "entendible por exploración" para usuarios con lectores de pantalla.
- **Botones del dock:** en un canvas, los eventos de puntero pasan por raycasting. Combinar `Bvh` (three-mesh-bvh) con `AdaptiveEvents` reduce el coste por interacción. Aun así, conviene que los botones del dock sean DOM y no objetos 3D.
- **10.000 sesiones simultáneas:** el render es local, así que la carga del servidor sale del CDN de assets y de la API. Con GLB ≤ 1 MB cacheados en R2 + CDN y caché inmutable por hash, el coste depende sobre todo del número de planetas por vista. Es una inferencia a partir de los presupuestos del proyecto.

### Gaps
- No encontré mediciones públicas de Lighthouse/INP de apps three.js o R3F en teléfonos Android de gama media de 2025–2026.
- No verifiqué si R3F v9 o v10 tienen una ruta de OffscreenCanvas mantenida que sustituya a `@react-three/offscreen`.
- No encontré una guía oficial (WCAG) específica para experiencias WebGL. La propuesta de fallback es inferencia.

## Ruta móvil 2027: React Native + react-three-fiber/native, Expo GL, Flutter (flutter_scene / three_dart), Capacitor envolviendo la web; trade-offs para reutilizar el cliente web

### Takeaway
Capacitor 8 reutiliza el cliente web al 100 %, pero depende del WebView del sistema; el soporte de WebGPU en WebViews no está documentado y hay reportes de tirones. R3F native (sobre expo-gl) reutiliza parte del código React, pero expo-gl **no implementa `compressedTexImage2D`**, lo que choca con el pipeline KTX2. flutter_scene maduró hasta ser un motor 3D completo (glTF, KTX2, instancing, web incluida), pero obliga a reescribir el cliente en Dart. three_dart y expo-three están abandonados. awesome-flutter es solo una lista curada.

### Cited Findings
- **ionic-team/capacitor:** MIT, 16.930 estrellas, release 8.5.3 (7-oct-2026) — [release](https://github.com/ionic-team/capacitor/releases/tag/8.5.3)
- No encontré una fuente primaria sobre WebGPU en Android System WebView. Un desarrollador de Construct reporta que WebGPU en el WebView "stuttered badly" en un Pixel 7 Pro, mientras que WebGL 2 mejoró con las actualizaciones recientes del WebView; acabó desactivando WebGPU (anecdótico) — [foro Construct (secundaria)](https://www.construct.net/en/forum/users/paulplay-982816/posts)
- **R3F native:** "R3F v8 adds support for react-native… `@react-three/fiber/native`. We use `expo-gl` and `expo-asset` under the hood for WebGL2 bindings". drei tiene su variante `@react-three/drei/native` — [R3F installation docs](https://r3f.docs.pmnd.rs/getting-started/installation#react-native). R3F 9.8.2 mantiene `expo-gl >=11` y `react-native >=0.78` como peer dependencies — [npm](https://www.npmjs.com/package/@react-three/fiber)
- **expo-gl (SDK 58, `expo-gl@58.0.3`):**
  - Crea un contexto OpenGL ES que "resembles a WebGL2RenderingContext".
  - Métodos no implementados: `compressedTexImage2D()`, `compressedTexSubImage2D()`, `getTexParameter()`, `getUniform()`, entre otros.
  - "Some older Android devices may not support WebGL2 features".
  - Three.js no funciona dentro de los worklets de Reanimated.
  - No funciona con la depuración remota activa.

  — [expo-gl docs v58 (fuente)](https://github.com/expo/expo/blob/main/docs/pages/versions/v58.0.0/sdk/gl-view.mdx); [docs.expo.dev](https://docs.expo.dev/versions/latest/sdk/gl-view/)
- **expo/expo-three:** MIT, último push 31-jul-2024 — [GitHub](https://github.com/expo/expo-three)
- **wcandillon/react-native-webgpu** (`react-native-wgpu@0.5.17`): MIT, 1.263 estrellas, push 22-oct-2026. Ofrece WebGPU en React Native — [GitHub](https://github.com/wcandillon/react-native-webgpu); [npm](https://www.npmjs.com/package/react-native-wgpu)
- **bdero/flutter_scene:** MIT, 971 estrellas, release 0.24.3 (9-oct-2026). Se presenta como "A complete 3D game engine for Flutter, built on Flutter GPU": PBR, IBL, instancing, LODs, partículas, Gaussian splatting, física (Rapier), importación glTF, texturas KTX2 y un editor con servidor MCP — [README](https://github.com/bdero/flutter_scene); [release](https://github.com/bdero/flutter_scene/releases/tag/flutter_scene-0.24.3)
- flutter_scene requiere "Flutter 3.47 (stable) or newer". Flutter GPU debe activarse en cada plataforma nativa. En la web usa un backend WebGL2 propio, sin flags. Su autor es el creador de Flutter GPU y exmiembro del equipo de Impeller. Incluye el ejemplo "Dashmap", un mapa 3D con edificios OSM — [flutter_scene README](https://github.com/bdero/flutter_scene)
- **wasabia/three_dart:** MIT, 490 estrellas, último push 8-feb-2024 — [GitHub](https://github.com/wasabia/three_dart)
- **Solido/awesome-flutter:** 61.621 estrellas, sin licencia detectada por GitHub, push 3-sep-2026. Es una lista curada, no un framework — [GitHub](https://github.com/Solido/awesome-flutter)
- El dispositivo de referencia de WebGPU en Chrome Android (Android 12+ con Qualcomm/ARM) se documenta para el navegador Chrome, no para el WebView — [Chrome for Developers](https://developer.chrome.com/docs/web-platform/webgpu/overview)

### Inferences
- **Opciones de reutilización para Semana Santa 2027:**

  | Opción | Reutilización | Riesgos |
  |---|---|---|
  | Capacitor 8 + cliente web | Total (mismo bundle, mismos GLB/KTX2) | Rendimiento del WebView, WebGPU en WebView sin confirmar, percepción de "app web" en las tiendas |
  | React Native + R3F native (expo-gl) | Parcial: componentes R3F, estado y lógica; el DOM se reescribe | Sin texturas comprimidas por la falta de `compressedTexImage2D`: habría que servir PNG/WebP alternativos o descomprimir KTX2 a RGBA (más VRAM). Helpers de drei que dependen del DOM no disponibles. Ecosistema nativo de three menos probado |
  | React Native + react-native-wgpu | Potencial reutilización de TSL/WebGPURenderer | La compatibilidad con three.js no está verificada; proyecto 0.x |
  | Flutter + flutter_scene | Solo assets (glTF/KTX2) y backend | Reescritura total en Dart; motor joven (0.x); requiere activar Flutter GPU |

- **Mantener abierta la ruta Capacitor:** si el MVP web se diseña con WebGL 2 como baseline y presupuestos estrictos, la ruta Capacitor queda abierta con el menor coste. Las otras rutas implican duplicar el pipeline de texturas (React Native) o el cliente entero (Flutter).
- **three_dart y expo-three:** no son bases viables. three_dart lleva unos 32 meses sin push y expo-three unos 27.

### Gaps
- No encontré documentación primaria sobre WebGPU en Android System WebView (versión o condiciones), que es clave para Capacitor y para los navegadores in-app (WhatsApp, Instagram) por los que se compartirán los enlaces.
- No verifiqué si `react-native-wgpu` corre three.js `WebGPURenderer` ni R3F (el README no lo menciona en lo revisado).
- No encontré benchmarks comparativos de R3F native vs Capacitor vs flutter_scene en un mismo dispositivo Android de gama media.
- No verifiqué el estado de R3F v10 respecto a React Native (la guía de migración v10 no se pudo leer).
