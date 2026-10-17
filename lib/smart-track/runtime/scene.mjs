import * as T from "three";
import { createTrackCloth } from "./cloth.mjs";
export async function createScene(host, config) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Illustrative curtain room preview",
  );
  renderer.domElement.setAttribute("role", "img");
  const scene = new T.Scene();
  scene.background = new T.Color("#e9e3d8");
  const camera = new T.PerspectiveCamera(43, 1, 1, 3000),
    hemi = new T.HemisphereLight("#fff6e9", "#8c8170", 2.5);
  scene.add(hemi);
  const key = new T.DirectionalLight("#fff4dd", 3);
  key.position.set(80, 350, 200);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -400,
    right: 400,
    top: 400,
    bottom: -400,
    near: 1,
    far: 1100,
  });
  key.shadow.bias = -0.0008;
  scene.add(key);
  const fill = new T.DirectionalLight("#dceaf4", 1.2);
  fill.position.set(-230, 200, 330);
  scene.add(fill);
  const cloth = createTrackCloth(T);
  scene.add(cloth.group);
  let room = new T.Group(),
    hardware = new T.Group(),
    currentRoom = "living",
    currentMotor = "RIGHT",
    currentMount = "CEILING",
    currentSystem = "FOREST_SHUTTLE_GO",
    evening = false,
    detail = false,
    texture = null,
    serial = 0;
  scene.add(room, hardware);
  const material = (color, roughness = 0.8) =>
    new T.MeshStandardMaterial({ color, roughness });
  function box(group, w, h, d, x, y, z, color) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function cylinder(group, r, h, x, y, z, color) {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, h, 40), material(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function disposeGroup(group) {
    group.traverse((o) => {
      o.geometry?.dispose();
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.dispose();
    });
    scene.remove(group);
  }
  function roomScene(id) {
    disposeGroup(room);
    room = new T.Group();
    scene.add(room);
    currentRoom = id;
    const railWidth = id === "patio" ? 400 : 230;
    cloth.setWidth(railWidth);
    const unsupported =
      texture && texture.userData.maximumClothCm < railWidth * 2;
    if (unsupported) {
      texture.dispose();
      texture = null;
      cloth.material.map = null;
      cloth.material.color.set("#c8b59e");
      cloth.material.needsUpdate = true;
    }
    const colors = {
        living: "#dfd6c7",
        bedroom: "#c8c5be",
        dining: "#d4bda5",
        office: "#b9c6bd",
        patio: "#e7e1d4",
      },
      wall = colors[id];
    box(room, 850, 10, 900, 0, -9, 190, "#bfa888");
    box(room, 850, 28, 12, 0, 272, -36, wall);
    const sideWidth = (850 - railWidth) / 2;
    for (const side of [-1, 1])
      box(
        room,
        sideWidth,
        550,
        12,
        side * (railWidth / 2 + sideWidth / 2),
        0,
        -36,
        wall,
      );
    box(room, 12, 550, 800, -420, 0, 300, wall);
    box(room, 12, 550, 800, 420, 0, 300, wall);
    box(
      room,
      railWidth - 4,
      240,
      2,
      0,
      122,
      -48,
      evening ? "#283b45" : "#b8c9c1",
    );
    for (const x of [-railWidth / 2 + 3, 0, railWidth / 2 - 3])
      box(room, 4, 244, 5, x, 122, -35, "#444d47");
    box(room, railWidth - 2, 4, 5, 0, 242, -35, "#444d47");
    for (let i = 0; i < 24; i++)
      box(room, 1, 1, 850, -390 + i * 34, -3, 180, "#a98d6c");
    box(
      room,
      330,
      1,
      260,
      -35,
      -2,
      220,
      id === "bedroom" ? "#ded7c9" : "#c6bbab",
    );
    if (id === "living") {
      box(room, 240, 28, 88, -100, 24, 260, "#87917b");
      box(room, 240, 62, 20, -100, 58, 218, "#8d967e");
      for (const x of [-214, 14]) box(room, 20, 48, 96, x, 40, 260, "#8d967e");
      for (const x of [-175, -100, -25]) {
        box(room, 69, 14, 70, x, 43, 253, "#b7bca6");
        box(room, 53, 40, 13, x, 72, 231, x === -100 ? "#8d987c" : "#d9bf9a");
      }
      cylinder(room, 54, 8, 40, 40, 140, "#806750");
      cylinder(room, 12, 36, 40, 18, 140, "#6d5948");
      cylinder(room, 12, 25, 40, 57, 140, "#d4c9b3");
    } else if (id === "bedroom") {
      box(room, 180, 88, 16, -110, 45, 260, "#8f958b");
      box(room, 180, 35, 215, -110, 20, 370, "#c6c0b2");
      box(room, 174, 17, 210, -110, 45, 365, "#ebe5da");
      for (const x of [-157, -64]) box(room, 70, 18, 43, x, 63, 290, "#e2d9c9");
      box(room, 178, 4, 70, -110, 57, 423, "#a7a694");
      for (const x of [-234, 15]) {
        cylinder(room, 27, 45, x, 22, 272, "#8c7359");
        cylinder(room, 9, 22, x, 56, 272, "#d2b77c");
        cylinder(room, 19, 24, x, 78, 272, "#eee0c2");
      }
    } else if (id === "dining") {
      box(room, 220, 8, 100, -35, 76, 250, "#947359");
      for (const x of [-125, 55])
        for (const z of [210, 290]) box(room, 9, 75, 9, x, 37, z, "#75583f");
      for (const x of [-100, 30])
        for (const z of [165, 335]) {
          box(room, 46, 8, 45, x, 44, z, "#8e9687");
          box(room, 45, 55, 8, x, 69, z + (z < 250 ? -20 : 20), "#a5ae9e");
        }
      cylinder(room, 17, 21, -35, 91, 250, "#e0d8c4");
      cylinder(room, 40, 14, -35, 215, 250, "#a18b60");
    } else if (id === "office") {
      box(room, 195, 7, 77, -50, 76, 190, "#b39673");
      for (const x of [-135, 35]) box(room, 8, 74, 65, x, 37, 190, "#574b3b");
      box(room, 65, 42, 4, -50, 104, 166, "#39463e");
      box(room, 42, 4, 25, -50, 83, 193, "#655c4c");
      box(room, 55, 10, 50, -50, 47, 276, "#778579");
      box(room, 55, 59, 10, -50, 80, 300, "#849184");
      box(room, 80, 170, 35, 260, 85, 0, "#9c7f5f");
      for (let i = 0; i < 5; i++)
        box(room, 74, 3, 40, 260, i * 35 + 10, 5, "#c7b18f");
    } else {
      box(room, 330, 12, 150, 0, -16, -128, "#a69e8c");
      for (const x of [-285, 285]) {
        cylinder(room, 33, 45, x, 22, 30, "#c7bba4");
        for (let j = 0; j < 5; j++) {
          const leaf = cylinder(
            room,
            16,
            65,
            x + Math.sin(j) * 18,
            74,
            30 + Math.cos(j) * 18,
            "#63735a",
          );
          leaf.rotation.z = Math.sin(j) * 0.3;
        }
      }
      box(room, 130, 22, 70, 235, 30, 265, "#e1d8c8");
      box(room, 130, 42, 12, 235, 53, 296, "#c4b69e");
      cylinder(room, 38, 46, 128, 23, 220, "#a58a68");
    }
    // Room geometry is illustrative and never uses the ordered dimensions.
    setHardware(currentMotor, currentMount, currentSystem);
    updateView();
    render();
    return !unsupported;
  }
  function setHardware(
    side = "RIGHT",
    mount = "CEILING",
    system = "FOREST_SHUTTLE_GO",
  ) {
    disposeGroup(hardware);
    hardware = new T.Group();
    scene.add(hardware);
    currentMotor = side;
    currentMount = mount;
    currentSystem = system;
    const half = currentRoom === "patio" ? 200 : 115,
      ion = system === "FOREST_SHUTTLE_ION";
    box(hardware, half * 2 + 8, 2.5, 3.5, 0, 253, 0, "#eeeae1");
    for (const x of [-half + 15, 0, half - 15]) {
      box(hardware, 7, 1, 8, x, 255, -1, "#e5e2db");
      if (mount === "WALL") {
        box(hardware, 3, 2, 25, x, 257, -14, "#e5e2db");
        box(hardware, 7, 11, 2, x, 254, -27, "#e5e2db");
      }
    }
    const x = side === "LEFT" ? -half - 4 : half + 4;
    box(
      hardware,
      ion ? 7.4 : 7.1,
      ion ? 31.7 : 29,
      5,
      x,
      ion ? 234.5 : 236,
      1,
      "#f1efea",
    );
    if (ion) {
      box(hardware, 5, 13, 1, x, 228, 4, "#d9d7d0");
    } else box(hardware, 0.6, 45, 0.6, x, 199, -2, "#c6bba9");
    updateView();
    render();
  }
  function updateView() {
    const motorX =
      (currentRoom === "patio" ? 200 : 115) *
      (currentMotor === "LEFT" ? -1 : 1);
    if (detail) {
      camera.position.set(
        motorX + (currentMotor === "LEFT" ? -65 : 65),
        263,
        100,
      );
      camera.lookAt(motorX, 242, 0);
      camera.fov = 32;
    } else {
      camera.position.set(
        currentRoom === "bedroom" ? 240 : 135,
        185,
        currentRoom === "bedroom" ? 720 : currentRoom === "patio" ? 770 : 590,
      );
      camera.lookAt(-5, 122, 70);
      camera.fov = 43;
    }
    camera.updateProjectionMatrix();
  }
  function render() {
    renderer.render(scene, camera);
  }
  function resize() {
    const r = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  roomScene("living");
  setHardware();
  resize();
  async function setFabric(record) {
    const request = ++serial;
    const [{ FABRICS }, { texturePlan }, { previewPlan }] = await Promise.all([
      import(config.visualiserBase + "fabrics.mjs"),
      import(config.visualiserBase + "core.mjs"),
      import(config.visualiserBase + "rooms/catalogue-contract.mjs"),
    ]);
    const plan = previewPlan(record, FABRICS),
      f = FABRICS.find((f) => f.id === plan.engineId);
    if (request !== serial) return false;
    if (
      !f ||
      plan.state !== "ready" ||
      (f.mode === "patterned" &&
        (!f.physicalClothCm ||
          f.physicalClothCm[0] < (currentRoom === "patio" ? 800 : 460) ||
          f.physicalClothCm[1] < 250))
    ) {
      texture?.dispose();
      texture = null;
      cloth.material.map = null;
      cloth.material.color.set("#c8b59e");
      cloth.material.needsUpdate = true;
      render();
      return false;
    }
    const mapping = texturePlan(f);
    if (!mapping.scale) return false;
    const url = new URL(f.image, config.visualiserBase).href;
    const next = await new T.TextureLoader().loadAsync(url);
    if (request !== serial) {
      next.dispose();
      return false;
    }
    next.userData.maximumClothCm =
      f.mode === "plain" ? Infinity : f.physicalClothCm[0];
    next.colorSpace = T.SRGBColorSpace;
    next.flipY = false;
    next.wrapS = next.wrapT =
      f.mode === "plain" ? T.MirroredRepeatWrapping : T.ClampToEdgeWrapping;
    next.repeat.set(...mapping.scale);
    next.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    texture?.dispose();
    texture = next;
    cloth.material.map = next;
    cloth.material.color.set("#fff");
    cloth.material.needsUpdate = true;
    render();
    return true;
  }
  return {
    setRoom: roomScene,
    setPosition(p, mode) {
      cloth.setPosition(p, mode);
      render();
    },
    setHardware,
    setFabric,
    setEvening(value) {
      evening = value;
      hemi.intensity = value ? 0.7 : 2.5;
      key.intensity = value ? 1.1 : 3;
      fill.intensity = value ? 0.25 : 1.2;
      scene.background.set(value ? "#394344" : "#e9e3d8");
      roomScene(currentRoom);
    },
    setDetail(value) {
      detail = value;
      updateView();
      render();
    },
    dispose() {
      serial++;
      observer.disconnect();
      disposeGroup(room);
      disposeGroup(hardware);
      texture?.dispose();
      cloth.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
