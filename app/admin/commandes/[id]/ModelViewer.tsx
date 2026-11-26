"use client";

import { useEffect, useRef, useState } from "react";
import { Box, LoaderCircle, RotateCcw, Ruler } from "lucide-react";

type Stats = { x: number; y: number; z: number; volumeCm3: number; triangles: number };

// Densités en g/cm³, pour estimer le poids d'une pièce pleine.
const densities = [
  { name: "PLA", value: 1.24 },
  { name: "PETG", value: 1.27 },
];

const mm = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1)).replace(".", ",");

// Aperçu 3D d'un fichier STL, 3MF ou OBJ : on le fait tourner à la souris (ou au doigt),
// avec ses dimensions et son volume, utiles pour le devis. three.js n'est chargé qu'ici.
export default function ModelViewer({ url, name }: { url: string; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});
  const wire = useRef<(on: boolean) => void>(() => {});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const [wireframe, setWireframe] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        const ext = name.toLowerCase().split(".").pop();

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();

        // Chargement selon le format : on obtient un objet 3D en millimètres.
        let object: InstanceType<typeof THREE.Object3D>;
        if (ext === "stl") {
          const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
          const geometry = new STLLoader().parse(data);
          object = new THREE.Mesh(geometry);
        } else if (ext === "3mf") {
          const { ThreeMFLoader } = await import("three/addons/loaders/3MFLoader.js");
          object = new ThreeMFLoader().parse(data);
        } else {
          const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
          object = new OBJLoader().parse(new TextDecoder().decode(data));
        }
        if (disposed) return;

        // Les fichiers d'impression ont l'axe Z vers le haut ; three.js utilise Y.
        object.rotation.x = -Math.PI / 2;
        object.updateMatrixWorld(true);

        const material = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.55, metalness: 0.05, flatShading: false });
        let triangles = 0;
        let volume = 0;
        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        object.traverse((child) => {
          const mesh = child as InstanceType<typeof THREE.Mesh>;
          if (!mesh.isMesh) return;
          mesh.material = material;
          const geometry = mesh.geometry;
          // Beaucoup de STL ont des normales vides (0, 0, 0) : la pièce paraîtrait noire. On les recalcule.
          if (geometry.attributes.normal) geometry.deleteAttribute("normal");
          geometry.computeVertexNormals();
          const pos = geometry.attributes.position;
          const index = geometry.index;
          const count = index ? index.count : pos.count;
          triangles += count / 3;
          // Volume : somme des tétraèdres signés formés par chaque triangle et l'origine.
          for (let i = 0; i < count; i += 3) {
            const [i0, i1, i2] = index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2];
            a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
            b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
            c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
            volume += a.dot(b.cross(c)) / 6;
          }
        });

        // Pièce posée au centre, sur le plateau.
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        object.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
        setStats({ x: size.x, y: size.z, z: size.y, volumeCm3: Math.abs(volume) / 1000, triangles: Math.round(triangles) });

        const scene = new THREE.Scene();
        scene.add(object);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.2));
        const sun = new THREE.DirectionalLight(0xffffff, 2);
        sun.position.set(1, 2, 1.5);
        scene.add(sun);
        const radius = Math.max(size.x, size.y, size.z) || 10;
        const grid = new THREE.GridHelper(Math.ceil((radius * 2) / 10) * 10, Math.ceil((radius * 2) / 10), 0x4b5563, 0x2a2f37);
        scene.add(grid);

        const camera = new THREE.PerspectiveCamera(40, 1, radius / 100, radius * 100);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = "none";

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        const target = new THREE.Vector3(0, size.y / 2, 0);
        reset.current = () => {
          camera.position.set(radius * 1.6, radius * 1.2 + size.y / 2, radius * 1.9);
          controls.target.copy(target);
          controls.update();
        };
        reset.current();
        wire.current = (on) => {
          material.wireframe = on;
        };

        const resize = () => {
          const { width, height } = el.getBoundingClientRect();
          renderer.setSize(width, height, false);
          renderer.domElement.style.width = "100%";
          renderer.domElement.style.height = "100%";
          camera.aspect = width / Math.max(height, 1);
          camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(el);

        let frame = 0;
        const loop = () => {
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(loop);
        };
        loop();
        setState("ready");

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          controls.dispose();
          object.traverse((child) => (child as InstanceType<typeof THREE.Mesh>).geometry?.dispose());
          material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch (e) {
        console.error("Aperçu 3D :", e);
        if (!disposed) setState("error");
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [url, name]);

  return (
    <div className="overflow-hidden rounded-md border border-line bg-bg/60">
      <div className="relative h-[300px] sm:h-[360px]">
        <div ref={box} className="absolute inset-0" />
        {state !== "ready" && (
          <div className="absolute inset-0 grid place-items-center text-[12.5px] text-muted">
            {state === "loading" ? (
              <span className="flex items-center gap-2">
                <LoaderCircle size={14} className="animate-spin" aria-hidden /> Chargement du modèle…
              </span>
            ) : (
              "Impossible d'afficher ce fichier en 3D. Téléchargez-le pour l'ouvrir dans le slicer."
            )}
          </div>
        )}
        {state === "ready" && (
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => {
                wire.current(!wireframe);
                setWireframe(!wireframe);
              }}
              aria-pressed={wireframe}
              title="Voir le maillage"
              className={`grid size-7 place-items-center rounded-md border border-line bg-panel/90 transition hover:text-fg ${wireframe ? "text-accent" : "text-muted"}`}
            >
              <Box size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => reset.current()}
              title="Recentrer"
              className="grid size-7 place-items-center rounded-md border border-line bg-panel/90 text-muted transition hover:text-fg"
            >
              <RotateCcw size={14} aria-hidden />
            </button>
          </div>
        )}
      </div>
      {stats && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-[12px] sm:grid-cols-4">
          <div className="col-span-2 flex items-center gap-1.5">
            <Ruler size={12} className="text-muted" aria-hidden />
            <dt className="sr-only">Dimensions</dt>
            <dd className="font-mono">
              {mm(stats.x)} × {mm(stats.y)} × {mm(stats.z)} mm
            </dd>
          </div>
          <div>
            <dt className="inline text-muted">Volume </dt>
            <dd className="inline font-mono">{stats.volumeCm3.toFixed(1).replace(".", ",")} cm³</dd>
          </div>
          <div>
            <dt className="inline text-muted">Triangles </dt>
            <dd className="inline font-mono">{stats.triangles.toLocaleString("fr-FR")}</dd>
          </div>
          <div className="col-span-2 text-muted sm:col-span-4">
            Poids si la pièce était pleine :{" "}
            {densities.map((d, i) => (
              <span key={d.name}>
                {i > 0 && " · "}
                {d.name} <span className="font-mono text-fg">{Math.round(stats.volumeCm3 * d.value)} g</span>
              </span>
            ))}
            . Le poids réel dépend du remplissage : le slicer donne le chiffre exact.
          </div>
        </dl>
      )}
    </div>
  );
}
