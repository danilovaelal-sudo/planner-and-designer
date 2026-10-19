import { describe, expect, it } from 'vitest';
import { cabinet, createKitchen, MODULES, placeAtWall, starter } from '../src/model';
import type { Cabinet } from '../src/model';
import { emptyRoom, WALLS } from '../src/room';
import * as THREE from 'three';
import { populateFronts } from '../src/frontScene';
import { auditCabinetOpening, auditOpenings, boxesIntersect, frontAssemblies, frontPlanPolygon, pieceBox, pieceLocalPoint, pieceVertices, previewConflicts, previewProgress, worldPoint } from '../src/openings';

function project(...cabinets:Cabinet[]){return {...createKitchen(emptyRoom(),'empty'),cabinets};}
const first=(c:Cabinet)=>frontAssemblies(c)[0];
const hasBlocker=(c:Cabinet,other:Cabinet)=>auditCabinetOpening(c,project(c,other)).some(i=>i.otherId===other.id);
describe('front mechanisms and their common 2D/3D geometry',()=>{
  it('provides stable independent parts for all movable catalogue types',()=>{
    for(const type of MODULES){const parts=frontAssemblies(cabinet(type.kind,type.widths[0],1800,1200));expect(new Set(parts.map(p=>p.id)).size).toBe(parts.length);expect(parts.length>0).toBe(!['open','filler','wall-filler','tall-filler'].includes(type.kind));}
    expect(frontAssemblies(cabinet('drawers',600,0,0)).map(p=>p.id)).toEqual(['drawer-1','drawer-2','drawer-3']);
  });
  it('opens only the requested part and clamps the preview',()=>{
    const [lower,middle]=frontAssemblies(cabinet('drawers',600,0,0));
    expect(previewProgress({target:middle.id,progress:40},lower)).toBe(0);expect(previewProgress({target:middle.id,progress:40},middle)).toBe(40);
    expect(previewProgress({target:'all',progress:200},lower)).toBe(100);expect(previewProgress({target:'all',progress:-10},lower)).toBe(0);
  });
  it('translates each drawer 500mm while keeping its height and width',()=>{
    const c=cabinet('drawers',600,1000,300),part=first(c),piece=part.pieces[0],closed=pieceBox(c,part,piece,0),opened=pieceBox(c,part,piece,100);
    expect(opened.center.z-closed.center.z).toBe(500);expect(opened.center.y).toBe(closed.center.y);expect(opened.center.x).toBe(closed.center.x);
    expect(part.pieces.find(p=>p.style==='tray')?.size.z).toBe(500);
  });
  it('mirrors single hinges and fixes two-door hinges to the outside edges',()=>{
    const c=cabinet('base',600,1000,300),left=first(c),right=first({...c,hinge:'right'});
    const l=pieceBox(c,left,left.pieces[0],100),r=pieceBox(c,right,right.pieces[0],100);expect(l.center.x+r.center.x).toBeCloseTo(2000);expect(l.center.z).toBeCloseTo(r.center.z);
    const wide={...c,width:900};expect(frontAssemblies(wide)).toEqual(frontAssemblies({...wide,hinge:'right'}));
  });
  it('folds appliance doors down in height while moving them into the room',()=>{
    for(const kind of ['oven','dishwasher'] as const){const c=cabinet(kind,600,1000,300),part=first(c),piece=part.pieces[0],before=pieceBox(c,part,piece,0),after=pieceBox(c,part,piece,100);
      expect(after.center.y).toBeLessThan(before.center.y);expect(after.center.z).toBeGreaterThan(before.center.z);expect(after.half).toEqual(before.half);
    }
  });
  it('rotates plan projection and elevation with the same world transform on every wall',()=>{
    const room=emptyRoom();for(const wall of WALLS){const c=placeAtWall(cabinet('wall',600,0,0),room,wall,800),part=first(c),piece=part.pieces[0];
      const local=pieceLocalPoint(part,piece,{x:0,y:0,z:0},63),center=pieceBox(c,part,piece,63).center;expect(center).toEqual(worldPoint(c,local));
      expect(center.y).toBeGreaterThan(1450);const polygon=frontPlanPolygon(c,part,piece,63),vertices=pieceVertices(c,part,piece,63);
      expect(Math.min(...polygon.map(v=>v.x))).toBeCloseTo(Math.min(...vertices.map(v=>v.x)));expect(Math.max(...polygon.map(v=>v.y))).toBeCloseTo(Math.max(...vertices.map(v=>v.z)));
    }
  });
  it('keeps linked corner leaves rigid for both hinge sides and all rotations',()=>{
    for(const hinge of ['left','right'] as const)for(const rotation of [0,90,180,270]){const c={...cabinet('corner',900,1800,1500,rotation),hinge},part=first(c);expect(part.pieces).toHaveLength(2);
      const distance=(progress:number)=>{const a=pieceBox(c,part,part.pieces[0],progress).center,b=pieceBox(c,part,part.pieces[1],progress).center;return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);};expect(distance(100)).toBeCloseTo(distance(0));expect(previewConflicts(project(c),{[c.id]:{target:'all',progress:100}})).toEqual([]);
    }
  });
  it('renders the exact same moving geometry that plan and collision checks use',()=>{
    const material=new THREE.MeshBasicMaterial();
    for(const type of MODULES)for(const rotation of [0,90,180,270])for(const hinge of ['left','right'] as const)for(const progress of [0,37,100]){
      const c={...cabinet(type.kind,type.widths[0],1800,1500,rotation),hinge},parent=new THREE.Group();parent.position.set(c.x/1000,type.elevation/1000,c.z/1000);parent.rotation.y=rotation*Math.PI/180;
      populateFronts(parent,c,{target:'all',progress},[],{front:material,white:material,dark:material,steel:material,handle:material,handles:true});parent.updateMatrixWorld(true);
      for(const part of frontAssemblies(c)){const group=parent.children.find(g=>g.userData.frontPartId===part.id)!;part.pieces.forEach((piece,i)=>{
        const actual=group.children[i].localToWorld(new THREE.Vector3(piece.size.x/2000,piece.size.y/2000,piece.size.z/2000)),expected=worldPoint(c,pieceLocalPoint(part,piece,{x:piece.size.x/2,y:piece.size.y/2,z:piece.size.z/2},progress));
        expect(actual.x*1000).toBeCloseTo(expected.x,6);expect(actual.y*1000).toBeCloseTo(expected.y,6);expect(actual.z*1000).toBeCloseTo(expected.z,6);
      });}
      parent.traverse(o=>{if('geometry' in o)(o.geometry as THREE.BufferGeometry).dispose();});
    }
    material.dispose();
  });
});
describe('three-dimensional interference checks',()=>{
  it('uses oriented boxes rather than overlapping axis-aligned extents',()=>{
    const c=cabinet('base',600,1000,300),part=first(c),a=pieceBox(c,part,part.pieces[0],50),b={...a,center:{...a.center,x:a.center.x+40,z:a.center.z-40},vertices:[]};
    expect(boxesIntersect(a,b)).toBe(false);expect(boxesIntersect(a,{...a,center:{...a.center,x:a.center.x+2}})).toBe(true);
  });
  it('allows exact touching but detects penetration',()=>{
    const c=cabinet('drawers',600,1000,300),part=first(c),a=pieceBox(c,part,part.pieces[0],100);
    expect(boxesIntersect(a,{...a,center:{...a.center,x:a.center.x+592}})).toBe(false);expect(boxesIntersect(a,{...a,center:{...a.center,x:a.center.x+591}})).toBe(true);
  });
  it('detects an opposing base cabinet without mistaking an upper cabinet for it',()=>{
    const c=cabinet('drawers',600,1000,300),base=cabinet('base',600,1000,1350,180),upper=cabinet('wall',600,1000,1350,180);
    expect(hasBlocker(c,base)).toBe(true);expect(hasBlocker(c,upper)).toBe(false);
    const states={[c.id]:{target:'drawer-1',progress:100}};expect(previewConflicts(project(c,base),states).some(i=>i.otherId===base.id)).toBe(true);expect(previewConflicts(project(c,upper),states)).toEqual([]);
  });
  it('checks fold-down doors at their actual height',()=>{
    const c=cabinet('dishwasher',600,1000,300),upper=cabinet('wall',600,1000,1200,180),base=cabinet('base',600,1000,1200,180);
    expect(hasBlocker(c,upper)).toBe(false);expect(hasBlocker(c,base)).toBe(true);
  });
  it('detects a narrow obstacle during the sweep although the final position is clear',()=>{
    const c=cabinet('base',600,1000,300),filler=cabinet('filler',17,760,700),p=project(c,filler);
    expect(auditCabinetOpening(c,p).some(i=>i.otherId===filler.id)).toBe(true);
    expect(previewConflicts(p,{[c.id]:{target:'all',progress:100}}).some(i=>i.otherId===filler.id)).toBe(false);
    expect(hasBlocker({...c,hinge:'right'},filler)).toBe(false);
  });
  it('checks walls through the full motion and on all four cabinet rotations',()=>{
    for(const wall of WALLS){const p=project(),c=placeAtWall(cabinet('drawers',600,0,0),p.room,wall,700);p.cabinets=[c];expect(auditCabinetOpening(c,p)).toEqual([]);
      const moved=placeAtWall(c,p.room,wall,700,(wall==='A'||wall==='C'?p.room.depth:p.room.width)-1000);p.cabinets=[moved];expect(auditCabinetOpening(moved,p).some(i=>i.kind==='wall')).toBe(true);
    }
  });
  it('does not report a flush hinged cabinet as crossing its adjacent side wall',()=>{
    for(const wall of WALLS){const p=project(),c=placeAtWall(cabinet('base',600,0,0),p.room,wall,0);p.cabinets=[c];for(const hinge of ['left','right'] as const)expect(auditCabinetOpening({...c,hinge},p)).toEqual([]);}
  });
  it('checks the open entry leaf and ignores a door that opens outwards',()=>{
    const c=cabinet('drawers',600,1000,300),p=project(c);p.room.openings=[{id:'entry',kind:'door',wall:'A',offset:1000,width:800,height:2100,sill:0,hinge:'left',swing:'in'}];
    expect(auditCabinetOpening(c,p).some(i=>i.kind==='entry-door'&&i.openingId==='entry')).toBe(true);p.room.openings[0].swing='out';expect(auditCabinetOpening(c,p)).toEqual([]);
  });
  it('finds two open drawer trays colliding in an otherwise clear aisle',()=>{
    const a=cabinet('drawers',600,1000,300),b=cabinet('drawers',600,1000,1700,180),p=project(a,b);expect(auditOpenings(p)).toEqual([]);
    expect(previewConflicts(p,{[a.id]:{target:'all',progress:100},[b.id]:{target:'all',progress:100}}).some(i=>i.kind==='front'&&i.otherId===b.id)).toBe(true);
  });
  it('does not modify saved placement, materials or project format during any preview',()=>{
    const p=starter(),saved=JSON.stringify(p);auditOpenings(p);previewConflicts(p,Object.fromEntries(p.cabinets.map(c=>[c.id,{target:'all',progress:75}])));expect(JSON.stringify(p)).toBe(saved);
  });
});
