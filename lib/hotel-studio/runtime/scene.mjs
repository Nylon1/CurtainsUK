import * as T from "three";
import { safeImage, ITEMS } from "./model.mjs";

/** Hotel-only scene assembly. The released domestic curtain module is imported unchanged. */
export async function createHotelScene(
  canvas,
  { onPick = () => {}, onStatus = () => {} } = {},
) {
  const config = window.HOTEL_STUDIO_CONFIG;
  const [{ createCurtain }, { createLightingPipeline }] = await Promise.all([
    import(`${config.rendererBase}rooms/curtain-component.mjs`),
    import(`${config.rendererBase}rooms/environment/lighting.mjs`),
  ]);
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color("#e9e3d8");
  const camera = new T.PerspectiveCamera(46, 1.5, 2, 2500);
  const pipeline = createLightingPipeline(renderer, scene, camera);
  scene.add(new T.HemisphereLight("#fff8ec", "#8d8a7e", 2.0));
  const sun = new T.DirectionalLight("#fff5e1", 2.1);
  sun.position.set(-180, 310, 190);
  sun.target.position.set(80, 0, 180);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -550,
    right: 550,
    top: 420,
    bottom: -420,
    near: 5,
    far: 1400,
  });
  sun.shadow.normalBias = 0.6;
  sun.shadow.bias = -0.0001;
  scene.add(sun, sun.target);
  const fill = new T.DirectionalLight("#eef1ff", 1.0);
  fill.position.set(300, 190, 450);
  scene.add(fill);
  const handlers = new AbortController();
  const root = new T.Group();
  scene.add(root);
  const mats = {},
    ownedTextures = new Set(),
    textureCache = new Map(),
    serial = {};
  let roomGroup = null,
    sceneId = null,
    current = null,
    view = "room",
    selected = null,
    disposed = false,
    renderRAF = 0;
  const main = await createCurtain(renderer),
    sheer = await createCurtain(renderer);
  scene.add(sheer.group, main.group);
  const mainMat = main.group.children.find(
    (c) => c.geometry === main.geometry,
  ).material;
  const voileMat = sheer.group.children.find(
    (c) => c.geometry === sheer.geometry,
  ).material;
  mainMat.name = "hotel-curtains";
  voileMat.name = "hotel-voile";
  mats.curtains = mainMat;
  mats.voile = voileMat;
  for (const child of main.group.children)
    child.userData.hotelItem = "curtains";
  for (const child of sheer.group.children) {
    child.userData.hotelItem = "voile";
    child.castShadow = false;
    if (
      child.geometry === sheer.geometry ||
      child.material?.side === T.DoubleSide
    ) {
      child.material.transparent = true;
      child.material.opacity = 0.42;
      child.material.depthWrite = false;
      child.material.color.set("#f5f2e9");
    }
  }
  voileMat.roughness = 1;
  voileMat.sheen = 0.1;
  const makeMat = (colour, extras = {}) =>
    new T.MeshStandardMaterial({ color: colour, roughness: 0.85, ...extras });
  const weave = new Uint8Array(64 * 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++)
      weave[y * 64 + x] =
        128 + 22 * Math.sin((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2);
  const weaveMap = new T.DataTexture(weave, 64, 64, T.RedFormat);
  weaveMap.wrapS = weaveMap.wrapT = T.RepeatWrapping;
  weaveMap.repeat.set(0.6, 0.6);
  weaveMap.needsUpdate = true;
  ownedTextures.add(weaveMap);
  for (const key of [
    "runner",
    "cushions",
    "headboard",
    "base",
    "armchair",
    "bench",
  ])
    mats[key] = new T.MeshPhysicalMaterial({
      color: "#b9ac94",
      roughness: 0.96,
      sheen: 0.35,
      sheenRoughness: 0.9,
      bumpMap: weaveMap,
      bumpScale: 0.06,
      side: T.DoubleSide,
    });
  const fixed = {
    wall: makeMat("#eee9df"),
    trim: makeMat("#e2d9ca"),
    wood: makeMat("#785b3d", { roughness: 0.63 }),
    dark: makeMat("#353c38"),
    brass: makeMat("#ad8a50", { metalness: 0.75, roughness: 0.32 }),
    linen: makeMat("#f3f0e8", {
      roughness: 0.98,
      bumpMap: weaveMap,
      bumpScale: 0.035,
    }),
    rug: makeMat("#c1b49b", {
      roughness: 1,
      bumpMap: weaveMap,
      bumpScale: 0.15,
    }),
    shade: makeMat("#f5e7c8", { emissive: "#ffd28b", emissiveIntensity: 0.18 }),
    glass: makeMat("#c7d9cf", {
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    }),
    stone: makeMat("#d4c7b2"),
  };
  // Existing published timber texture and original generated garden are presentation assets.
  const loadTexture = async (url) => {
    if (!textureCache.has(url))
      textureCache.set(
        url,
        new T.TextureLoader()
          .loadAsync(url)
          .then((t) => {
            t.colorSpace = T.SRGBColorSpace;
            t.anisotropy = Math.min(
              4,
              renderer.capabilities.getMaxAnisotropy(),
            );
            ownedTextures.add(t);
            return t;
          })
          .catch((e) => {
            textureCache.delete(url);
            throw e;
          }),
      );
    return textureCache.get(url);
  };
  let exterior = null;
  try {
    exterior = await loadTexture(new URL("garden.webp", config.assetBase).href);
  } catch {
    onStatus("Garden image unavailable. A neutral daylight view is shown.");
  }
  const floorTexture = await loadTexture(
    `${config.rendererBase}rooms/environment/assets/floor/tonal.webp`,
  ).catch(() => null);
  if (floorTexture) {
    floorTexture.wrapS = floorTexture.wrapT = T.RepeatWrapping;
    floorTexture.repeat.set(3.5, 4);
  }
  fixed.floor = makeMat("#b9a586", { map: floorTexture, roughness: 0.88 });
  const exteriorMat = new T.MeshBasicMaterial({
    map: exterior,
    color: exterior ? "#ffffff" : "#cad8c9",
    toneMapped: false,
  });
  function mesh(
    g,
    m,
    p = [0, 0, 0],
    rot = [0, 0, 0],
    item = null,
    parent = roomGroup,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(...p);
    o.rotation.set(...rot);
    o.castShadow = true;
    o.receiveShadow = true;
    if (item) o.userData.hotelItem = item;
    parent.add(o);
    return o;
  }
  function rounded(w, h, d, r = 2) {
    const n = 5,
      g = new T.BoxGeometry(2, 2, 2, n, n, n),
      p = g.attributes.position,
      v = new T.Vector3(),
      q = new T.Vector3();
    r = Math.min(r, w / 3, h / 3, d / 3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      q.set(
        v.x - Math.sign(v.x) / n,
        v.y - Math.sign(v.y) / n,
        v.z - Math.sign(v.z) / n,
      ).normalize();
      p.setXYZ(
        i,
        Math.sign(v.x) * (w / 2 - r) + q.x * r,
        Math.sign(v.y) * (h / 2 - r) + q.y * r,
        Math.sign(v.z) * (d / 2 - r) + q.z * r,
      );
    }
    g.computeVertexNormals();
    const uv = g.attributes.uv;
    for (let face = 0; face < 6; face++) {
      const start = face * (n + 1) ** 2;
      for (let j = start; j < start + (n + 1) ** 2; j++)
        uv.setXY(
          j,
          uv.getX(j) * (face < 2 ? d : w),
          uv.getY(j) * (face < 4 ? h : d),
        );
    }
    return g;
  }
  const box = (w, h, d, m, p, r = 1, item = null, rot = [0, 0, 0]) =>
    mesh(rounded(w, h, d, r), m, p, rot, item);
  const cyl = (a, b, h, m, p, rot = [0, 0, 0]) =>
    mesh(new T.CylinderGeometry(a, b, h, 24), m, p, rot);
  function pillow(w, h, d, m, p, rot = [-0.2, 0, 0], item = null) {
    const g = new T.BoxGeometry(w, h, d, 18, 16, 2),
      a = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i) / (w / 2),
        y = a.getY(i) / (h / 2),
        z = a.getZ(i) / (d / 2);
      const bulge = Math.pow(Math.max(0, (1 - x * x) * (1 - y * y)), 0.55);
      a.setXYZ(
        i,
        ((x * w) / 2) * (1 - 0.04 * Math.abs(y) ** 8),
        (y * h) / 2,
        z * (1 + (d / 2 - 1) * bulge),
      );
      uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
    }
    g.computeVertexNormals();
    return mesh(g, m, p, rot, item);
  }
  function lamp(x, z) {
    cyl(9, 10, 2, fixed.brass, [x, 54, z]);
    cyl(1.2, 1.4, 30, fixed.brass, [x, 70, z]);
    cyl(10, 15, 22, fixed.shade, [x, 92, z]);
    const point = new T.PointLight("#ffcf8b", 3200, 160, 2);
    point.position.set(x, 92, z);
    roomGroup.add(point);
  }
  function chair(x, z, angle = 0) {
    const parts = [];
    const before = roomGroup.children.length;
    box(77, 15, 72, mats.armchair, [x, 38, z], 9, "armchair");
    box(76, 63, 15, mats.armchair, [x, 61, z - 31], 8, "armchair");
    for (const side of [-1, 1]) {
      box(13, 36, 68, mats.armchair, [x + side * 39, 54, z], 6, "armchair");
      for (const dz of [-25, 25])
        cyl(1.6, 1.2, 30, fixed.wood, [x + side * 30, 15, z + dz]);
    }
    parts.push(...roomGroup.children.slice(before));
    if (angle) {
      const pivot = new T.Group();
      pivot.position.set(x, 0, z);
      roomGroup.add(pivot);
      for (const o of parts) {
        roomGroup.remove(o);
        o.position.x -= x;
        o.position.z -= z;
        pivot.add(o);
      }
      pivot.rotation.y = angle;
    }
  }
  function drape(bx, bz, width = 184, depth = 210) {
    const g = new T.PlaneGeometry(1, 1, 40, 42),
      p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i),
        v = uv.getY(i),
        x = (u - 0.5) * width,
        z = bz - depth / 2 + v * depth,
        edge = Math.max(0, (Math.abs(x) - 77) / 15),
        foot = Math.max(0, (v - 0.92) / 0.08);
      p.setXYZ(
        i,
        bx + x,
        64 -
          17 * Math.min(1, edge) -
          16 * foot +
          0.65 * Math.sin(x * 0.14 + z * 0.08) +
          0.4 * Math.sin(z * 0.13),
        z,
      );
      uv.setXY(i, u * width, v * depth);
    }
    g.computeVertexNormals();
    mesh(g, fixed.linen);
  }
  function runner(bx, bz) {
    const g = new T.PlaneGeometry(1, 1, 42, 14),
      p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i),
        v = uv.getY(i),
        x = (u - 0.5) * 194,
        drop = Math.max(0, (Math.abs(x) - 78) / 19);
      p.setXYZ(
        i,
        bx + x,
        67 - 24 * drop + 0.65 * Math.sin(u * 32 + v * 4),
        bz + v * 50,
      );
      uv.setXY(i, u * 194, v * 50);
    }
    g.computeVertexNormals();
    mesh(g, mats.runner, [0, 0, 0], [0, 0, 0], "runner");
  }
  function disposeRoom() {
    if (!roomGroup) return;
    roomGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    root.remove(roomGroup);
  }
  function buildRoom(next) {
    disposeRoom();
    roomGroup = new T.Group();
    root.add(roomGroup);
    sceneId = next;
    const superior = next === "superior",
      width = superior ? 710 : 540,
      depth = superior ? 620 : 510,
      wx = superior ? -185 : -130,
      ww = superior ? 310 : 230,
      bx = superior ? 155 : 125,
      bz = 150;
    box(width, 5, depth, fixed.floor, [0, -3, depth / 2], 0.1);
    const left = wx - ww / 2,
      right = wx + ww / 2;
    box(
      left + width / 2,
      285,
      12,
      fixed.wall,
      [-width / 2 + (left + width / 2) / 2, 142.5, -22],
      0.1,
    );
    box(
      width / 2 - right,
      285,
      12,
      fixed.wall,
      [right + (width / 2 - right) / 2, 142.5, -22],
      0.1,
    );
    box(ww, 26, 12, fixed.wall, [wx, 272, -22], 0.1);
    box(ww, 10, 12, fixed.wall, [wx, 5, -22], 0.1);
    box(10, 285, depth, fixed.wall, [-width / 2 - 5, 142.5, depth / 2], 0.1);
    box(10, 285, depth, fixed.wall, [width / 2 + 5, 142.5, depth / 2], 0.1);
    box(width, 7, 7, fixed.trim, [0, 4, -14], 0.2);
    box(4, 7, depth, fixed.trim, [-width / 2 + 2, 4, depth / 2], 0.2);
    box(4, 7, depth, fixed.trim, [width / 2 - 2, 4, depth / 2], 0.2);
    // Real opening, no curtain photograph behind the replaceable treatment.
    const garden = mesh(new T.PlaneGeometry(ww + 25, 260), exteriorMat, [
      wx,
      133,
      -35,
    ]);
    garden.castShadow = garden.receiveShadow = false;
    for (const x of [left, right, wx])
      box(3, 247, 6, fixed.dark, [x, 132, -12], 0.1);
    for (const y of [10, 255]) box(ww + 3, 3, 6, fixed.dark, [wx, y, -12], 0.1);
    if (!superior) box(ww, 2.3, 5, fixed.dark, [wx, 115, -10], 0.1);
    const glass = mesh(new T.PlaneGeometry(ww, 244), fixed.glass, [
      wx,
      132,
      -8,
    ]);
    glass.castShadow = false;
    main.group.position.set(wx, 4, 25);
    sheer.group.position.set(wx, 4, 4);
    main.group.scale.set(ww / 230, 1, 1);
    sheer.group.scale.set(ww / 230, 1, 0.75);
    box(ww + 28, 7, 46, fixed.wall, [wx, 265, 9], 0.4);
    box(235, 1, 290, fixed.rug, [bx, 0.2, 178], 0.1);
    // Headboard and base are intentionally separate materials.
    box(177, 29, 210, mats.base, [bx, 24, bz], 6, "base");
    box(180, 119, 10, mats.headboard, [bx, 75, 38], 5, "headboard");
    for (let i = -4; i <= 4; i++)
      box(
        19.4,
        112,
        6,
        mats.headboard,
        [bx + i * 19.8, 76, 44],
        2.7,
        "headboard",
      );
    box(164, 18, 202, fixed.linen, [bx, 47, bz], 6);
    drape(bx, bz + 8);
    runner(bx, bz + 52);
    pillow(68, 43, 18, fixed.linen, [bx - 38, 83, 65]);
    pillow(68, 43, 18, fixed.linen, [bx + 38, 83, 65]);
    pillow(
      42,
      40,
      17,
      mats.cushions,
      [bx - 35, 86, 90],
      [-0.22, 0.05, -0.07],
      "cushions",
    );
    pillow(
      42,
      40,
      17,
      mats.cushions,
      [bx + 35, 86, 90],
      [-0.22, -0.05, 0.07],
      "cushions",
    );
    for (const sx of [-1, 1]) {
      const x = bx + sx * 115;
      box(44, 43, 44, fixed.wood, [x, 28, 44], 2);
      box(47, 3, 47, fixed.stone, [x, 51, 44], 0.8);
      box(15, 0.6, 1.3, fixed.brass, [x, 35, 67], 0.2);
      lamp(x, 44);
    }
    // Timber panels and original geometric artwork over the bed.
    box(244, 207, 3, fixed.trim, [bx, 133, -14], 0.1);
    for (const x of [bx - 120, bx + 120])
      box(1, 207, 1, fixed.brass, [x, 133, -11], 0.1);
    box(102, 62, 3, fixed.wood, [bx, 204, -8], 0.3);
    box(96, 56, 1, fixed.linen, [bx, 204, -6], 0.1);
    const art = new T.Shape();
    art.moveTo(-38, -18);
    art.bezierCurveTo(-28, 30, 8, -35, 40, 16);
    art.lineTo(40, -21);
    art.lineTo(-38, -21);
    const artMesh = mesh(new T.ShapeGeometry(art), fixed.rug, [bx, 204, -5]);
    artMesh.castShadow = false;
    // Desk sits along the side wall, clear of both curtain stacks.
    const dx = -width / 2 + 32,
      dz = 185;
    box(58, 5, 115, fixed.wood, [dx, 76, dz], 1);
    for (const z of [dz - 48, dz + 48])
      box(4, 72, 4, fixed.dark, [dx + 15, 36, z], 0.3);
    box(36, 5, 39, fixed.dark, [dx + 65, 43, dz], 4);
    box(4, 42, 39, fixed.dark, [dx + 83, 61, dz], 3);
    for (const x of [dx + 51, dx + 77])
      for (const z of [dz - 14, dz + 14])
        cyl(1.5, 1, 42, fixed.wood, [x, 21, z]);
    box(21, 0.7, 28, fixed.linen, [dx, 79, dz], 0.2);
    cyl(3, 4, 12, fixed.stone, [dx, 84, dz - 35]);
    // Upholstered bench beyond the foot of the bed.
    box(136, 17, 43, mats.bench, [bx, 40, 305], 5, "bench");
    for (const sx of [-54, 54])
      for (const sz of [-13, 13])
        cyl(2, 1.4, 32, fixed.wood, [bx + sx, 16, 305 + sz]);
    chair(superior ? -220 : -165, superior ? 360 : 330, -0.2);
    if (superior) {
      cyl(30, 30, 3, fixed.stone, [-120, 48, 350]);
      cyl(3, 4, 46, fixed.brass, [-120, 24, 350]);
      cyl(23, 23, 2, fixed.brass, [-120, 1, 350]);
      box(24, 2, 18, fixed.linen, [-120, 51, 350], 0.2);
    }
    cameraView(view);
    return { windowWidth: ww };
  }
  function cameraView(next = "room") {
    view = next;
    const superior = sceneId === "superior";
    if (view === "window") {
      camera.position.set(superior ? -185 : -130, 150, 420);
      camera.lookAt(superior ? -185 : -130, 133, 2);
      camera.fov = 44;
    } else {
      camera.position.set(
        superior ? 50 : 45,
        superior ? 218 : 202,
        superior ? 700 : 605,
      );
      camera.lookAt(superior ? -5 : -5, 122, 70);
      camera.fov = 46;
    }
    camera.updateProjectionMatrix();
  }
  function render() {
    if (disposed) return;
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    camera.aspect = r.width / r.height;
    const baseFov = view === "window" ? 44 : 46;
    camera.fov =
      (2 *
        Math.atan(
          Math.tan((baseFov * Math.PI) / 360) *
            Math.max(1, 1.55 / camera.aspect),
        ) *
        180) /
      Math.PI;
    camera.updateProjectionMatrix();
    pipeline.render(Math.round(r.width), Math.round(r.height));
  }
  function requestRender() {
    if (!renderRAF)
      renderRAF = requestAnimationFrame(() => {
        renderRAF = 0;
        render();
      });
  }
  const resize = new ResizeObserver(requestRender);
  resize.observe(canvas);
  async function applyItem(key, selection, scale = 1) {
    const material = mats[key],
      sequence = (serial[key] ?? 0) + 1;
    serial[key] = sequence;
    material.color.set(selection.colour);
    const prev = material.map;
    material.map = null;
    if (prev?.userData.hotelClone) {
      prev.dispose();
      ownedTextures.delete(prev);
    }
    material.needsUpdate = true;
    const fabric = selection.fabric;
    if (!fabric) return;
    if (fabric.brand === "Panaz" && !fabric.texture) {
      onStatus(
        "Panaz colour approximation from supplier imagery. Physical samples confirm colour, texture and sheerness.",
      );
      return;
    }
    if (!fabric.source || !safeImage(fabric.texture)) {
      onStatus(
        `${ITEMS[key]}: fabric saved; calibrated image unavailable. Showing the selected colour.`,
      );
      return;
    }
    try {
      const url = new URL(
        fabric.texture,
        fabric.texture.startsWith("/")
          ? config.catalogueOrigin
          : config.assetBase,
      ).href;
      const base = await loadTexture(url);
      if (sequence !== serial[key] || disposed) return;
      const texture = base.clone();
      texture.userData.hotelClone = true;
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.flipY = false;
      texture.repeat.set(
        scale / fabric.source.widthCm,
        1 / fabric.source.heightCm,
      );
      texture.needsUpdate = true;
      ownedTextures.add(texture);
      material.map = texture;
      material.color.set("#ffffff");
      material.needsUpdate = true;
      requestRender();
    } catch {
      if (sequence === serial[key])
        onStatus(
          `${ITEMS[key]}: image could not load. Your fabric reference is saved; selected colour shown. Retry the image when connected.`,
        );
    }
  }
  const signatures = {};
  async function update(scheme) {
    current = scheme;
    const changedScene = sceneId !== scheme.scene;
    const dimension = changedScene
      ? buildRoom(scheme.scene)
      : { windowWidth: sceneId === "superior" ? 310 : 230 };
    main.group.visible = scheme.layers !== "voile";
    sheer.group.visible = scheme.layers !== "curtains";
    main.setProgress(scheme.curtainOpen);
    sheer.setProgress(scheme.voileOpen);
    for (const child of sheer.group.children)
      if (child.material?.transparent) {
        child.material.opacity = scheme.voileOpacity;
        child.material.needsUpdate = true;
      }
    const pending = [];
    for (const key of Object.keys(ITEMS)) {
      const signature = JSON.stringify(scheme.items[key]);
      if (changedScene || signatures[key] !== signature) {
        signatures[key] = signature;
        pending.push(
          applyItem(
            key,
            scheme.items[key],
            ["curtains", "voile"].includes(key)
              ? dimension.windowWidth / 230
              : 1,
          ),
        );
      }
    }
    requestRender();
    await Promise.allSettled(pending);
    render();
  }
  const raycaster = new T.Raycaster();
  let pointerStart = null;
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      pointerStart = [e.clientX, e.clientY];
    },
    { signal: handlers.signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (
        !pointerStart ||
        Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) >
          10
      )
        return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new T.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((e.clientY - rect.top) / rect.height) * 2,
        ),
        camera,
      );
      const hit = raycaster
        .intersectObjects([roomGroup, main.group, sheer.group], true)
        .find((h) => h.object.userData.hotelItem);
      if (hit) {
        selected = hit.object.userData.hotelItem;
        onPick(selected);
      }
    },
    { signal: handlers.signal },
  );
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      onStatus(
        "The 3D preview paused because graphics memory is unavailable. Your project is retained. Reload to restore the preview.",
      );
    },
    { signal: handlers.signal },
  );
  return {
    update,
    view(next) {
      cameraView(next);
      requestRender();
    },
    render,
    capture() {
      render();
      return canvas.toDataURL("image/jpeg", 0.88);
    },
    proof() {
      return {
        scene: sceneId,
        view,
        selected,
        layers: current?.layers,
        curtainOpen: main.proof.progress,
        voileOpen: sheer.proof.progress,
        materials: Object.fromEntries(
          Object.entries(mats).map(([k, m]) => [
            k,
            {
              colour: m.color.getHexString(),
              texture: !!m.map,
              opacity: m.opacity,
            },
          ]),
        ),
        curtainZ: main.group.position.z,
        voileZ: sheer.group.position.z,
        meshBuilds: main.proof.meshBuilds + sheer.proof.meshBuilds,
      };
    },
    dispose() {
      disposed = true;
      handlers.abort();
      resize.disconnect();
      cancelAnimationFrame(renderRAF);
      main.dispose();
      sheer.dispose();
      disposeRoom();
      for (const t of ownedTextures) t.dispose();
      for (const [k, m] of Object.entries(mats))
        if (!["curtains", "voile"].includes(k)) m.dispose();
      Object.values(fixed).forEach((m) => m.dispose());
      exteriorMat.dispose();
      renderer.dispose();
    },
  };
}
