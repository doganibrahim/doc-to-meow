import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 4 different colors for cat avatars
export const CAT_COLORS = {
  orange: { body: '#E8943A', darker: '#C47A2A', chest: '#FDE8D1', nose: '#E8A0B0', innerEar: '#E8A0B0', irisA: '#8B6914', irisB: '#DAA520', pupil: '#111' },
  black:  { body: '#2A2A2A', darker: '#1A1A1A', chest: '#F5F5F5', nose: '#3A3A3A', innerEar: '#4A3A3A', irisA: '#1B8C3A', irisB: '#3AE86A', pupil: '#111' },
  cream:  { body: '#F5E6C8', darker: '#E0CFA8', chest: '#FFFFFF', nose: '#E8A0B0', innerEar: '#E8A0B0', irisA: '#5B8CC4', irisB: '#88B8E8', pupil: '#111' },
  grey:   { body: '#808890', darker: '#606870', chest: '#D0D0D0', nose: '#A08090', innerEar: '#A08090', irisA: '#C4A82B', irisB: '#E8D24A', pupil: '#111' }
};

function CatAvatar3D({ color = 'orange', width = 220, height = 220 }) {
  const mountRef = useRef(null);
  const sceneDataRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.set(0, 1.8, 6.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff8e8, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8e8ff, 0.4);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    const catGroup = new THREE.Group();
    scene.add(catGroup);

    const colors = CAT_COLORS[color] || CAT_COLORS.orange;

    // --- Materials ---
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.75, metalness: 0.0 });
    const darkerMat = new THREE.MeshStandardMaterial({ color: colors.darker, roughness: 0.8 });
    const chestMat = new THREE.MeshStandardMaterial({ color: colors.chest, roughness: 0.7 });
    const noseMat = new THREE.MeshStandardMaterial({ color: colors.nose, roughness: 0.4, metalness: 0.1 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: colors.innerEar, roughness: 0.5 });
    const irisMat = new THREE.MeshStandardMaterial({ color: colors.irisA, roughness: 0.2, metalness: 0.15 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: colors.pupil, roughness: 0.1, metalness: 0.0 });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xF8F8F0, roughness: 0.3 });
    const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xF0F0E8, roughness: 0.9 });

    const allMats = [bodyMat, darkerMat, chestMat, noseMat, innerEarMat, irisMat, pupilMat, eyeWhiteMat, whiskerMat];
    const allGeos = [];

    const addGeo = (geo) => { allGeos.push(geo); return geo; };

    // --- Body (elongated ellipsoid) ---
    const bodyGeo = addGeo(new THREE.SphereGeometry(1, 32, 24));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(0.7, 0.65, 1.05);
    body.position.set(0, 0, 0);
    catGroup.add(body);

    // Chest (lighter belly/chest area)
    const chestGeo = addGeo(new THREE.SphereGeometry(0.7, 32, 24));
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.scale.set(0.55, 0.5, 0.75);
    chest.position.set(0, -0.15, 0.35);
    catGroup.add(chest);

    // --- Head ---
    const headGeo = addGeo(new THREE.SphereGeometry(0.62, 32, 32));
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.scale.set(1, 0.9, 0.92);
    head.position.set(0, 1.05, 0.55);
    catGroup.add(head);

    // Muzzle (snout area)
    const muzzleGeo = addGeo(new THREE.SphereGeometry(0.28, 24, 24));
    const muzzle = new THREE.Mesh(muzzleGeo, chestMat);
    muzzle.scale.set(1.0, 0.75, 0.85);
    muzzle.position.set(0, 0.88, 1.08);
    catGroup.add(muzzle);

    // --- Nose ---
    const noseGeo = addGeo(new THREE.SphereGeometry(0.065, 16, 16));
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.scale.set(1.2, 0.8, 0.7);
    nose.position.set(0, 0.94, 1.28);
    catGroup.add(nose);

    // Mouth lines (two tiny cylinders forming a Y)
    const mouthLineGeo = addGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6));
    const mouthLineMat = new THREE.MeshStandardMaterial({ color: 0x5A4040, roughness: 0.8 });
    allMats.push(mouthLineMat);

    const mouthCenter = new THREE.Mesh(mouthLineGeo, mouthLineMat);
    mouthCenter.position.set(0, 0.83, 1.24);
    catGroup.add(mouthCenter);

    const mouthLeftGeo = addGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6));
    const mouthLeft = new THREE.Mesh(mouthLeftGeo, mouthLineMat);
    mouthLeft.position.set(-0.04, 0.785, 1.22);
    mouthLeft.rotation.z = 0.5;
    catGroup.add(mouthLeft);

    const mouthRight = new THREE.Mesh(mouthLeftGeo, mouthLineMat);
    mouthRight.position.set(0.04, 0.785, 1.22);
    mouthRight.rotation.z = -0.5;
    catGroup.add(mouthRight);

    // --- Eyes ---
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // Eyeball (white)
      const eyeballGeo = addGeo(new THREE.SphereGeometry(0.12, 24, 24));
      const eyeball = new THREE.Mesh(eyeballGeo, eyeWhiteMat);
      eyeGroup.add(eyeball);

      // Iris
      const irisGeo = addGeo(new THREE.SphereGeometry(0.075, 24, 24));
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.075;
      eyeGroup.add(iris);

      // Pupil (vertical slit)
      const pupilGeo = addGeo(new THREE.SphereGeometry(0.04, 16, 16));
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.scale.set(0.5, 1.2, 0.6);
      pupil.position.z = 0.1;
      eyeGroup.add(pupil);

      // Specular highlight
      const specGeo = addGeo(new THREE.SphereGeometry(0.018, 12, 12));
      const specMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      allMats.push(specMat);
      const spec = new THREE.Mesh(specGeo, specMat);
      spec.position.set(0.03, 0.04, 0.12);
      eyeGroup.add(spec);

      eyeGroup.position.set(x, 1.12, 1.0);
      return eyeGroup;
    };

    const leftEye = createEye(-0.2);
    const rightEye = createEye(0.2);
    catGroup.add(leftEye);
    catGroup.add(rightEye);

    // --- Ears ---
    const createEar = (x, rotZ) => {
      const earGroup = new THREE.Group();

      // Outer ear
      const outerGeo = addGeo(new THREE.ConeGeometry(0.2, 0.45, 4));
      const outer = new THREE.Mesh(outerGeo, bodyMat);
      earGroup.add(outer);

      // Inner ear
      const innerGeo = addGeo(new THREE.ConeGeometry(0.12, 0.32, 4));
      const inner = new THREE.Mesh(innerGeo, innerEarMat);
      inner.position.set(0, -0.03, 0.04);
      earGroup.add(inner);

      earGroup.position.set(x, 1.65, 0.4);
      earGroup.rotation.set(0.3, 0, rotZ);
      return earGroup;
    };

    const leftEar = createEar(-0.32, 0.25);
    const rightEar = createEar(0.32, -0.25);
    catGroup.add(leftEar);
    catGroup.add(rightEar);

    // --- Whiskers ---
    const createWhisker = (x, y, z, rotY, rotZ) => {
      const whiskerGeo = addGeo(new THREE.CylinderGeometry(0.004, 0.002, 0.5, 4));
      const whisker = new THREE.Mesh(whiskerGeo, whiskerMat);
      whisker.position.set(x, y, z);
      whisker.rotation.set(0, rotY, rotZ);
      return whisker;
    };

    // Left whiskers
    catGroup.add(createWhisker(-0.22, 0.92, 1.18, 0.3, Math.PI / 2 + 0.15));
    catGroup.add(createWhisker(-0.22, 0.88, 1.18, 0.3, Math.PI / 2));
    catGroup.add(createWhisker(-0.22, 0.84, 1.18, 0.3, Math.PI / 2 - 0.15));

    // Right whiskers
    catGroup.add(createWhisker(0.22, 0.92, 1.18, -0.3, -(Math.PI / 2 + 0.15)));
    catGroup.add(createWhisker(0.22, 0.88, 1.18, -0.3, -(Math.PI / 2)));
    catGroup.add(createWhisker(0.22, 0.84, 1.18, -0.3, -(Math.PI / 2 - 0.15)));

    // --- Legs ---
    const createLeg = (x, z, isFront) => {
      const legGroup = new THREE.Group();

      // Upper leg
      const upperGeo = addGeo(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 12));
      const upper = new THREE.Mesh(upperGeo, bodyMat);
      upper.position.y = -0.28;
      legGroup.add(upper);

      // Lower leg
      const lowerGeo = addGeo(new THREE.CylinderGeometry(0.11, 0.09, 0.45, 12));
      const lower = new THREE.Mesh(lowerGeo, bodyMat);
      lower.position.y = -0.73;
      legGroup.add(lower);

      // Paw
      const pawGeo = addGeo(new THREE.SphereGeometry(0.11, 16, 16));
      const paw = new THREE.Mesh(pawGeo, chestMat);
      paw.scale.set(1.0, 0.55, 1.3);
      paw.position.set(0, -0.97, 0.04);
      legGroup.add(paw);

      // Toe beans (3 little bumps)
      for (let i = -1; i <= 1; i++) {
        const toeGeo = addGeo(new THREE.SphereGeometry(0.025, 8, 8));
        const toe = new THREE.Mesh(toeGeo, noseMat);
        toe.position.set(i * 0.04, -1.02, 0.09);
        legGroup.add(toe);
      }

      legGroup.position.set(x, 0, z);
      return legGroup;
    };

    const legFL = createLeg(-0.35, 0.65, true);
    const legFR = createLeg(0.35, 0.65, true);
    const legBL = createLeg(-0.35, -0.55, false);
    const legBR = createLeg(0.35, -0.55, false);
    catGroup.add(legFL);
    catGroup.add(legFR);
    catGroup.add(legBL);
    catGroup.add(legBR);

    // --- Tail (curved using multiple segments) ---
    const tailGroup = new THREE.Group();
    const tailSegments = 8;
    const tailMeshes = [];

    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      const radius = 0.06 - t * 0.025;
      const segGeo = addGeo(new THREE.SphereGeometry(Math.max(radius, 0.02), 12, 12));
      const useDarker = i > tailSegments * 0.6;
      const seg = new THREE.Mesh(segGeo, useDarker ? darkerMat : bodyMat);

      // Create a nice S-curve
      const angle = t * Math.PI * 0.7;
      seg.position.set(0, Math.sin(angle) * 0.5 + t * 0.3, -1.05 - t * 0.5);
      tailGroup.add(seg);
      tailMeshes.push(seg);
    }

    tailGroup.position.set(0, 0.2, 0);
    catGroup.add(tailGroup);

    // --- Stripe markings for orange/grey cats ---
    if (color === 'orange' || color === 'grey') {
      const stripeMat = new THREE.MeshStandardMaterial({ color: colors.darker, roughness: 0.8 });
      allMats.push(stripeMat);
      for (let i = 0; i < 3; i++) {
        const stripeGeo = addGeo(new THREE.BoxGeometry(0.72, 0.03, 0.15));
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 1.22 + i * 0.13, 0.35);
        stripe.rotation.x = 0.15;
        catGroup.add(stripe);
      }
    }

    // Position the whole cat
    catGroup.position.set(0, -0.2, 0);

    // Store references for color updates
    sceneDataRef.current = {
      allMats, bodyMat, darkerMat, chestMat, noseMat, innerEarMat, irisMat, pupilMat,
      catGroup, head, body, tailGroup, tailMeshes,
      leftEar, rightEar, leftEye, rightEye
    };

    // --- Drag to rotate ---
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onDown = (e) => { isDragging = true; };
    const onMove = (e) => {
      const dx = e.offsetX - prevMouse.x;
      const dy = e.offsetY - prevMouse.y;
      if (isDragging) {
        catGroup.rotation.y += dx * 0.012;
        catGroup.rotation.x = Math.max(-0.4, Math.min(0.4, catGroup.rotation.x + dy * 0.012));
      }
      prevMouse = { x: e.offsetX, y: e.offsetY };
    };
    const onUp = () => { isDragging = false; };

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // --- Animation ---
    let startTime = performance.now();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) * 0.001;

      // Breathing
      body.scale.y = 0.65 + Math.sin(t * 2.2) * 0.012;
      head.position.y = 1.05 + Math.sin(t * 2.2) * 0.01;

      // Ear twitching
      leftEar.rotation.z = 0.25 + Math.sin(t * 3.2 + 1) * 0.06;
      rightEar.rotation.z = -0.25 + Math.sin(t * 2.8) * 0.06;

      // Tail wave
      tailMeshes.forEach((seg, i) => {
        const phase = i * 0.4;
        const baseAngle = (i / tailSegments) * Math.PI * 0.7;
        seg.position.x = Math.sin(t * 2.5 + phase) * 0.08 * (i / tailSegments);
        seg.position.y = Math.sin(baseAngle) * 0.5 + (i / tailSegments) * 0.3 + Math.sin(t * 1.5 + phase) * 0.02;
      });

      // Eye blink (every ~4 seconds)
      const blinkCycle = t % 4.0;
      let eyeScaleY = 1.0;
      if (blinkCycle > 3.7 && blinkCycle < 3.85) {
        eyeScaleY = Math.max(0.05, 1.0 - (blinkCycle - 3.7) / 0.075);
      } else if (blinkCycle >= 3.85 && blinkCycle < 4.0) {
        eyeScaleY = Math.min(1.0, (blinkCycle - 3.85) / 0.075);
      }
      leftEye.scale.y = eyeScaleY;
      rightEye.scale.y = eyeScaleY;

      // Gentle auto-rotate when not dragging
      if (!isDragging) {
        catGroup.rotation.y = Math.sin(t * 0.4) * 0.35;
        catGroup.rotation.x *= 0.97;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      window.removeEventListener('mouseup', onUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      allGeos.forEach(g => g.dispose());
      allMats.forEach(m => m.dispose());
    };
  }, [color, width, height]);

  return (
    <div
      ref={mountRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'grab',
        margin: '0 auto 15px auto',
        touchAction: 'none'
      }}
    />
  );
}

export default CatAvatar3D;
