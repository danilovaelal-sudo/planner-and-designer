import { describe, expect, it } from 'vitest';
import { bounds, cabinet, findPlacement, intersects, isInside, issues, parseProject, snap, starter } from '../src/model';

describe('kitchen geometry',()=>{
  it('starts with valid straight and corner layouts',()=>{
    for(const layout of ['straight','corner'] as const) expect(issues(starter(layout))).toEqual([]);
  });
  it('rotates the footprint as well as the visual cabinet',()=>{
    const c=cabinet('base',800,300,400,270);
    expect(bounds(c)).toEqual({minX:0,maxX:600,minZ:0,maxZ:800});
    expect(isInside(c,starter().room)).toBe(true);
  });
  it('allows touching modules, rejects overlap, and respects vertical tiers',()=>{
    const a=cabinet('base',600,300,300);
    expect(intersects(a,cabinet('base',600,900,300))).toBe(false);
    expect(intersects(a,cabinet('base',600,850,300))).toBe(true);
    expect(intersects(a,cabinet('wall',600,300,175))).toBe(false);
    expect(intersects(cabinet('fridge',600,300,300),cabinet('wall',600,300,175))).toBe(true);
  });
  it('finds a free position on the return wall without overlapping the corner',()=>{
    const p=starter(),c=findPlacement('base',600,p,'B');
    expect(c).not.toBeNull();expect(c!.rotation).toBe(270);
    expect(isInside(c!,p.room)).toBe(true);
    expect(p.cabinets.some(other=>intersects(other,c!))).toBe(false);
  });
  it('does not place a unit on an already occupied wall',()=>{
    expect(findPlacement('base',600,starter(),'A')).toBeNull();
  });
  it('snaps to neighbours and room boundaries',()=>{
    const p=starter();p.cabinets=[cabinet('base',600,300,300)];
    const next=snap(cabinet('base',600,930,315),p);
    expect(next.x).toBe(900);expect(next.z).toBe(300);
    const edge=snap(cabinet('base',600,-100,5000),p);
    expect(isInside(edge,p.room)).toBe(true);
  });
  it('reports ceiling and room boundary violations',()=>{
    const p=starter();p.room.height=2100;p.room.width=2000;
    const messages=issues(p).map(i=>i.message);
    expect(messages.some(m=>m.includes('потолка'))).toBe(true);
    expect(messages.some(m=>m.includes('границы'))).toBe(true);
  });
});

describe('project interchange',()=>{
  it('round-trips a valid project and drops unsupported fields',()=>{
    const p=starter();expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const imported=parseProject({...p,admin:true,room:{...p.room,unexpected:true}});
    expect(imported).not.toHaveProperty('admin');expect(imported.room).not.toHaveProperty('unexpected');
  });
  it('rejects unknown versions, arbitrary cabinet sizes and duplicate identifiers',()=>{
    const p=starter();expect(()=>parseProject({...p,version:99})).toThrow();
    expect(()=>parseProject({...p,cabinets:[{...p.cabinets[0],width:777}]})).toThrow();
    expect(()=>parseProject({...p,cabinets:[p.cabinets[0],p.cabinets[0]]})).toThrow();
  });
  it('rejects nonfinite room values, unknown materials and windows outside the wall',()=>{
    const p=starter();expect(()=>parseProject({...p,room:{...p.room,width:Infinity}})).toThrow();
    expect(()=>parseProject({...p,finishes:{...p.finishes,lower:'unknown'}})).toThrow();
    expect(()=>parseProject({...p,room:{...p.room,windowOffset:2900}})).toThrow();
  });
});
