/* ═══════════════════════════════════════════════════════════════════════
   draft.js — 正交二维视图：俯视 / 正视 / 左视 / 剖面
   取景直接用工程几何尺寸（不信 Box3，避免 InstancedMesh 包围盒失真）
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { HALF_X, HALF_Z, GEO } from './sections.js';

export class DraftViews {
  constructor(stage, arena) {
    this.stage = stage;
    this.arena = arena;
    /* 工程包络：看台外皮 + 屋盖外檐 */
    const EX = HALF_X + GEO.roofOuterS + 14;
    const EZ = HALF_Z + GEO.roofOuterS + 14;
    const EY = GEO.crownY + 8;
    this.env = { EX, EZ, EY };
    this.center = new THREE.Vector3(0, EY * 0.30, 0);

    const mk = (pos, up, near, far) => {
      const c = new THREE.OrthographicCamera(-1, 1, 1, -1, near, far);
      c.position.copy(pos);
      c.up.copy(up);
      c.lookAt(this.center);
      c.updateMatrixWorld();
      return c;
    };
    const D = Math.max(EX, EZ) * 3 + 400;
    this.cams = {
      plan: mk(new THREE.Vector3(0, EY + D, 0.001), new THREE.Vector3(0, 0, -1), 1, D * 2),
      front: mk(new THREE.Vector3(0, EY * 0.5, EZ + D), new THREE.Vector3(0, 1, 0), 1, D * 2),
      left: mk(new THREE.Vector3(EX + D, EY * 0.5, 0), new THREE.Vector3(0, 1, 0), 1, D * 2),
      section: mk(new THREE.Vector3(0, EY * 0.5, EZ + D), new THREE.Vector3(0, 1, 0), 1, D * 2),
    };
    this.fit();
    window.addEventListener('resize', () => this.fit());
  }

  fit() {
    const a = window.innerWidth / window.innerHeight;
    const { EX, EZ, EY } = this.env;
    // 每个视图的内容尺寸（宽, 高）
    const dims = {
      plan: [EX * 2.05, EZ * 2.05],
      front: [EX * 2.02, EY * 0.86],
      left: [EZ * 2.02, EY * 0.86],
      section: [EX * 2.02, EY * 0.86],
    };
    for (const key of Object.keys(this.cams)) {
      const c = this.cams[key];
      let [w, h] = dims[key];
      const ar = w / h;
      if (ar > a) { c.left = -w / 2; c.right = w / 2; c.top = w / 2 / a; c.bottom = -w / 2 / a; }
      else { c.left = -h * a / 2; c.right = h * a / 2; c.top = h / 2; c.bottom = -h / 2; }
      c.updateProjectionMatrix();
    }
  }

  get(name) { return this.cams[name] || this.cams.plan; }
}
