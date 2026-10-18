import { describe, expect, it } from 'vitest';
import { bounds, cabinet, createKitchen, findPlacement, intersects, isInside, issues, nudgeCabinet, parseProject, resizeCabinet, snap, starter } from '../src/model';

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
    expect(()=>parseProject({...p,room:{...p.room,openings:p.room.openings.map(o=>({...o,offset:2900}))}})).toThrow();
  });
});

describe('guided kitchen creation',()=>{
  it('keeps the entered room dimensions and opening parameters for both layouts',()=>{
    const room={...starter().room,width:4200,depth:2800,height:2500,openings:starter().room.openings.map(o=>o.kind==='window'?{...o,offset:300,width:1000}:o)};
    for(const layout of ['straight','corner'] as const){
      const p=createKitchen(room,layout);
      expect(p.room).toEqual(room);expect(p.cabinets.length).toBeGreaterThan(0);expect(issues(p)).toEqual([]);
      expect(parseProject(p)).toEqual(p);
    }
  });
  it('creates an empty room when the user chooses to assemble from scratch',()=>{
    const room=starter().room,p=createKitchen(room,'empty');
    expect(p.cabinets).toEqual([]);expect(p.room).toEqual(room);
  });
  it('only inserts modules that fit, including in small rooms',()=>{
    for(const width of [1800,2400,3600,6000])for(const depth of [1800,3000,5500])for(const layout of ['straight','corner'] as const){
      const p=createKitchen({...starter().room,width,depth,openings:[]},layout);
      expect(issues(p),`${layout}: ${width} × ${depth}`).toEqual([]);
    }
  });
  it('leaves free space for the next user-added module in an ordinary room',()=>{
    const p=createKitchen(starter().room,'straight');
    expect(findPlacement('base',600,p,'A')).not.toBeNull();
  });
  it('moves by an exact step without snapping back to a nearby neighbour',()=>{
    const room=starter().room,c=cabinet('base',600,300,300);
    expect(nudgeCabinet(c,50,0,room).x).toBe(350);
    expect(nudgeCabinet(c,0,50,room).z).toBe(350);
    expect(nudgeCabinet(c,-50,-50,room)).toEqual(c);
  });
  it('clamps touch movement using the rotated footprint',()=>{
    const room=starter().room,c=cabinet('base',800,3200,2500,270);
    const moved=nudgeCabinet(c,2000,2000,room);
    expect(moved.x).toBe(3300);expect(moved.z).toBe(2600);
    expect(isInside(moved,room)).toBe(true);
  });
  it('keeps the near edge when resizing a unit instead of pushing it outside the room',()=>{
    const room=starter().room;
    const back=resizeCabinet(cabinet('base',600,300,300),800,room);
    const side=resizeCabinet(cabinet('base',600,3300,300,270),800,room);
    expect(bounds(back).minX).toBe(0);expect(bounds(side).minZ).toBe(0);
    expect(isInside(back,room)).toBe(true);expect(isInside(side,room)).toBe(true);
  });
});
