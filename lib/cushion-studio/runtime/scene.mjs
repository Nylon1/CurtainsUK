// Original procedural furniture and cushion geometry, authored for Cushion Studio.
// All cloth UVs describe finite physical source coverage; no inferred repeats.
import {
  panelPoint,
  squarePreviewPoint,
  panelSourceUv,
  sizeOf,
  pipingPreviewSegments,
  SQUARE_SOFA_LEAN,
  SQUARE_SOFA_YAW,
  squareSeatContactY,
  squareSofaBounds,
  squarePanelAxis,
  squarePreviewFitsSource,
  squareInspectionCamera,
  cushionInspectionTransition,
  inspectionRotation,
  SHAPED_CONSTRUCTION_VERSION,
  shapedPanelPoint,
  shapedPanelAxis,
  roundPanelPoint,
  roundPreviewPoint,
  roundPreviewFitsSource,
  bolsterBodyPoint,
  bolsterEndPoint,
  shapeDrapeFitsSource,
} from "./geometry.mjs";
import { planArrangement, furniturePose } from "./arrangement.mjs";
import { defaultVisualFill } from "./state.mjs";
export { sizeOf } from "./geometry.mjs";
export async function createStudioScene(
  container,
  { threeUrl, onSelect, onMove, onRenderError, onInspectionStatus },
) {
  const T = await import(threeUrl);
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.replaceChildren(renderer.domElement);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(35, 1, 0.01, 50),
    room = new T.Group(),
    cushions = new T.Group();
  scene.add(room, cushions);
  const ambient = new T.HemisphereLight(0xffffff, 0xa79c87, 1.7);
  scene.add(ambient);
  const light = new T.DirectionalLight(0xfff3db, 3);
  light.position.set(-3, 6, 4);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, {
    left: -5,
    right: 5,
    top: 5,
    bottom: -5,
    near: 0.1,
    far: 15,
  });
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.018;
  light.shadow.intensity = 0.55;
  light.shadow.radius = 3;
  scene.add(light);
  const fill = new T.DirectionalLight(0xdbe8fa, 1.5);
  fill.position.set(4, 2, 1);
  scene.add(fill);
  const textures = new Map();
  const textureReadiness = new Map();
  let roomKey = "",
    current,
    selected,
    face = "front",
    inspectionAngle = "straight",
    roundPreview = "soft-fill",
    previewShape = "baseline",
    previewShapes = {},
    mode = "configurator",
    view = "wide",
    disposed = false,
    frame = 0,
    rotationTransition = null,
    down = null;
  const mat = (color, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.93, ...extra });
  function mesh(geo, material, parent = room) {
    const m = new T.Mesh(geo, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function block(w, h, d, x, y, z, color, r = 0.04, parent = room) {
    const shape = new T.Shape(),
      a = w / 2 - r,
      b = h / 2 - r;
    shape.moveTo(-a, -h / 2);
    shape.lineTo(a, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -b);
    shape.lineTo(w / 2, b);
    shape.quadraticCurveTo(w / 2, h / 2, a, h / 2);
    shape.lineTo(-a, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, b);
    shape.lineTo(-w / 2, -b);
    shape.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
    const g = new T.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, d - 2 * r),
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: r,
      bevelThickness: r,
      curveSegments: 8,
    });
    g.translate(0, 0, -d / 2 + r);
    const m = mesh(g, mat(color), parent);
    m.position.set(x, y, z);
    return m;
  }
  function disposeGroup(group) {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose();
      });
    }
  }
  function roomScene(design) {
    disposeGroup(room);
    const c = design.colours,
      floor = c.floor || "#b5a18a";
    scene.background = new T.Color(c.wall || "#e8e3d8");
    if (mode === "configurator") {
      const ground = mesh(new T.PlaneGeometry(20, 20), mat("#e9e4da"));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.005;
      return;
    }
    const ground = mesh(new T.PlaneGeometry(16, 16), mat(floor));
    ground.rotation.x = -Math.PI / 2;
    const wall = mesh(new T.PlaneGeometry(14, 6), mat(c.wall));
    wall.position.set(0, 2, -1.15);
    if (!["#d2cbbf", "#777c7b", "#e1dcd2"].includes(c.floor))
      for (let x = -5; x <= 5; x += 0.22) {
        const line = mesh(new T.BoxGeometry(0.002, 0.001, 10), mat("#6f5a44"));
        line.position.set(x, 0.002, 0);
        line.material.transparent = true;
        line.material.opacity = 0.13;
      }
    block(5, 0.035, 0.025, 0, 0.075, -1.12, "#e8e2d7", 0.005);
    const rug = mesh(new T.BoxGeometry(3.7, 0.018, 2.5), mat("#d9d1bd"));
    rug.position.set(0, 0.014, 0.75);
    for (let i = 0; i < 14; i++) {
      const line = mesh(new T.BoxGeometry(3.65, 0.002, 0.006), mat("#c9c0aa"));
      line.position.set(0, 0.025, -0.4 + i * 0.18);
    }
    const bed = design.scene.includes("bed"),
      arm = design.scene === "armchair",
      wide = design.scene === "sofa-3" || design.scene === "corner",
      width = bed
        ? design.scene === "king-bed"
          ? 1.7
          : 1.45
        : arm
          ? 1.05
          : wide
            ? 2.5
            : 1.9;
    if (bed) {
      block(width + 0.15, 1.12, 0.16, 0, 0.68, -0.65, c.furniture, 0.09);
      block(width, 0.32, 2, 0, 0.3, 0.28, "#e9e4da", 0.07);
      block(width + 0.05, 0.16, 2.02, 0, 0.48, 0.28, c.bedCover || "#f7f4ed", 0.045);
      block(width + 0.07, 0.05, 0.8, 0, 0.59, 0.88,
        c.bedCover ? new T.Color(c.bedCover).lerp(new T.Color("#ffffff"), .14) : "#9b9f95", 0.02);
      for (const x of [-width * 0.24, width * 0.24])
        block(width * 0.43, 0.34, 0.13, x, 0.75, -0.25, "#f0ece3", 0.075);
    } else {
      block(width, 0.26, 0.82, 0, 0.31, 0, c.furniture, 0.06);
      block(width - 0.1, 0.66, 0.24, 0, 0.66, -0.31, c.furniture, 0.065);
      const seats = arm ? 1 : wide ? 3 : 2;
      for (let i = 0; i < seats; i++)
        block(
          (width - 0.31) / seats - 0.015,
          0.18,
          0.64,
          -(width - 0.31) / 2 + ((i + 0.5) * (width - 0.31)) / seats,
          0.49,
          0.09,
          c.furniture,
          0.045,
        );
      for (const x of [-width / 2 + 0.07, width / 2 - 0.07])
        block(0.22, 0.46, 0.86, x, 0.54, 0, c.furniture, 0.045);
      if (design.scene === "corner") {
        block(0.77, 0.27, 1.1, width / 2 - 0.5, 0.31, 0.83, c.furniture, 0.06);
        block(
          0.73,
          0.18,
          1.08,
          width / 2 - 0.5,
          0.49,
          0.82,
          c.furniture,
          0.045,
        );
      }
      for (const x of [-width / 2 + 0.18, width / 2 - 0.18])
        for (const z of [-0.25, 0.26]) {
          const leg = mesh(
            new T.CylinderGeometry(0.025, 0.019, 0.2, 12),
            mat("#63503d"),
          );
          leg.position.set(x, 0.11, z);
        }
    }
    // Original gallery print, side table and floor lamp; no external art or models.
    block(0.67, 0.87, 0.04, -1.15, 1.63, -1.09, "#c0a887", 0.005);
    block(0.61, 0.81, 0.015, -1.15, 1.63, -1.06, "#eee5d5", 0.003);
    const art = mesh(new T.CircleGeometry(0.21, 64), mat("#9f9e89"));
    art.scale.set(1, 1.35, 1);
    art.position.set(-1.15, 1.64, -1.048);
    const table = mesh(
      new T.CylinderGeometry(0.29, 0.29, 0.055, 48),
      mat("#8a6b4b"),
    );
    table.position.set(-width / 2 - 0.51, 0.48, 0.02);
    const stem = mesh(
      new T.CylinderGeometry(0.055, 0.13, 0.46, 24),
      mat("#775b40"),
    );
    stem.position.set(-width / 2 - 0.51, 0.23, 0.02);
    const vase = mesh(new T.SphereGeometry(0.1, 32, 20), mat("#c1bba8"));
    vase.scale.set(0.7, 1.4, 0.7);
    vase.position.set(-width / 2 - 0.51, 0.61, 0.02);
    const lampX = width / 2 + 0.49;
    const pole = mesh(
      new T.CylinderGeometry(0.012, 0.012, 1.5, 12),
      mat("#8b7454", { metalness: 0.6, roughness: 0.4 }),
    );
    pole.position.set(lampX, 0.75, -0.45);
    const shade = mesh(
      new T.CylinderGeometry(0.18, 0.28, 0.32, 40, 1, true),
      mat("#e8d9bc", { side: T.DoubleSide }),
    );
    shade.position.set(lampX, 1.5, -0.45);
    const base = mesh(
      new T.CylinderGeometry(0.2, 0.2, 0.025, 32),
      mat("#8b7454"),
    );
    base.position.set(lampX, 0.015, -0.45);
    // Original supporting furniture; scene props never enter the cushion order.
    const wood = "#947454", darkWood = "#68503b";
    function books(x,y,z) {
      for(let i=0;i<3;i++) {
        const book=block(.22-i*.015,.022,.15,x+(i-1)*.008,y+i*.025,z,
          ["#c6b69e","#7c8b80","#e2d7c6"][i],.003);
        book.rotation.y=(i-1)*.09;
      }
    }
    const cabinetX=width/2+(bed?.43:.95), cabinetZ=bed?.12:-.78;
    block(.54,.43,.42,cabinetX,.38,cabinetZ,wood,.018);
    block(.56,.035,.44,cabinetX,.61,cabinetZ,"#af9271",.008);
    for(const dx of [-.2,.2]) for(const dz of [-.14,.14])
      block(.035,.17,.035,cabinetX+dx,.085,cabinetZ+dz,darkWood,.004);
    for(const y of [.31,.48]) {
      block(.49,.145,.012,cabinetX,y,cabinetZ+.218,"#9c7d5c",.006);
      block(.1,.012,.015,cabinetX,y,cabinetZ+.232,"#594a39",.004);
    }
    books(cabinetX-.08,.64,cabinetZ);
    if(bed) {
      block(width*.7,.09,.34,0,.36,1.66,"#c8bca7",.035);
      for(const x of [-width*.27,width*.27]) for(const z of [1.55,1.77])
        block(.045,.31,.045,x,.155,z,darkWood,.006);
    } else {
      const tableX=design.scene==='corner'?-.45:0,
        tableZ=arm?1.06:1.24, tableW=arm?.65:design.scene==='corner'?.88:1.04;
      block(tableW,.055,.53,tableX,.355,tableZ,wood,.025);
      for(const dx of [-tableW*.36,tableW*.36]) for(const dz of [-.17,.17])
        block(.038,.32,.038,tableX+dx,.16,tableZ+dz,darkWood,.005);
      books(tableX-.12,.395,tableZ);
      const bowl=mesh(new T.SphereGeometry(.1,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),mat("#ddd1bb",{side:T.DoubleSide}));
      bowl.position.set(tableX+tableW*.28,.415,tableZ+.05);bowl.scale.y=.38;
    }
    const plantX=-width/2-.92, plantZ=-.68;
    const pot=mesh(new T.CylinderGeometry(.16,.12,.27,28),mat("#b9aa91"));
    pot.position.set(plantX,.135,plantZ);
    const soil=mesh(new T.CircleGeometry(.148,28),mat("#514439"));
    soil.rotation.x=-Math.PI/2;soil.position.set(plantX,.273,plantZ);
    const trunk=mesh(new T.CylinderGeometry(.012,.022,.82,10),mat("#76634b"));
    trunk.position.set(plantX,.68,plantZ);
    for(let i=0;i<11;i++) {
      const a=i*2.4, height=.55+i*.055, reach=.15+.025*Math.sin(i*1.7);
      const leaf=mesh(new T.SphereGeometry(1,16,10),mat(i%2?"#596e48":"#708057"));
      leaf.scale.set(.075,.18,.018);
      leaf.position.set(plantX+Math.cos(a)*reach,height,plantZ+Math.sin(a)*reach);
      leaf.rotation.set(.3*Math.sin(a),-a,.65*Math.cos(a));
      const start=new T.Vector3(plantX,height-.10,plantZ),end=leaf.position.clone(),direction=end.clone().sub(start);
      const branch=mesh(new T.CylinderGeometry(.003,.005,direction.length(),6),mat("#68714c"));
      branch.position.copy(start.add(end).multiplyScalar(.5));
      branch.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    }
  }
  function texture(fabric) {
    if (!fabric?.calibration || !fabric.imageUrl) return null;
    const key = fabric.imageUrl;
    if (textures.has(key)) return textures.get(key);
    let settleTexture;
    textureReadiness.set(key,new Promise((resolve)=>{settleTexture=resolve;}));
    const texture = new T.TextureLoader().load(
      key,
      (loaded) => {
        const max = matchMedia("(max-width:760px)").matches ? 1024 : 2048,
          source = loaded.image;
        if (Math.max(source.width, source.height) > max) {
          const ratio = max / Math.max(source.width, source.height),
            canvas = document.createElement("canvas");
          canvas.width = Math.round(source.width * ratio);
          canvas.height = Math.round(source.height * ratio);
          canvas
            .getContext("2d")
            .drawImage(source, 0, 0, canvas.width, canvas.height);
          loaded.image = canvas;
          loaded.needsUpdate = true;
        }
        draw();
        settleTexture(true);
      },
      undefined,
      () => {
        textures.delete(key);
        settleTexture(false);
        onRenderError?.(
          "Fabric image could not load. Please try another fabric.",
        );
      },
    );
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.set(key, texture);
    const activeIds = new Set(
      current?.design.pieces.flatMap((p) => [
        p.spec.fabricId,
        p.spec.pipingFabricId,
      ]),
    );
    const activeUrls = new Set(
      current?.fabrics
        .filter((f) => activeIds.has(f.id))
        .map((f) => f.imageUrl),
    );
    for (const [url, cached] of textures) {
      if (textures.size <= 12) break;
      if (!activeUrls.has(url)) {
        cached.dispose();
        textures.delete(url);
        textureReadiness.delete(url);
      }
    }
    return texture;
  }
  function clothMaterial(fabric) {
    return mat(fabric?.calibration ? "#ffffff" : "#c0b7a5", {
      map: texture(fabric),
      side: T.DoubleSide,
    });
  }
  function geometry(positions, uvs, indices) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  function visualPanelPoint(input) {
    return input.shaped
      ? shapedPanelPoint({...input, shape: input.shaped})
      : input.square
      ? squarePreviewPoint(input, previewShape)
      : panelPoint(input);
  }
  function panel(w, h, round, back, fabric, placement, square = false, shaped = null) {
    const pos = [],
      uv = [],
      idx = [],
      xs = shaped ? shapedPanelAxis(w * 1000) : square
        ? squarePanelAxis(w * 1000)
        : Array.from({ length: 49 }, (_, i) => i / 48),
      ys = shaped ? shapedPanelAxis(h * 1000) : square
        ? squarePanelAxis(h * 1000)
        : Array.from({ length: 49 }, (_, i) => i / 48),
      nx = xs.length - 1,
      ny = ys.length - 1,
      c = fabric?.calibration;
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        const p = visualPanelPoint({
          u: xs[x],
          v: ys[y],
          widthMm: w * 1000,
          heightMm: h * 1000,
          back,
          round,
          square,
          shaped,
        });
        pos.push(p.x, p.y, p.z);
        uv.push(
          ...(c
            ? panelSourceUv({
                u: p.clothU,
                v: p.clothV,
                placementMm: placement,
                physicalWidthMm: c.physicalWidthMm,
                physicalHeightMm: c.physicalHeightMm,
                widthMm: w * 1000,
                heightMm: h * 1000,
              })
            : [p.clothU, p.clothV]),
        );
        if (x < nx && y < ny) {
          const i = y * (nx + 1) + x;
          idx.push(i, i + 1, i + nx + 1, i + 1, i + nx + 2, i + nx + 1);
        }
      }
    return geometry(pos, uv, idx);
  }
  function squareSewnEdge(size, back, fabric, placement, parent, shaped = null) {
    const positions = [],
      uvs = [],
      indices = [];
    const c = fabric?.calibration;
    // A 1 mm tonal folded edge, using the exact underlying cloth coordinates.
    // This flat surface detail is not piping and adds no cord or substitute artwork.
    for (let side = 0; side < 4; side++) {
      const start = positions.length / 3;
      for (let i = 0; i <= 64; i++)
        for (const inset of [1.5, 2.5]) {
          const x = inset / size.widthMm,
            y = inset / size.heightMm,
            t = i / 64;
          const u =
            side === 0
              ? x + t * (1 - 2 * x)
              : side === 1
                ? 1 - x
                : side === 2
                  ? 1 - x - t * (1 - 2 * x)
                  : x;
          const v =
            side === 0
              ? y
              : side === 1
                ? y + t * (1 - 2 * y)
                : side === 2
                  ? 1 - y
                  : 1 - y - t * (1 - 2 * y);
          const p = visualPanelPoint({
            u,
            v,
            widthMm: size.widthMm,
            heightMm: size.heightMm,
            back,
            square: true,
            shaped,
          });
          positions.push(p.x, p.y, p.z + (back ? -1 : 1) * 0.00012);
          uvs.push(
            ...(c
              ? panelSourceUv({
                  u: p.clothU,
                  v: p.clothV,
                  placementMm: placement,
                  physicalWidthMm: c.physicalWidthMm,
                  physicalHeightMm: c.physicalHeightMm,
                  widthMm: size.widthMm,
                  heightMm: size.heightMm,
                })
              : [u, v]),
          );
        }
      for (let i = 0; i < 64; i++) {
        const j = start + i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const material = clothMaterial(fabric);
    material.color.setRGB(0.84, 0.84, 0.84);
    mesh(geometry(positions, uvs, indices), material, parent);
  }
  function radialPanel(size, back, fabric, placement, end = false, seamOnly = false) {
    const positions = [], uvs = [], indices = [], c = fabric?.calibration;
    const radii = seamOnly ? [1 - 5 / size.heightMm, 1 - 3 / size.heightMm]
      : [...new Set([...Array.from({length:41}, (_,i)=>i/40), 0.96, 0.975, 0.985, 0.99, 0.992, 0.994, 0.996, 0.998, 0.999, 1])].sort((a,b)=>a-b);
    const segments = end ? 96 : 192;
    for(let r=0;r<radii.length;r++) for(let a=0;a<=segments;a++) {
      const input = {radiusFraction:radii[r], angle:a/segments*Math.PI*2, diameterMm:size.heightMm, lengthMm:size.widthMm, back};
      const p = end ? bolsterEndPoint(input) : roundPreview === "baseline" ? roundPanelPoint(input) : roundPreviewPoint(input);
      if(seamOnly) { if(end) p.x += (back ? -1:1)*0.00012; else p.z += (back ? -1:1)*0.00012; }
      positions.push(p.x,p.y,p.z);
      uvs.push(...(c ? panelSourceUv({u:p.clothU,v:p.clothV,placementMm:placement,physicalWidthMm:c.physicalWidthMm,physicalHeightMm:c.physicalHeightMm,widthMm:size.heightMm,heightMm:size.heightMm}) : [p.clothU,p.clothV]));
      if(r<radii.length-1 && a<segments) { const i=r*(segments+1)+a; indices.push(i,i+1,i+segments+1,i+1,i+segments+2,i+segments+1); }
    }
    return geometry(positions,uvs,indices);
  }
  function shapedBolster(size, spec, fabric, fabrics, group) {
    const pos=[],uv=[],idx=[],c=fabric?.calibration, segments=128;
    for(let x=0;x<=8;x++) for(let a=0;a<=segments;a++) {
      const p=bolsterBodyPoint({along:x/8,around:a/segments,lengthMm:size.widthMm,diameterMm:size.heightMm});
      pos.push(p.x,p.y,p.z);
      uv.push(...(c ? panelSourceUv({u:p.clothU,v:p.clothV,placementMm:spec.placementMm,physicalWidthMm:c.physicalWidthMm,physicalHeightMm:c.physicalHeightMm,widthMm:size.widthMm,heightMm:Math.PI*size.heightMm}) : [p.clothU,p.clothV]));
      if(x<8 && a<segments) {const i=x*(segments+1)+a;idx.push(i,i+1,i+segments+1,i+1,i+segments+2,i+segments+1);}
    }
    mesh(geometry(pos,uv,idx),clothMaterial(fabric),group);
    for(const back of [false,true]) {
      const placement=spec.bolsterEndPlacementMm || spec.placementMm;
      mesh(radialPanel(size,back,fabric,placement,true),clothMaterial(fabric),group);
      const points=Array.from({length:96},(_,i)=>{const p=bolsterEndPoint({radiusFraction:1,angle:i/96*Math.PI*2,lengthMm:size.widthMm,diameterMm:size.heightMm,back});return new T.Vector3(p.x,p.y,p.z);});
      piping(points,spec,fabrics,group,back?Math.PI*size.heightMm:0);
      if(spec.edge==="unpiped") {const material=clothMaterial(fabric);material.color.setRGB(.84,.84,.84);mesh(radialPanel(size,back,fabric,placement,true,true),material,group);}
    }
  }
  function piping(points, spec, fabrics, parent, offsetMm = 0) {
    if (spec.edge === "unpiped") return;
    const fabric = fabrics.find(
      (f) =>
        f.id ===
        (spec.edge === "contrast" ? spec.pipingFabricId : spec.fabricId),
    );
    const path = new T.CatmullRomCurve3(points, true);
    const plan = current?.previewMaterials?.[spec.id]?.piping,
      lengthMm = path.getLength() * 1000,
      segments = pipingPreviewSegments(
        plan,
        fabric?.calibration,
        lengthMm,
        offsetMm,
      );
    if (segments) {
      for (const segment of segments) {
        class StripPath extends T.Curve {
          getPoint(t) {
            return path.getPointAt(
              (segment.startMm + t * segment.lengthMm) / lengthMm,
            );
          }
        }
        const tube = new T.TubeGeometry(
            new StripPath(),
            Math.max(12, Math.ceil(segment.lengthMm / 8)),
            plan.cordDiameterMm / 2000,
            8,
            false,
          ),
          uv = tube.attributes.uv,
          c = fabric.calibration;
        for (let i = 0; i < uv.count; i++)
          uv.setXY(
            i,
            (segment.xMm + uv.getX(i) * segment.lengthMm) / c.physicalWidthMm,
            1 -
              (segment.yMm + uv.getY(i) * segment.visibleBandMm) /
                c.physicalHeightMm,
          );
        mesh(tube, clothMaterial(fabric), parent);
      }
      return;
    }
    const tube = new T.TubeGeometry(path, 160, 0.003, 8, true);
    const c = fabric?.calibration;
    const uv = tube.attributes.uv;
    if (c)
      for (let i = 0; i < uv.count; i++) {
        // Piping strip rules are unconfirmed: sample a colour only, never compress or invent a full-width strip.
        uv.setXY(i, 0.5, 0.5);
      }
    mesh(tube, clothMaterial(fabric), parent);
  }
  function makeCushion(piece, fabrics) {
    previewShape =
      previewShapes[piece.spec.id] || defaultVisualFill(piece.spec);
    const spec = piece.spec,
      selectedFabric = fabrics.find((f) => f.id === spec.fabricId),
      size = sizeOf(spec.sizeId),
      shaped = spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION,
      fabric =
        (shaped && size.shape === "round" && roundPreview !== "baseline" && !roundPreviewFitsSource(size,selectedFabric?.calibration,spec.placementMm)) || (shaped && !shapeDrapeFitsSource(size,selectedFabric?.calibration,spec.placementMm,spec.bolsterEndPlacementMm)) || (size.shape === "square" &&
        !squarePreviewFitsSource(
          size,
          selectedFabric?.calibration,
          spec.placementMm,
          previewShape,
        ))
          ? null
          : selectedFabric,
      group = new T.Group();
    group.userData.pieceId = spec.id;
    if (size.shape === "bolster" && shaped) {
      shapedBolster(size,spec,fabric,fabrics,group);
    } else if (size.shape === "bolster") {
      const c = fabric?.calibration,
        geo = new T.CylinderGeometry(0.115, 0.115, 0.56, 72, 1, true);
      geo.rotateZ(-Math.PI / 2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const circumference = uv.getX(i) * Math.PI * 230,
          along = uv.getY(i) * 560;
        uv.setXY(
          i,
          c
            ? ((spec.placementMm.x || 0) + along) / c.physicalWidthMm
            : along / 560,
          c
            ? 1 -
                ((spec.placementMm.y || 0) + circumference) / c.physicalHeightMm
            : 1 - circumference / (Math.PI * 230),
        );
      }
      mesh(geo, clothMaterial(fabric), group);
      for (const side of [-1, 1]) {
        const geo = new T.CircleGeometry(0.115, 72),
          uv = geo.attributes.uv,
          p = spec.bolsterEndPlacementMm || spec.placementMm;
        for (let i = 0; i < uv.count; i++)
          uv.setXY(
            i,
            c ? (p.x + uv.getX(i) * 230) / c.physicalWidthMm : uv.getX(i),
            c
              ? 1 - (p.y + (1 - uv.getY(i)) * 230) / c.physicalHeightMm
              : uv.getY(i),
          );
        const cap = mesh(geo, clothMaterial(fabric), group);
        cap.rotation.y = (side * Math.PI) / 2;
        cap.position.x = side * 0.28;
        const points = Array.from({ length: 96 }, (_, i) => {
          const a = (i / 96) * Math.PI * 2;
          return new T.Vector3(
            side * 0.28,
            Math.sin(a) * 0.115,
            Math.cos(a) * 0.115,
          );
        });
        piping(points, spec, fabrics, group, side > 0 ? Math.PI * 230 : 0);
      }
    } else {
      const w = size.widthMm / 1000,
        h = size.heightMm / 1000;
      mesh(
        shaped && size.shape === "round" ? radialPanel(size,false,fabric,spec.placementMm) : panel(
          w,
          h,
          size.shape === "round",
          false,
          fabric,
          spec.placementMm,
          size.shape === "square",
          shaped ? size.shape : null,
        ),
        clothMaterial(fabric),
        group,
      );
      mesh(
        shaped && size.shape === "round" ? radialPanel(size,true,fabric,spec.placementMm) : panel(
          w,
          h,
          size.shape === "round",
          true,
          fabric,
          spec.placementMm,
          size.shape === "square",
          shaped ? size.shape : null,
        ),
        clothMaterial(fabric),
        group,
      );
      const points = [];
      if(shaped && size.shape === "round") {
        for(let i=0;i<128;i++) {const p=(roundPreview === "baseline" ? roundPanelPoint : roundPreviewPoint)({radiusFraction:1,angle:i/128*Math.PI*2,diameterMm:size.heightMm}); points.push(new T.Vector3(p.x,p.y,p.z));}
      } else for (let side = 0; side < 4; side++)
        for (let i = 0; i < 32; i++) {
          const t = i / 32,
            u = side === 0 ? t : side === 1 ? 1 : side === 2 ? 1 - t : 0,
            v = side === 0 ? 0 : side === 1 ? t : side === 2 ? 1 : 1 - t,
            p = visualPanelPoint({
              u,
              v,
              widthMm: size.widthMm,
              heightMm: size.heightMm,
              round: size.shape === "round",
              square: size.shape === "square",
              shaped: shaped ? size.shape : null,
            });
          points.push(new T.Vector3(p.x, p.y, 0));
        }
      piping(points, spec, fabrics, group);
      if ((size.shape === "square" || (shaped && size.shape !== "round")) && spec.edge === "unpiped") {
        squareSewnEdge(size, false, fabric, spec.placementMm, group,shaped?size.shape:null);
        squareSewnEdge(size, true, fabric, spec.placementMm, group,shaped?size.shape:null);
      } else if(shaped && size.shape === "round" && spec.edge === "unpiped") {
        for(const back of [false,true]) { const material=clothMaterial(fabric);material.color.setRGB(.90,.90,.90);mesh(radialPanel(size,back,fabric,spec.placementMm,false,true),material,group); }
      }
      // Close the seam without extending fabric artwork beyond a source panel.
      // The front/back meet at a closed zero-depth seam.
    }
    group.traverse((o) => {
      if (o.isMesh) o.userData.pieceId = spec.id;
    });
    return group;
  }
  function setCamera() {
    if (mode === "configurator") {
      const s = current?.design.pieces.find((p) => p.spec.id === selected),
        size = sizeOf(s?.spec.sizeId);
      const factor =
        size.shape === "bolster"
          ? 1.15
          : Math.max(size.widthMm, size.heightMm) / 450;
      camera.position.set(0.13 * factor, 0.47 * factor, 1.2 * factor);
      if (size.shape === "square") {
        const position = squareInspectionCamera(
          size.widthMm,
          size.heightMm,
          inspectionAngle,
        );
        camera.position.set(position.x, position.y, position.z);
      } else {
        const product=cushions.children.find((group)=>group.userData.pieceId===selected);
        const targetY=product ? new T.Box3().setFromObject(product).getCenter(new T.Vector3()).y : size.heightMm/2000;
        camera.position.set(
          inspectionAngle==="side" ? 1.25*factor : inspectionAngle==="three-quarter" ? (size.shape === "round" ? .95 : .65)*factor : 0,
          targetY+(inspectionAngle==="three-quarter" ? .17*factor:0),
          inspectionAngle==="side" ? 0 : inspectionAngle==="three-quarter" ? (size.shape === "round" ? .95 : 1.08)*factor : 1.25*factor,
        );
        if(size.shape==="bolster" && face.startsWith("end")) camera.position.set(1.15,targetY,0);
        camera.lookAt(0,targetY,0);
        camera.updateProjectionMatrix();
        return;
      }
      if (size.shape === "bolster")
        camera.position.set(
          face.startsWith("end") ? 1.05 : 0.56,
          0.48,
          face.startsWith("end") ? 0.12 : 1.28,
        );
      camera.lookAt(
        0,
        size.shape === "square" ? size.heightMm / 2000 : 0.29 * factor,
        0,
      );
    } else {
      camera.position.set(
        view === "close" ? 1.8 : 3.2,
        view === "close" ? 1.6 : 2.25,
        view === "close" ? 3.2 : 4.5,
      );
      camera.lookAt(0, 0.6, 0.05);
    }
    camera.updateProjectionMatrix();
  }
  function update(design, fabrics, options = {}) {
    const previousSelected = selected,
      previousMode = mode;
    const previousRotation = cushions.children.find(
      (group) => group.userData.pieceId === previousSelected,
    )?.rotation.y;
    current = { design, fabrics, previewMaterials: options.previewMaterials };
    selected = options.selectedId || selected;
    face = options.face || face;
    inspectionAngle = options.inspectionAngle || inspectionAngle;
    previewShapes = options.previewShapes || {};
    roundPreview = options.roundPreview === "baseline" ? "baseline" : "soft-fill";
    mode = options.mode || mode;
    view = options.view || view;
    const inspectedSize = sizeOf(
      design.pieces.find((piece) => piece.spec.id === selected)?.spec.sizeId,
    );
    // Round product contact needs millimetre shadow detail; the room-wide 18 mm
    // normal offset made its narrow contact patch appear to float.
    const roundProduct = mode === "configurator" && inspectedSize.shape === "round";
    const roundOnly = design.pieces.every((piece) => sizeOf(piece.spec.sizeId).shape === "round");
    ambient.intensity = roundProduct || roundOnly ? 1.2 : 1.7;
    fill.intensity = roundProduct || roundOnly ? .65 : 1.5;
    renderer.shadowMap.type = roundProduct || roundOnly ? T.PCFShadowMap : T.PCFSoftShadowMap;
    light.shadow.radius = roundProduct || roundOnly ? 6 : 3;
    light.shadow.normalBias = roundProduct ? .001 : roundOnly ? .004 : .018;
    light.shadow.bias = roundProduct ? -.00005 : -.0004;
    const shadowExtent = roundProduct ? 1.2 : 5;
    Object.assign(light.shadow.camera, {left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent});
    light.shadow.camera.updateProjectionMatrix();
    const targetRotation = face === "back" || face === "end2" ? Math.PI : 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const nextTransition = cushionInspectionTransition({
      shape: inspectedSize.shape,
      mode,
      requested:
        options.animateInspection &&
        previousMode === mode &&
        previousSelected === selected,
      reducedMotion,
      from: previousRotation,
      to: targetRotation,
    });
    if (nextTransition) {
      rotationTransition = {
        ...nextTransition,
        id: selected,
        sizeId: inspectedSize.id,
        start: null,
        side: Math.atan2(camera.position.x, camera.position.z) + Math.PI / 2,
      };
      onInspectionStatus?.(`Turning to the ${face}.`);
    } else if (
      reducedMotion ||
      mode !== "configurator" ||
      rotationTransition?.sizeId !== inspectedSize.id ||
      rotationTransition?.id !== selected
    ) {
      rotationTransition = null;
    }
    if (!rotationTransition && mode === "configurator")
      onInspectionStatus?.(`Showing the ${face}.`);
    disposeGroup(cushions);
    const nextRoomKey = JSON.stringify([mode, design.scene, design.colours]);
    if (nextRoomKey !== roomKey) {
      roomScene(design);
      roomKey = nextRoomKey;
    }
    const pieces =
        mode === "configurator"
          ? design.pieces.filter((p) => p.spec.id === selected)
          : design.pieces,
      placements = new Map(
        planArrangement(design).placements.map((p) => [p.id, p]),
      );
    for (const piece of pieces) {
      if (mode === "layout" && !placements.has(piece.spec.id)) continue;
      const group = makeCushion(piece, fabrics),
        size = sizeOf(piece.spec.sizeId);
      if (mode === "configurator") {
        const factor =
          size.shape === "bolster"
            ? 1.15
            : Math.max(size.widthMm, size.heightMm) / 450;
        group.position.set(0, 0.29 * factor, 0);
        group.rotation.y =
          rotationTransition?.id === piece.spec.id
            ? inspectionRotation(
                rotationTransition.from,
                rotationTransition.to,
                (rotationTransition.start === null ? 0 : performance.now() - rotationTransition.start) /
                  rotationTransition.durationMs,
                rotationTransition.side,
              )
            : targetRotation;
        group.rotation.x = size.shape === "square" ? -0.03 : 0;
        if (size.shape === "square" || piece.spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION) {
          group.position.y = 0;
          group.updateMatrixWorld(true);
          const support = new T.Box3().setFromObject(group);
          if(size.shape === "round") {
            group.traverse((object) => {
              if(!object.isMesh) return;
              const positions=object.geometry.attributes.position;
              for(let i=0;i<positions.count;i++) positions.setY(i,squareSeatContactY(positions.getY(i),support.min.y,Math.min(.010,size.heightMm*.00002)));
              positions.needsUpdate=true;
              object.geometry.computeVertexNormals();
              object.geometry.computeBoundingBox();
              object.geometry.computeBoundingSphere();
            });
            support.setFromObject(group);
          }
          group.position.y = 0.002 - support.min.y;
        }
      } else {
        const bed = design.scene.includes("bed"),
          placement = placements.get(piece.spec.id);
        group.rotation.z = (placement.rotation * Math.PI) / 180;
        group.rotation.x = placement.squareSofa ? SQUARE_SOFA_LEAN : -0.12;
        group.rotation.y = placement.squareSofa ? SQUARE_SOFA_YAW : 0;
        const shaped=piece.spec.constructionProfile === SHAPED_CONSTRUCTION_VERSION;
        if(shaped) {const pose=furniturePose(size,design.scene);group.rotation.x=pose.lean;group.rotation.y=pose.yaw;}
        group.updateMatrixWorld(true);
        if (placement.squareSofa || shaped) {
          const support = shaped ? {minY:new T.Box3().setFromObject(group).min.y,compression:size.shape === "round" ? Math.min(.012,size.heightMm/1000*.024) : Math.min(.008,size.heightMm/1000*.015)} : squareSofaBounds(
            size.widthMm,
            size.heightMm,
            placement.rotation,
          );
          const visualSupportMinY =
            previewShape === "soft-fullness"
              ? new T.Box3().setFromObject(group).min.y
              : support.minY;
          // Deform in the seat's coordinates after lean/rotation, including the seam/piping.
          // This creates a contact patch without moving any material sample in UV space.
          group.traverse((object) => {
            if (!object.isMesh) return;
            const positions = object.geometry.attributes.position;
            const inverse = object.matrixWorld.clone().invert();
            const point = new T.Vector3();
            for (let i = 0; i < positions.count; i++) {
              point
                .fromBufferAttribute(positions, i)
                .applyMatrix4(object.matrixWorld);
              point.y = squareSeatContactY(
                point.y,
                visualSupportMinY,
                support.compression,
              );
              point.applyMatrix4(inverse);
              positions.setXYZ(i, point.x, point.y, point.z);
            }
            positions.needsUpdate = true;
            object.geometry.computeVertexNormals();
            object.geometry.computeBoundingBox();
            object.geometry.computeBoundingSphere();
          });
        }
        const box = new T.Box3().setFromObject(group);
        group.position.set(
          placement.xMm / 1000,
          (bed ? 0.57 : 0.58) - box.min.y,
          placement.zMm / 1000 -
            (placement.squareSofa || shaped ? (box.min.z + box.max.z) / 2 : 0),
        );
        if (piece.spec.id === selected) {
          const ring = mesh(
            new T.TorusGeometry(0.035, 0.003, 8, 32),
            mat("#a58d62"),
            group,
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0, -size.heightMm / 2000 - 0.025, 0);
        }
      }
      cushions.add(group);
    }
    setCamera();
    // Building a calibrated mesh may take time: start the visible turn only once
    // the replacement mesh and camera are ready, not before geometry generation.
    if (rotationTransition?.start === null) {
      rotationTransition.start = performance.now();
      rotationTransition.side = Math.atan2(camera.position.x, camera.position.z) + Math.PI / 2;
    }
    draw();
  }
  function draw() {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame((now) => {
      if (rotationTransition) {
        const group = cushions.children.find(
          (item) => item.userData.pieceId === rotationTransition.id,
        );
        const progress = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches
          ? 1
          : (now - rotationTransition.start) / rotationTransition.durationMs;
        if (group)
          group.rotation.y = inspectionRotation(
            rotationTransition.from,
            rotationTransition.to,
            progress,
            rotationTransition.side,
          );
        if (progress >= 1 || !group) {
          rotationTransition = null;
          onInspectionStatus?.(`Showing the ${face}.`);
        }
      }
      renderer.render(scene, camera);
      if (rotationTransition) draw();
    });
  }
  const resize = new ResizeObserver(() => {
    const r = container.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    setCamera();
    draw();
  });
  resize.observe(container);
  const ray = new T.Raycaster(),
    pointer = new T.Vector2();
  container.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  container.addEventListener("pointerup", (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    down = null;
    if (mode !== "layout") return;
    if (Math.abs(dx) > 45) {
      onMove?.(dx > 0 ? 1 : -1);
      return;
    }
    const r = container.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray
      .intersectObjects(cushions.children, true)
      .find((h) => h.object.userData.pieceId);
    if (hit) onSelect?.(hit.object.userData.pieceId);
  });
  container.addEventListener("keydown", (e) => {
    if (mode === "layout" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      onMove?.(e.key === "ArrowRight" ? 1 : -1);
    }
  });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    onRenderError?.(
      "The 3D view paused. Your design is saved; reload to restore the view.",
    );
  });
  return {
    update,
    ready: async () => {
      const ids=new Set(current?.design.pieces.flatMap((p)=>[p.spec.fabricId,p.spec.pipingFabricId]));
      const active=(current?.fabrics || []).filter((f)=>ids.has(f.id)).map((f)=>textureReadiness.get(f.imageUrl)).filter(Boolean);
      const results=await Promise.all(active);
      if(results.some((loaded)=>!loaded)) throw new Error("A fabric texture failed to load.");
    },
    capture: () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    dispose: () => {
      disposed = true;
      resize.disconnect();
      cancelAnimationFrame(frame);
      disposeGroup(room);
      disposeGroup(cushions);
      textures.forEach((t) => t.dispose());
      textureReadiness.clear();
      renderer.dispose();
    },
  };
}
