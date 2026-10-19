import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cabinet, cabinetIssues, createKitchen, findPlacement, frontClearance, parseProject, placeAtWall, starter } from '../src/model';
import { emptyRoom, newRoomObject, roomFloorArea, roomObjectBounds, roomObjectType, ROOM_OBJECT_TYPES, validateRoom, WALLS, wallPoint } from '../src/room';
import type { Room, RoomObject, RoomObjectKind } from '../src/room';
import { auditCabinetOpening, previewConflicts } from '../src/openings';
import { worktopLayout } from '../src/construction';
import { populateRoomObjects } from '../src/roomObjectScene';
const object=(kind:RoomObjectKind='box',patch:Partial<RoomObject>={}):RoomObject=>{const t=roomObjectType(kind);return {id:crypto.randomUUID(),kind,label:t.name,wall:'A',offset:100,width:t.width,height:t.height,depth:t.depth,bottom:t.bottom,backGap:t.backGap,...patch};};
const project=(...objects:RoomObject[])=>createKitchen({...emptyRoom(),objects},'empty');
describe('measured room elements',()=>{
  it('uses exact wall-relative volumes on all four walls',()=>{
    const room=emptyRoom(4000,3000);for(const wall of WALLS){const o=object('box',{wall,offset:371,width:333,depth:111,backGap:19,bottom:41,height:200}),b=roomObjectBounds(room,o),center=wallPoint(room,wall,371+333/2,19+111/2);
      expect((b.minX+b.maxX)/2).toBe(center.x);expect((b.minZ+b.maxZ)/2).toBe(center.z);expect(b.bottom).toBe(41);expect(b.top).toBe(241);
    }
  });
  it('can place service centres exactly at the wall corner, floor and ceiling',()=>{
    for(const wall of WALLS){const room=emptyRoom(),o=object('socket',{wall,offset:-40,bottom:-40,backGap:0});expect(validateRoom({...room,objects:[o]})).toEqual([]);
      const b=roomObjectBounds(room,o),center=wallPoint(room,wall,0,0);expect((b.minX+b.maxX)/2).toBe(center.x);expect((b.minZ+b.maxZ)/2).toBe(center.z);
      expect(validateRoom({...room,objects:[{...o,bottom:room.height-40}]})).toEqual([]);expect(validateRoom({...room,objects:[{...o,bottom:room.height-39}]})).not.toEqual([]);
    }
  });
  it('creates every type on every wall with a full-height structural default',()=>{
    const room=emptyRoom(3600,3000,2417);for(const wall of WALLS)for(const type of ROOM_OBJECT_TYPES){const o=newRoomObject(room,type.kind,wall);expect(o).not.toBeNull();expect(validateRoom({...room,objects:[o!]})).toEqual([]);if(['box','column'].includes(type.kind))expect(o?.height).toBe(2417);}
  });
  it('tries a different position instead of placing a new solid inside an opening or solid',()=>{
    const room:Room={...emptyRoom(),openings:[{id:'window',kind:'window',wall:'A',offset:0,width:1000,height:1000,sill:900,hinge:'left',swing:'in'}],objects:[object('box',{offset:1100})]};
    expect(newRoomObject(room,'column','A')?.offset).toBe(1600);
  });
  it('rejects malformed objects, duplicate identities and unsupported millimetre values',()=>{
    const p=project(object()),o=p.room.objects![0];
    for(const objects of [null,{},[null],[{...o,kind:'unknown'}],[{...o,wall:'Z'}],[{...o,label:''}],[{...o,label:'x'.repeat(61)}],[{...o,width:NaN}],[{...o,depth:20.5}],[{...o,bottom:-1}],[{...o,backGap:-1}],[o,o],Array.from({length:65},()=>object())])expect(()=>parseProject({...p,room:{...p.room,objects}})).toThrow();
    p.room.openings=[{id:o.id,kind:'window',wall:'B',offset:100,width:1000,height:1000,sill:900,hinge:'left',swing:'in'}];expect(()=>parseProject(p)).toThrow();
  });
  it('rejects a solid outside the room, above the ceiling or covering a wall opening',()=>{
    const p=project(object('column',{wall:'B',backGap:3500}));expect(validateRoom(p.room)).not.toEqual([]);
    p.room.objects=[object('box',{bottom:1})];expect(validateRoom(p.room)).not.toEqual([]);
    p.room.objects=[object('box')];p.room.openings=[{id:'door',kind:'door',wall:'A',offset:100,width:800,height:2100,sill:0,hinge:'left',swing:'in'}];expect(validateRoom(p.room).join()).toContain('проём');
  });
  it('keeps floor area exact for overlapping structural footprints and ignores elevated radiators and points',()=>{
    const room={...emptyRoom(),objects:[object('column',{offset:0,width:400,depth:300}),object('box',{offset:200,width:400,depth:300}),object('radiator'),object('socket')]};expect(roomFloorArea(room)).toBe(room.width*room.depth-600*300);
  });
  it('round trips new elements and preserves old v2 projects without adding fields',()=>{
    const old=starter();expect(parseProject(old)).toEqual(old);const p=project(...ROOM_OBJECT_TYPES.map(t=>object(t.kind)));expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const loaded=parseProject({...p,room:{...p.room,objects:p.room.objects!.map(o=>({...o,unsupported:true}))}});expect(loaded.room.objects![0]).not.toHaveProperty('unsupported');expect(loaded.version).toBe(2);
  });
  it('uses the same solid bounds in Three.js as in geometry calculations',()=>{
    const room=emptyRoom();for(const wall of WALLS)for(const kind of ['box','column','radiator'] as const){const o=object(kind,{wall,offset:361,backGap:211,bottom:53,height:987}),root=new THREE.Group();populateRoomObjects(root,{...room,objects:[o]},null,[]);root.updateMatrixWorld(true);const actual=new THREE.Box3().setFromObject(root),b=roomObjectBounds(room,o);
      expect(actual.min.x*1000+room.width/2).toBeCloseTo(b.minX,3);expect(actual.max.x*1000+room.width/2).toBeCloseTo(b.maxX,3);expect(actual.min.z*1000+room.depth/2).toBeCloseTo(b.minZ,3);expect(actual.max.z*1000+room.depth/2).toBeCloseTo(b.maxZ,3);expect(actual.min.y*1000).toBeCloseTo(b.bottom,3);expect(actual.max.y*1000).toBeCloseTo(b.top,3);
      root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});
    }
  });
});
describe('furniture with existing room constraints',()=>{
  it('blocks a solid intersection but allows touching and different heights on all walls',()=>{
    for(const wall of WALLS){const o=object('radiator',{wall,offset:100,width:800,backGap:0,bottom:150,height:600}),p=project(o),base=placeAtWall(cabinet('base',600,0,0),p.room,wall,100),upper=placeAtWall(cabinet('wall',600,0,0),p.room,wall,100);
      expect(cabinetIssues(base,p).some(i=>i.code==='room-object'&&i.roomObjectId===o.id)).toBe(true);expect(cabinetIssues(upper,p)).toEqual([]);expect(cabinetIssues(placeAtWall(base,p.room,wall,900),p)).toEqual([]);
    }
  });
  it('finds an exact position after an obstruction, including one on an adjoining wall',()=>{
    const p=project(object('column',{offset:0,width:401,depth:300}));expect(findPlacement('base',600,p,'A')?.x).toBe(701);expect(findPlacement('base',600,p,'D')?.z).toBe(2700);
    p.room.objects=[object('column',{wall:'D',offset:2600,width:400,depth:311})];expect(findPlacement('base',600,p,'A')?.x).toBe(611);
  });
  it('warns about a hidden service without treating it as a solid placement error',()=>{
    const o=object('water',{offset:970,bottom:470}),p=project(o),c=cabinet('sink',600,1000,300);const found=cabinetIssues(c,p);expect(found.some(i=>i.code==='service-access'&&i.roomObjectId===o.id)).toBe(true);expect(found.some(i=>i.severity==='error')).toBe(false);
    expect(cabinetIssues(c,{...p,room:{...p.room,objects:[{...o,bottom:1470}]}})).toEqual([]);
  });
  it('checks exact counter height and front overhang against obstacles',()=>{
    const c=cabinet('base',600,1000,300),p=project(object('box',{offset:800,width:400,depth:100,backGap:610,bottom:880,height:100}));
    expect(cabinetIssues(c,p).some(i=>i.code==='room-object')).toBe(true);p.finishes.worktop='darkstone';expect(cabinetIssues(c,p).some(i=>i.code==='room-object')).toBe(true);
    p.room.objects![0].bottom=882;expect(cabinetIssues(c,p).some(i=>i.code==='room-object')).toBe(false);p.construction={frontOverhang:0,bridgeGap:0};p.room.objects![0].bottom=880;expect(cabinetIssues(c,p).some(i=>i.code==='room-object')).toBe(false);
  });
  it('includes the closed facade thickness when checking a low obstruction',()=>{
    const c=cabinet('base',600,1000,300),p=project(object('box',{offset:800,width:400,backGap:621,depth:100,bottom:150,height:100}));expect(cabinetIssues(c,p).some(i=>i.code==='room-object')).toBe(true);
    p.room.objects![0].backGap=622;expect(cabinetIssues(c,p)).toEqual([]);
  });
  it('measures clear space to an interior column and ignores a high hanging box',()=>{
    const c=cabinet('base',600,1000,300),p=project(object('column',{offset:800,width:400,backGap:1500,depth:300}));expect(frontClearance(c,p).distance).toBe(900);
    p.room.objects![0].bottom=2000;p.room.objects![0].height=500;expect(frontClearance(c,p).distance).toBe(p.room.depth-600);
  });
  it('subtracts a structural volume from the worktop rather than drawing through it',()=>{
    const p=project(object('column',{offset:900,width:200,depth:300}));p.cabinets=[cabinet('base',600,1000,300)];expect(worktopLayout(p).area).toBe(600*620-200*300);
    p.room.objects![0].bottom=1000;p.room.objects![0].height=1000;expect(worktopLayout(p).area).toBe(600*620);
  });
  it('checks moving fronts against solids in 3D but never against utility symbols',()=>{
    const o=object('radiator',{offset:800,width:400,depth:100,backGap:900,bottom:150,height:400}),p=project(o),c=cabinet('drawers',600,1000,300);p.cabinets=[c];expect(cabinetIssues(c,p)).toEqual([]);
    expect(auditCabinetOpening(c,p).some(i=>i.kind==='room-object'&&i.roomObjectId===o.id)).toBe(true);expect(previewConflicts(p,{[c.id]:{target:'all',progress:100}}).some(i=>i.roomObjectId===o.id)).toBe(true);
    p.room.objects=[object('socket',{offset:960,backGap:950,bottom:200})];expect(auditCabinetOpening(c,p)).toEqual([]);expect(previewConflicts(p,{[c.id]:{target:'all',progress:100}})).toEqual([]);
  });
});
