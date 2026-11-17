/*
 * Larpcord — what you see, and what everyone else sees.
 *
 * A profile card among falling banknotes (the logo is made of them). It flips
 * between the two views the "Try it" section compares: plain, as others see
 * it, and larped — badges, gold theme, a decoration around the avatar. Click
 * or tap to flip it yourself. The profile is the made-up one from the preview.
 */
export default function scene(stage) {
  const { THREE, frame } = stage;
  stage.lights({ ambient: 0.8, key: 2.2, rim: 24 });
  stage.environment(0.7);

  const root = new THREE.Group();
  frame.add(root);
  root.add(stage.halo(stage.accent, 8, 0.2));

  /* ---------------------------------------------------------- banknotes */

  // The bill from the site's old money rain, drawn once onto a canvas.
  const bill = document.createElement('canvas');
  bill.width = 240;
  bill.height = 104;
  const b = bill.getContext('2d');
  b.fillStyle = '#cfd8b8';
  b.strokeStyle = '#1d3d2a';
  b.lineWidth = 4;
  b.beginPath();
  if (b.roundRect) b.roundRect(2, 2, 236, 100, 8);
  else b.rect(2, 2, 236, 100);
  b.fill();
  b.stroke();
  b.setLineDash([6, 4]);
  b.lineWidth = 2;
  b.strokeStyle = '#2b5a3d';
  b.strokeRect(12, 12, 216, 80);
  b.setLineDash([]);
  b.fillStyle = '#8fae7c';
  b.beginPath();
  b.ellipse(120, 52, 28, 32, 0, 0, Math.PI * 2);
  b.fill();
  b.strokeStyle = '#1d3d2a';
  b.stroke();
  b.fillStyle = '#1d3d2a';
  b.font = '700 32px Georgia, serif';
  b.textAlign = 'center';
  b.fillText('L', 120, 64);
  b.font = '700 22px Georgia, serif';
  b.fillText('100', 36, 40);
  b.fillText('100', 204, 88);
  const billTexture = new THREE.CanvasTexture(bill);
  billTexture.colorSpace = THREE.SRGBColorSpace;
  billTexture.anisotropy = 4;

  const BILLS = 34;
  const bills = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.6, 0.26),
    new THREE.MeshStandardMaterial({ map: billTexture, side: THREE.DoubleSide, roughness: 0.8 }),
    BILLS,
  );
  bills.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(bills);
  const random = (seed) => {
    const x = Math.sin(seed * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  const flutter = Array.from({ length: BILLS }, (_, i) => ({
    x: (random(i + 1) - 0.5) * 6.4,
    y: (random(i + 2) - 0.5) * 5.6,
    z: -0.6 - random(i + 3) * 2.4 + (i % 3 === 0 ? 2.2 : 0),
    fall: 0.25 + random(i + 4) * 0.3,
    sway: random(i + 5) * Math.PI * 2,
    spin: (random(i + 6) - 0.5) * 2.4,
    burst: 0,
  }));
  const dummy = new THREE.Object3D();

  /* ------------------------------------------------------------- profile */

  let larp = true;
  let shown = 1; // eased towards larp ? 1 : 0

  const card = new THREE.Group();
  root.add(card);
  const slab = new THREE.Mesh(stage.slab(2.3, 3.1, 0.08, 0.16), stage.mat.solid(0x232428, { roughness: 0.4, metalness: 0.2 }));
  slab.position.z = -0.05;
  card.add(slab);

  const BADGES = ['#5865f2', '#f47fff', '#3ba55c', '#faa61a', '#ed4245', '#ffd166'];
  const face = stage.plate(2.2, 3, (g, w, h) => {
    const s = w / 2.2;
    // Banner: grey for others, the gold theme when larped.
    const banner = g.createLinearGradient(0, 0, w, h * 0.3);
    if (larp) {
      banner.addColorStop(0, '#f3d77a');
      banner.addColorStop(1, '#85bb65');
    } else {
      banner.addColorStop(0, '#4e5058');
      banner.addColorStop(1, '#4e5058');
    }
    g.fillStyle = banner;
    g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, w, h * 0.27, [s * 0.14, s * 0.14, 0, 0]);
    else g.rect(0, 0, w, h * 0.27);
    g.fill();
    g.fillStyle = larp ? '#1a2a1f' : '#232428';
    g.fillRect(0, h * 0.27, w, h * 0.73);
    // Avatar with a ring cut out of the card.
    const ax = s * 0.42;
    const ay = h * 0.27;
    const ar = s * 0.27;
    g.fillStyle = larp ? '#1a2a1f' : '#232428';
    g.beginPath();
    g.arc(ax, ay, ar + s * 0.05, 0, Math.PI * 2);
    g.fill();
    const av = g.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
    av.addColorStop(0, larp ? '#d4af37' : '#5865f2');
    av.addColorStop(1, larp ? '#2b5a3d' : '#3c45a5');
    g.fillStyle = av;
    g.beginPath();
    g.arc(ax, ay, ar, 0, Math.PI * 2);
    g.fill();
    // Badges, top right — only in Larpcord.
    if (larp) {
      BADGES.forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(w - s * 0.18 - i * s * 0.2, h * 0.32, s * 0.075, 0, Math.PI * 2);
        g.fill();
      });
    }
    g.textBaseline = 'alphabetic';
    g.fillStyle = larp ? '#f3d77a' : '#f2f3f5';
    g.font = stage.font.display(Math.round(s * 0.2), 700);
    g.fillText(larp ? 'The Boss' : 'theboss', s * 0.14, h * 0.47);
    if (larp) {
      g.fillStyle = '#85bb65';
      g.font = stage.font.body(Math.round(s * 0.12), 700);
      g.fillText('✔', s * 0.14 + g.measureText('The Boss').width + s * 0.18, h * 0.47);
    }
    g.fillStyle = '#949ba4';
    g.font = stage.font.body(Math.round(s * 0.1), 500);
    g.fillText('theboss', s * 0.14, h * 0.52);
    // A few lines of profile below: member since, roles.
    g.fillStyle = '#949ba4';
    g.font = stage.font.mono(Math.round(s * 0.075), 500);
    g.fillText('MEMBER SINCE', s * 0.14, h * 0.62);
    g.fillStyle = '#dbdee1';
    g.font = stage.font.body(Math.round(s * 0.1), 500);
    g.fillText(larp ? 'May 13, 2015' : 'Mar 2, 2024', s * 0.14, h * 0.67);
    g.fillStyle = '#949ba4';
    g.font = stage.font.mono(Math.round(s * 0.075), 500);
    g.fillText('ROLES', s * 0.14, h * 0.76);
    const roles = larp ? [['Owner', '#d4af37'], ['Legend', '#85bb65'], ['VIP', '#f47fff']] : [['Member', '#949ba4']];
    let rx = s * 0.14;
    g.font = stage.font.body(Math.round(s * 0.085), 600);
    for (const [name, c] of roles) {
      const tw = g.measureText(name).width + s * 0.22;
      g.fillStyle = 'rgba(255, 255, 255, 0.07)';
      g.beginPath();
      if (g.roundRect) g.roundRect(rx, h * 0.785, tw, s * 0.15, s * 0.05);
      else g.rect(rx, h * 0.785, tw, s * 0.15);
      g.fill();
      g.fillStyle = c;
      g.beginPath();
      g.arc(rx + s * 0.07, h * 0.785 + s * 0.075, s * 0.03, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#dbdee1';
      g.fillText(name, rx + s * 0.13, h * 0.785 + s * 0.105);
      rx += tw + s * 0.06;
    }
    if (larp) {
      g.fillStyle = 'rgba(243, 215, 122, 0.85)';
      g.font = stage.font.mono(Math.round(s * 0.07), 500);
      g.fillText('ONLY VISIBLE ON YOUR PC', s * 0.14, h * 0.95);
    }
  }, { resolution: 420 });
  face.position.z = 0.0;
  card.add(face);

  // The avatar decoration: a gold ring that only exists in the larped view.
  const deco = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 12, 64), stage.mat.metal(stage.accent));
  deco.position.set(-1.1 + 0.42, 1.5 - 3 * 0.27, 0.06);
  card.add(deco);

  let label = '';
  const plate = stage.plate(4, 0.36, (g, w, h) => {
    g.fillStyle = '#f2f5f2';
    g.font = stage.font.mono(Math.round(h * 0.42));
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.fillText(label, w / 2, h / 2);
  });
  plate.position.set(0, -2.3, 1.2);
  frame.add(plate);
  const fit = (view) => {
    plate.visible = stage.mode === 'hero' && view.wide;
  };
  stage.onResize(fit);
  fit(stage.view);
  const say = (text) => {
    if (text === label) return;
    label = text;
    plate.userData.redraw();
  };
  say('In Larpcord — only you see it');

  /* ----------------------------------------------------------- behaviour */

  let flipped = 0; // seconds since the last flip
  const flip = () => {
    larp = !larp;
    flipped = 0;
    if (larp) for (const f of flutter) f.burst = 1;
    say(larp ? 'In Larpcord — only you see it' : 'What others see');
  };
  stage.onClick(flip);

  let turned = false;
  stage.onFrame((time, delta) => {
    root.rotation.y = stage.yaw * 0.5;
    root.rotation.x = stage.pitch * 0.6;
    flipped += delta;
    if (flipped > 4.5) flip();

    // The card turns half way round, swaps its face out of sight, and turns back.
    shown += ((larp ? 1 : 0) - shown) * Math.min(1, delta * 3.2);
    const t = Math.min(1, flipped / 0.7);
    const angle = Math.sin(t * Math.PI) * Math.PI * 0.5;
    if (t >= 0.5 && !turned) {
      face.userData.redraw();
      turned = true;
    }
    if (t < 0.5) turned = false;
    card.rotation.y = -0.28 + angle + Math.sin(time * 0.6) * 0.06;
    card.position.y = 0.15 + Math.sin(time * 0.8) * 0.05;
    deco.scale.setScalar(Math.max(0.001, shown));
    deco.rotation.z = time * 1.4;

    for (let i = 0; i < BILLS; i += 1) {
      const f = flutter[i];
      f.burst = Math.max(0, f.burst - delta * 0.8);
      f.y -= (f.fall + f.burst * 1.4) * delta;
      if (f.y < -3) {
        f.y = 3;
        f.x = (random(i + time) - 0.5) * 6.4;
      }
      dummy.position.set(f.x + Math.sin(time * 0.7 + f.sway) * 0.35, f.y, f.z);
      dummy.rotation.set(Math.sin(time * 1.1 + f.sway) * 1.1, time * f.spin, Math.cos(time * 0.9 + f.sway) * 0.6);
      dummy.updateMatrix();
      bills.setMatrixAt(i, dummy.matrix);
    }
    bills.instanceMatrix.needsUpdate = true;
  });
}
