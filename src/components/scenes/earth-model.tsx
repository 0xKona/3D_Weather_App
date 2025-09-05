"use client"

import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { vertexShader } from "../shaders/vertex";
import { fragmentShader } from "../shaders/fragment";
import EarthUtils from "./scene-utils/earth-utils";

export interface EarthSceneProps {
  coords: [string, string];
  onLocationSelect?: (lat: number, lng: number) => void;
  manualRotation?: { lat: number; lng: number };
  zoom?: number;
}

export default function EarthModel({ coords, onLocationSelect, manualRotation, zoom = 1 }: EarthSceneProps) {
  // refs
  const tiltRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // click/double-click tracking
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  // lighting state
  const [sunDirection, setSunDirection] = useState(EarthUtils.getSunDirection(new Date()));
  const [lightingIntensity, setLightingIntensity] = useState(EarthUtils.getLightingIntensity(sunDirection));

  // textures
  const [map, spec, bump, lights, cloudsTex] = useLoader(THREE.TextureLoader, [
    "./textures/8081_earthmap10k.jpg",
    "./textures/8081_earthspec10k.jpg",
    "./textures/8081_earthbump10k.jpg",
    "./textures/8081_earthlights10k.jpg",
    "./textures/clouds_map.jpg",
  ]) as unknown as THREE.Texture[];

  // common texture settings
  useEffect(() => {
    const tex = [map, spec, bump, lights, cloudsTex];
    tex.forEach(t => {
      t.anisotropy = 16;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    });
    return () => tex.forEach(t => t.dispose());
  }, [map, spec, bump, lights, cloudsTex]);

  // geometry & small materials
  const geom = useMemo(() => new THREE.SphereGeometry(1, 128, 96), []);
  const pinGeom = useMemo(() => new THREE.SphereGeometry(0.015, 16, 16), []);
  const pinMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({ color: 0xff4444, transparent: true, opacity: 0.9, emissive: 0xff2222, emissiveIntensity: 0.5 }),
    []
  );

  // position pinpoint when coords change
  useEffect(() => {
    if (!pinRef.current || !coords?.[0] || !coords?.[1]) return;
    const lat = parseFloat(coords[0]);
    const lng = parseFloat(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      pinRef.current.position.copy(EarthUtils.latLngToVector3(lat, lng));
      pinRef.current.visible = true;
    }
  }, [coords]);

  // earth shader material
  const earthMaterial = useMemo(() => {
    if (!map || !lights || !spec || !bump) return new THREE.MeshBasicMaterial({ color: 0x5566aa });
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: map },
        nightTexture: { value: lights },
        specularMap: { value: spec },
        bumpMap: { value: bump },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        bumpScale: { value: 0.04 },
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: true,
      blending: THREE.NormalBlending,
      premultipliedAlpha: false,
    });
  }, [map, lights, spec, bump]);

  const cloudsMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: cloudsTex, transparent: true, opacity: 0.45, alphaTest: 0.1, blending: THREE.NormalBlending, depthWrite: true, side: THREE.FrontSide }),
    [cloudsTex]
  );

  const atmosphereMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({ color: 0x3388ff, transparent: true, opacity: 0.06, side: THREE.BackSide, shininess: 100, emissive: new THREE.Color(0x1155aa), emissiveIntensity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }),
    []
  );

  // dispose on unmount
  useEffect(() => {
    return () => {
      earthMaterial.dispose();
      cloudsMaterial.dispose();
      atmosphereMat.dispose();
      pinMat.dispose();
      geom.dispose();
      pinGeom.dispose();
    };
  }, [earthMaterial, cloudsMaterial, atmosphereMat, pinMat, geom, pinGeom]);

  // initial tilt & orientation
  useEffect(() => {
    if (tiltRef.current) tiltRef.current.rotation.z = THREE.MathUtils.degToRad(23.44);
    if (earthRef.current) earthRef.current.rotation.set(0, THREE.MathUtils.degToRad(-90), 0);
  }, []);

  // manual rotation (sliders) and zoom
  useEffect(() => {
    if (!earthRef.current || !manualRotation) return;
    const lat = THREE.MathUtils.degToRad(manualRotation.lat);
    const lng = THREE.MathUtils.degToRad(manualRotation.lng);
    gsap.to(earthRef.current.rotation, { x: -lat, y: THREE.MathUtils.degToRad(-90) - lng, z: 0, duration: 0.5, ease: "power2.out", overwrite: true });
  }, [manualRotation]);

  useEffect(() => {
    if (!earthRef.current) return;
    gsap.to(earthRef.current.scale, { x: zoom, y: zoom, z: zoom, duration: 0.3, ease: "power2.out" });
  }, [zoom]);

  // double-click selection
  const handlePointerDown = (e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation();
    if (!earthMeshRef.current) return;
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => (clickCount.current = 0), 300);
      return;
    }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickCount.current = 0;
    const local = earthMeshRef.current.worldToLocal(e.point.clone());
    const { lat, lng } = EarthUtils.vector3ToLatLng(local);
    onLocationSelect?.(lat, lng);
  };

  // periodic sun update
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dir = EarthUtils.getSunDirection(now);
      setSunDirection(dir);
      setLightingIntensity(EarthUtils.getLightingIntensity(dir));
    };
    update();
    const id = setInterval(update, 20000);
    return () => clearInterval(id);
  }, []);

  // apply sun updates to light and shader
  useEffect(() => {
    if (sunRef.current) {
      sunRef.current.position.copy(sunDirection.clone().multiplyScalar(100));
      sunRef.current.intensity = lightingIntensity;
      sunRef.current.lookAt(0, 0, 0);
      sunRef.current.color = new THREE.Color().setHSL(0.1, 0.3, 0.7);
    }
    if (earthMaterial instanceof THREE.ShaderMaterial && earthMaterial.uniforms) {
      earthMaterial.uniforms.sunDirection.value.copy(sunDirection);
    }
  }, [sunDirection, lightingIntensity, earthMaterial]);

  // cleanup on unmount
  useEffect(() => {
    const g = earthRef.current;
    return () => {
      if (g?.rotation) gsap.killTweensOf(g.rotation);
      if (g?.scale) gsap.killTweensOf(g.scale);
      if (clickTimer.current) clearTimeout(clickTimer.current);
    };
  }, []);

  // frame loop
  useFrame((state) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00005;
    if (earthRef.current && !gsap.isTweening(earthRef.current.rotation)) earthRef.current.rotation.y += 0.00002;
    if (pinRef.current && pinRef.current.visible) pinRef.current.scale.setScalar(0.55 + Math.sin(state.clock.getElapsedTime()) * 0.1);
  });

  return (
    <>
      <ambientLight intensity={0.14} color={new THREE.Color(0x303040)} />
      <directionalLight ref={sunRef} position={[0, 100, 0]} intensity={1.0} color={new THREE.Color(0xffffee)} castShadow={false} />

      <group ref={tiltRef}>
        <group ref={earthRef}>
          <mesh ref={earthMeshRef} geometry={geom} material={earthMaterial} onPointerDown={handlePointerDown} castShadow={false} receiveShadow={false} />
          <mesh ref={cloudsRef} geometry={geom} material={cloudsMaterial} scale={1.003} />
          <mesh geometry={geom} material={atmosphereMat} scale={1.01} />
          <mesh ref={pinRef} geometry={pinGeom} material={pinMat} visible={false} />
        </group>
      </group>
    </>
  );
}