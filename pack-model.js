// The editable source for QRandur_card_pack_3D.glb. Dimensions are model units.
export function roundedShape(THREE, width, height, radius = 2) {
  const x = -width / 2,
    y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

export function panelGeometry(THREE, width, height, depth = 1.2, radius = 2) {
  const geometry = new THREE.ExtrudeGeometry(
    roundedShape(THREE, width, height, radius),
    {
      depth,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.25,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 8,
    },
  );
  geometry.translate(0, 0, -depth / 2);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      position.getX(i) / width + 0.5,
      position.getY(i) / height + 0.5,
    );
  return geometry;
}

function artwork(THREE, logo, type) {
  const canvas = document.createElement("canvas");
  canvas.width = type === "lid" ? 1024 : 768;
  canvas.height = type === "lid" ? 256 : 1024;
  const ctx = canvas.getContext("2d");
  if (type === "lid") {
    ctx.fillStyle = "#f1eaff";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.drawImage(logo, 125, -13, 770, 274);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 768, 1024);
    grad.addColorStop(0, "#3c1b68");
    grad.addColorStop(0.55, "#5d2a9c");
    grad.addColorStop(1, "#241138");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 768, 1024);
    ctx.fillStyle = "#f1eaff";
    ctx.fillRect(0, 0, 768, 208);
    ctx.drawImage(logo, 50, -10, 668, 238);
    ctx.fillStyle = "#cfb3fc";
    ctx.font = "600 20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TALLINN / VOL. 01", 384, 280);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 69px Arial";
    ctx.fillText(type === "front" ? "LINN ON" : "SEIKLUS", 384, 385);
    ctx.font = "bold 58px Arial";
    ctx.fillText(type === "front" ? "MÄNGULAUD." : "ALGAB SIIT.", 384, 458);
    ctx.strokeStyle = "#c5a8ff";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 12]);
    ctx.beginPath();
    ctx.moveTo(-20, 752);
    ctx.bezierCurveTo(190, 530, 340, 850, 530, 640);
    ctx.bezierCurveTo(650, 500, 770, 610, 800, 555);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of [
      [146, 652],
      [384, 720],
      [612, 594],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = "#c1ff8f";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 29, 0, Math.PI * 2);
      ctx.strokeStyle = "#c1ff8f55";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.strokeStyle = "#dcc4ff55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(60, 542, 160, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f1eaff";
    ctx.beginPath();
    ctx.roundRect(221, 818, 326, 72, 14);
    ctx.fill();
    ctx.fillStyle = "#3c1b68";
    ctx.font = "bold 30px Arial";
    ctx.fillText("10 KAARTI", 384, 863);
    ctx.fillStyle = "#dcc4ff";
    ctx.font = "bold 18px Arial";
    ctx.fillText("SKANNI  ·  AVASTA  ·  MÄNGI", 384, 960);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function buildPackModel(THREE) {
  const logo = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = "./logo.png";
  });
  const pack = new THREE.Group();
  pack.name = "QRandur_Pack";
  const paper = new THREE.MeshPhysicalMaterial({
    color: 0x6939a0,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.28,
    clearcoatRoughness: 0.6,
  });
  const cream = new THREE.MeshPhysicalMaterial({
    color: 0xf1eaff,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.15,
  });
  const lining = new THREE.MeshStandardMaterial({
    color: 0x1c102c,
    roughness: 0.8,
  });
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: artwork(THREE, logo, "front"),
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
  });
  const backMaterial = new THREE.MeshPhysicalMaterial({
    map: artwork(THREE, logo, "back"),
    roughness: 0.56,
    clearcoat: 0.2,
  });
  const lidMaterial = new THREE.MeshPhysicalMaterial({
    map: artwork(THREE, logo, "lid"),
    roughness: 0.5,
    clearcoat: 0.2,
  });
  const body = new THREE.Group();
  body.name = "packBody";
  pack.add(body);
  function panel(name, w, h, d, materials, parent, x, y, z, rotationY = 0) {
    const mesh = new THREE.Mesh(panelGeometry(THREE, w, h, d), materials);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    parent.add(mesh);
    return mesh;
  }
  panel("frontPanel", 74, 104, 1.2, [frontMaterial, paper], body, 0, 0, 8);
  panel(
    "backPanel",
    74,
    104,
    1.2,
    [backMaterial, paper],
    body,
    0,
    0,
    -8,
    Math.PI,
  );
  panel(
    "leftSpine",
    15,
    104,
    1.2,
    [paper, paper],
    body,
    -36.5,
    0,
    0,
    -Math.PI / 2,
  );
  panel(
    "rightSpine",
    15,
    104,
    1.2,
    [paper, paper],
    body,
    36.5,
    0,
    0,
    Math.PI / 2,
  );
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(72, 1.2, 15), paper);
  bottom.name = "base";
  bottom.position.y = -51.8;
  body.add(bottom);
  // These inner faces hide the card stack until it crosses the real opening.
  panel(
    "frontLining",
    71,
    100,
    0.2,
    [lining, lining],
    body,
    0,
    0,
    7.25,
    Math.PI,
  );
  panel("backLining", 71, 100, 0.2, [lining, lining], body, 0, 0, -7.25);
  const lidPivot = new THREE.Group();
  lidPivot.name = "lidPivot";
  lidPivot.position.set(0, 52.3, -7.7);
  pack.add(lidPivot);
  const lid = panel(
    "hingedLid",
    74,
    16,
    1.2,
    [lidMaterial, cream],
    lidPivot,
    0,
    0,
    7.8,
  );
  lid.rotation.x = -Math.PI / 2;
  const underside = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedShape(THREE, 74, 16), 8),
    cream,
  );
  underside.name = "lidLining";
  underside.position.z = -0.95;
  underside.rotation.y = Math.PI;
  lid.add(underside);
  const lipPivot = new THREE.Group();
  lipPivot.name = "lipPivot";
  lipPivot.position.set(0, 0, 15.7);
  lidPivot.add(lipPivot);
  panel("tuckLip", 70, 9, 1, [cream, cream], lipPivot, 0, -4.5, 0);
  for (const [name, x] of [
    ["leftTuck", -35.5],
    ["rightTuck", 35.5],
  ]) {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(x, 51.8, 0);
    pack.add(pivot);
    const flap = panel(
      `${name}Panel`,
      12,
      14,
      0.5,
      [lining, paper],
      pivot,
      name === "leftTuck" ? 6 : -6,
      0,
      0,
    );
    flap.rotation.x = -Math.PI / 2;
  }
  const times = [0, 0.18, 0.7, 1.2];
  const tracks = [];
  for (const [name, axis, angle] of [
    ["lidPivot", new THREE.Vector3(1, 0, 0), -2.3],
    ["lipPivot", new THREE.Vector3(1, 0, 0), -0.45],
    ["leftTuck", new THREE.Vector3(0, 0, 1), 0.9],
    ["rightTuck", new THREE.Vector3(0, 0, 1), -0.9],
  ]) {
    const values = times.flatMap((_, i) =>
      new THREE.Quaternion()
        .setFromAxisAngle(axis, angle * [0, 0.08, 0.85, 1][i])
        .toArray(),
    );
    tracks.push(
      new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values),
    );
  }
  pack.animations = [new THREE.AnimationClip("OpenLid", 1.2, tracks)];
  pack.userData = {
    design: "QRändur Tallinn Vol.01",
    width: 74,
    height: 106,
    depth: 18,
    hinge: "lidPivot",
    cardCount: 10,
  };
  return pack;
}
