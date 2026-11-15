// Prepara os modelos KayKit (CC0): um arquivo leve por personagem + um arquivo único de animações compartilhadas.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, resample } from '@gltf-transform/functions';
import fs from 'fs';
const A = '/home/claude/assets/kk/addons/kaykit_character_pack_adventures/Characters/gltf/', S = '/home/claude/assets/sk/addons/kaykit_character_pack_skeletons/Characters/gltf/';
const CH = [['knight', A + 'Knight.glb'], ['mage', A + 'Mage.glb'], ['rogue', A + 'Rogue.glb'], ['barbarian', A + 'Barbarian.glb'], ['skmage', S + 'Skeleton_Mage.glb'], ['skwarrior', S + 'Skeleton_Warrior.glb'], ['skrogue', S + 'Skeleton_Rogue.glb'], ['skminion', S + 'Skeleton_Minion.glb']];
const KEEP = ['Idle', 'Running_A', 'Walking_A', 'Throw', 'Interact', 'Cheer', 'Death_A', 'Hit_A', 'Hit_B', 'Dodge_Forward', 'Unarmed_Melee_Attack_Kick', 'Spellcast_Shoot', 'Use_Item', 'Block', 'Jump_Full_Short', 'PickUp', 'Sit_Floor_Idle'];
const kill = a => { for (const c of a.listChannels()) c.dispose(); for (const sm of a.listSamplers()) { const i = sm.getInput(), o = sm.getOutput(); sm.dispose(); } a.dispose(); };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const out = 'static/models'; fs.mkdirSync(out, { recursive: true });
for (const [name, file] of CH) {
  const d = await io.read(file); for (const a of d.getRoot().listAnimations()) kill(a);
  await d.transform(prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
  await io.write(`${out}/${name}.glb`, d); console.log(name, fs.statSync(`${out}/${name}.glb`).size);
}
{ const d = await io.read(CH[0][1]), r = d.getRoot();
  for (const a of r.listAnimations()) { if (!KEEP.includes(a.getName())) { kill(a); continue; }
    for (const c of a.listChannels()) { const n = c.getTargetNode().getName(), path = c.getTargetPath(); if (/IK|control/.test(n) || path === 'scale' || (path === 'translation' && n !== 'hips' && n !== 'root')) { const sm = c.getSampler(); c.dispose(); if (sm && sm.listParents().filter(x => x.propertyType === 'AnimationChannel').length === 0) sm.dispose(); } } }
  for (const n of r.listNodes()) { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); }
  for (const m of r.listMeshes()) m.dispose(); for (const s of r.listSkins()) s.dispose();
  await d.transform(resample({ tolerance: 0.01 }), prune({ keepLeaves: true }), dedup());
  await io.write(`${out}/anims.glb`, d); console.log('anims', fs.statSync(`${out}/anims.glb`).size, r.listAnimations().map(a => a.getName()).join(','));
}
