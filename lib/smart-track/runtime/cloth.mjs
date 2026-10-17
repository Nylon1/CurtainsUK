/** Material coordinates stay in centimetres, upright, independent of projected folds.
 * The frozen curtain engine is not modified. Its catalogue and texturePlan remain authority. */
export function createTrackCloth(T) {
  const columns = 160,
    rows = 24,
    group = new T.Group(),
    material = new T.MeshPhysicalMaterial({
      color: "#c8b59e",
      roughness: 0.97,
      sheen: 0.4,
      sheenColor: new T.Color("#e6d9c7"),
      side: T.DoubleSide,
    });
  let meshes = [],
    opening = "",
    progress = -1,
    width = 230;
  function rebuild(mode) {
    meshes.forEach((m) => {
      group.remove(m);
      m.geometry.dispose();
    });
    meshes = [];
    opening = mode;
    for (let panel = 0; panel < (mode === "CENTRE" ? 2 : 1); panel++) {
      const g = new T.PlaneGeometry(1, 1, columns, rows),
        uv = g.attributes.uv;
      const flatWidth = mode === "CENTRE" ? width : width * 2;
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= columns; i++) {
          const k = j * (columns + 1) + i;
          uv.setXY(
            k,
            panel * flatWidth + (i / columns) * flatWidth,
            (j / rows) * 250,
          );
        }
      const mesh = new T.Mesh(g, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
    }
  }
  function section(flat, target, phase) {
    const step = flat / columns;
    function solve(angle, store) {
      let x = 0,
        z = 0;
      const result = [[0, 0]];
      for (let i = 0; i < columns; i++) {
        const t =
          angle *
          Math.sin(((i + 0.5) / columns) * Math.PI * 2 * (flat / 46) + phase);
        x += step * Math.cos(t);
        z += step * Math.sin(t);
        if (store) result.push([x, z]);
      }
      return store ? result : x;
    }
    let low = 0,
      high = 2.4;
    for (let i = 0; i < 22; i++) {
      const a = (low + high) / 2;
      if (solve(a, false) > target) low = a;
      else high = a;
    }
    return solve((low + high) / 2, true);
  }
  function setPosition(value, mode = "CENTRE") {
    if (mode === opening && value === progress) return;
    if (mode !== opening) rebuild(mode);
    progress = value;
    const flat = mode === "CENTRE" ? width : width * 2,
      closed = mode === "CENTRE" ? width / 2 : width,
      projected = closed * (1 - value * 0.81);
    meshes.forEach((mesh, panel) => {
      for (let row = 0; row <= rows; row++) {
        const v = row / rows,
          points = section(flat, projected, 0.08 * Math.sin(v * Math.PI));
        for (let col = 0; col <= columns; col++) {
          const [x, z] = points[col],
            start =
              mode === "CENTRE"
                ? panel
                  ? width / 2 - projected
                  : -width / 2
                : mode === "LEFT"
                  ? -width / 2
                  : width / 2 - projected;
          mesh.geometry.attributes.position.setXYZ(
            row * (columns + 1) + col,
            start + x,
            250 - v * 250,
            z - 6 + Math.sin(v * Math.PI) * 0.6,
          );
        }
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    });
  }
  setPosition(0);
  return {
    group,
    material,
    setPosition,
    setWidth(cm) {
      if (width === cm) return;
      const mode = opening,
        p = progress;
      width = cm;
      rebuild(mode);
      progress = -1;
      setPosition(p, mode);
    },
    dispose() {
      meshes.forEach((m) => m.geometry.dispose());
      material.dispose();
    },
  };
}
