import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';

/*
 * MORFO immersive gallery
 * Uses the existing artwork files and palette. The original HTML/CSS room remains
 * as a graceful fallback if WebGL or the CDN is unavailable.
 */
const viewport = document.getElementById('room-viewport');
if (!viewport) throw new Error('MORFO room viewport not found');

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#211d20');
  scene.fog = new THREE.Fog('#211d20', 17, 38);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(0, 3.2, 11.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'morfo-webgl-canvas';
  renderer.domElement.setAttribute('aria-label', 'Galería tridimensional MORFO. Arrastra para explorar la sala y selecciona una obra para verla en detalle.');
  viewport.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2.2, -1.1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.minDistance = 5.2;
  controls.maxDistance = 15.5;
  controls.minPolarAngle = 1.02;
  controls.maxPolarAngle = 1.72;
  controls.minAzimuthAngle = -1.12;
  controls.maxAzimuthAngle = 1.12;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.72;
  controls.update();

  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: '#342d31', roughness: 0.92, metalness: 0.03 }),
    side: new THREE.MeshStandardMaterial({ color: '#292327', roughness: 0.96 }),
    floor: new THREE.MeshStandardMaterial({ color: '#211d20', roughness: 0.72, metalness: 0.12 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#252024', roughness: 0.98 }),
    gold: new THREE.MeshStandardMaterial({ color: '#C9A65C', roughness: 0.32, metalness: 0.72 }),
    frame: new THREE.MeshStandardMaterial({ color: '#8c7050', roughness: 0.3, metalness: 0.68 })
  };

  const room = new THREE.Group();
  scene.add(room);
  const addBox = (w, h, d, material, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    room.add(mesh);
    return mesh;
  };

  // Architectural shell: real perspective and depth, not a CSS perspective trick.
  addBox(18, 8, 0.25, materials.wall, 0, 4, -6.5);
  addBox(0.25, 8, 13.2, materials.side, -9, 4, 0);
  addBox(0.25, 8, 13.2, materials.side, 9, 4, 0);
  addBox(18, 0.18, 13.2, materials.floor, 0, 0, 0);
  addBox(18, 0.15, 13.2, materials.ceiling, 0, 8, 0);

  // Restrained brass inlays give the room scale without changing the brand palette.
  for (let x = -8; x <= 8; x += 2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 13), materials.gold);
    line.position.set(x, 0.105, 0);
    room.add(line);
  }
  for (let z = -6; z <= 6; z += 2) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(18, 0.008, 0.012), materials.gold);
    line.position.set(0, 0.106, z);
    room.add(line);
  }

  scene.add(new THREE.AmbientLight('#d8c9c1', 1.35));
  const chandelier = new THREE.PointLight('#f3d7a0', 42, 24, 1.8);
  chandelier.position.set(0, 6.7, -1.5);
  scene.add(chandelier);
  const warmKey = new THREE.SpotLight('#f7dfb3', 115, 24, Math.PI / 5, 0.48, 1.4);
  warmKey.position.set(0, 7.1, 1.4);
  warmKey.target.position.set(0, 3.1, -5.9);
  scene.add(warmKey, warmKey.target);
  const leftGlow = new THREE.PointLight('#76213D', 15, 13, 2);
  leftGlow.position.set(-7.7, 4.1, -1.2);
  scene.add(leftGlow);
  const rightGlow = new THREE.PointLight('#C9A65C', 8, 12, 2);
  rightGlow.position.set(7.4, 4.4, -2.3);
  scene.add(rightGlow);

  const textureLoader = new THREE.TextureLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactiveArt = [];
  const artworkSpecs = [
    { slug: 'ejemplo', src: '1ra pintura.jpg', title: 'El testigo', wall: 'back', x: 0, y: 3.45, w: 2.65, h: 3.6 },
    { slug: 'la-habitacion-interior', src: 'assets/obras/la-habitacion-interior-demo.svg', title: 'La habitación interior', wall: 'left', x: -5.4, y: 3.4, w: 2.15, h: 2.9 },
    { slug: 'el-peso-del-silencio', src: 'assets/obras/el-peso-del-silencio-demo.svg', title: 'El peso del silencio', wall: 'right', x: 5.4, y: 3.4, w: 2.15, h: 2.9 }
  ];

  function addArtwork(spec) {
    const group = new THREE.Group();
    group.position.set(spec.x, spec.y, spec.wall === 'back' ? -6.29 : 0);
    if (spec.wall === 'left') {
      group.position.set(-8.78, spec.y, spec.x + 5.4);
      group.rotation.y = Math.PI / 2;
    } else if (spec.wall === 'right') {
      group.position.set(8.78, spec.y, spec.x - 5.4);
      group.rotation.y = -Math.PI / 2;
    }
    room.add(group);

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.28, spec.h + 0.28, 0.14),
      materials.frame
    );
    backing.position.z = -0.055;
    group.add(backing);

    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.11, spec.h + 0.11, 0.045),
      materials.gold
    );
    inner.position.z = 0.025;
    group.add(inner);

    const placeholder = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.w, spec.h),
      new THREE.MeshStandardMaterial({ color: '#350817', roughness: 0.9 })
    );
    placeholder.position.z = 0.052;
    group.add(placeholder);
    placeholder.userData.slug = spec.slug;
    placeholder.userData.title = spec.title;
    interactiveArt.push(placeholder);

    textureLoader.load(spec.src, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const artMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
      placeholder.material.dispose();
      placeholder.material = artMaterial;
      placeholder.material.needsUpdate = true;
    }, undefined, () => {
      // Keep the room intact if a particular artwork file fails to load.
    });

    // A discreet title plaque below each original image.
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(spec.w * 0.86, 0.075, 0.035), materials.gold);
    plaque.position.set(0, -spec.h / 2 - 0.2, 0.02);
    group.add(plaque);
  }
  artworkSpecs.forEach(addArtwork);

  // Subtle brass architectural trim.
  [-8.82, 8.82].forEach(x => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.025, 7.8, 0.025), materials.gold);
    trim.position.set(x, 4, -0.1);
    room.add(trim);
  });

  function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = width < 600 ? 57 : 48;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);
  resize();

  let pointerDown = null;
  renderer.domElement.addEventListener('pointerdown', event => {
    pointerDown = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!pointerDown) return;
    const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (moved > 7) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactiveArt, false)[0];
    if (!hit) return;
    const slug = hit.object.userData.slug;
    const legacyButton = document.querySelector('.room-art[data-art-open="' + slug + '"]');
    if (legacyButton) legacyButton.click();
  });

  document.getElementById('room-left')?.addEventListener('click', () => {
    controls.rotateLeft(Math.PI / 7);
    controls.update();
  });
  document.getElementById('room-right')?.addEventListener('click', () => {
    controls.rotateLeft(-Math.PI / 7);
    controls.update();
  });
  document.getElementById('room-reset')?.addEventListener('click', () => {
    camera.position.set(0, 3.2, 11.8);
    controls.target.set(0, 2.2, -1.1);
    controls.update();
  });

  viewport.classList.add('webgl-ready');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  if (reducedMotion) controls.autoRotate = false;
} catch (error) {
  console.warn('MORFO 3D gallery fallback active:', error);
}
