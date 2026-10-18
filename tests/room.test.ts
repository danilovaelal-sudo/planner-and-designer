import { describe, expect, it } from 'vitest';
import { cabinet, createKitchen, findPlacement, parseProject, starter } from '../src/model';
import { WALLS, defaultRoom, emptyRoom, newOpening, openingSegments, validateRoom, wallFrame, wallPanels, wallPoint } from '../src/room';
import type { Opening, Wall } from '../src/room';

const hole=(wall:Wall,changes:Partial<Opening>={}):Opening=>({id:'hole',kind:'window',wall,offset:371,width:1003,height:987,sill:911,hinge:'left',swing:'in',...changes});
describe('measured room',()=>{
  it('uses clockwise wall origins on the finished inside faces',()=>{
    const room=emptyRoom(4000,3000);
    expect(WALLS.map(w=>wallPoint(room,w,300,100))).toEqual([{x:300,z:100},{x:3900,z:300},{x:3700,z:2900},{x:100,z:2700}]);
    for(const w of WALLS){const end=wallPoint(room,w,wallFrame(room,w).length);expect(end).toEqual(wallPoint(room,WALLS[(WALLS.indexOf(w)+1)%4],0));}
  });
  it('partitions all four walls into solid panels with the exact opening area removed',()=>{
    for(const wall of WALLS){
      const room={...emptyRoom(),openings:[hole(wall),hole(wall,{id:'second',offset:1800,width:700,sill:0,height:2100,kind:'door'})]};
      expect(validateRoom(room)).toEqual([]);
      const area=wallPanels(room,wall).reduce((sum,p)=>sum+p.width*p.height,0);
      expect(area).toBe(wallFrame(room,wall).length*room.height-room.openings.reduce((sum,o)=>sum+o.width*o.height,0));
      for(const panel of wallPanels(room,wall))for(const o of room.openings){
        expect(panel.start<o.offset+o.width&&panel.start+panel.width>o.offset&&panel.bottom<o.sill+o.height&&panel.bottom+panel.height>o.sill).toBe(false);
      }
    }
  });
  it('keeps dimension chains exact, including overlapping horizontal spans at different heights',()=>{
    const room={...emptyRoom(),openings:[hole('A'),hole('A',{id:'upper',offset:500,width:600,sill:2200,height:300})]};
    expect(validateRoom(room)).toEqual([]);
    expect(openingSegments(room,'A').reduce((sum,s)=>sum+s.length,0)).toBe(room.width);
  });
  it('rejects overlap, out-of-wall and above-ceiling openings without silently moving them',()=>{
    const room={...emptyRoom(),openings:[hole('B')]};
    expect(validateRoom({...room,openings:[hole('B',{offset:2500})]}).join()).toContain('за угол');
    expect(validateRoom({...room,openings:[hole('B',{sill:2200})]}).join()).toContain('потолка');
    expect(validateRoom({...room,openings:[...room.openings,hole('B',{id:'other',offset:400})]}).join()).toContain('пересекаются');
    expect(validateRoom({...room,depth:1800})).toEqual([]);
    expect(validateRoom({...room,depth:1800,openings:[hole('B',{offset:1100})]})).not.toEqual([]);
  });
  it('rejects nonfinite or sub-millimetre values, invalid walls and duplicate identifiers',()=>{
    for(const changes of [{offset:NaN},{width:1000.5},{sill:-1},{wall:'Z'}])expect(validateRoom({...emptyRoom(),openings:[hole('A',changes as Partial<Opening>)]})).not.toEqual([]);
    expect(validateRoom({...emptyRoom(),openings:[hole('A'),hole('B')]})).not.toEqual([]);
    expect(validateRoom({...emptyRoom(),walls:{...emptyRoom().walls,A:{thickness:0}}})).not.toEqual([]);
  });
  it('creates only valid new openings and reports a fully occupied wall',()=>{
    for(const wall of WALLS)for(const kind of ['door','window'] as const){const room=defaultRoom(),o=newOpening(room,kind,wall);expect(o).not.toBeNull();expect(validateRoom({...room,openings:[...room.openings,o!]})).toEqual([]);}
    const room={...emptyRoom(1800),openings:[hole('A',{offset:0,width:1800,height:2700,sill:0})]};
    expect(newOpening(room,'door','A')).toBeNull();
  });
  it('places furniture against C and D using the same wall coordinates as openings',()=>{
    const p=createKitchen(emptyRoom(),'empty');
    expect(findPlacement('base',600,p,'C')).toMatchObject({x:3300,z:2700,rotation:180});
    expect(findPlacement('base',600,p,'D')).toMatchObject({x:300,z:2700,rotation:90});
  });
});
describe('v1 to v2 migration',()=>{
  const legacy=()=>({...starter(),version:1,room:{width:3600,depth:3000,height:2700,window:true,windowWidth:1400,windowOffset:1050,door:true}});
  it('preserves old door/window positions, furniture and finishes across export and reload',()=>{
    const old=legacy(),p=parseProject(old);
    expect(p.version).toBe(2);expect(p.cabinets).toEqual(old.cabinets);expect(p.finishes).toEqual(old.finishes);
    expect(p.room.openings).toEqual([{id:'migrated-window',kind:'window',wall:'B',offset:1050,width:1400,height:1200,sill:1150,hinge:'left',swing:'in'},{id:'migrated-door',kind:'door',wall:'C',offset:150,width:900,height:2100,sill:0,hinge:'right',swing:'in'}]);
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('preserves disabled legacy openings and rejects a malformed legacy window',()=>{
    const old=legacy();expect(parseProject({...old,room:{...old.room,window:false,door:false}}).room.openings).toEqual([]);
    expect(()=>parseProject({...old,room:{...old.room,windowOffset:2900}})).toThrow();
  });
  it('round trips multiple exact openings and wall thicknesses, stripping unknown fields',()=>{
    const p=createKitchen({...emptyRoom(),openings:WALLS.map((w,i)=>hole(w,{id:String(i)}))},'empty');
    p.room.walls.D.thickness=237;p.cabinets=[cabinet('base',600,300,300)];
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const loaded=parseProject({...p,room:{...p.room,walls:{...p.room.walls,A:{thickness:150,secret:true}},openings:p.room.openings.map(o=>({...o,secret:true}))}});
    expect(loaded.room.walls.A).not.toHaveProperty('secret');expect(loaded.room.openings[0]).not.toHaveProperty('secret');
  });
  it('rejects malformed v2 opening arrays instead of losing the project silently',()=>{
    const p=starter();for(const openings of [null,[null],[{...hole('A'),kind:'unknown'}],Array.from({length:33},(_,i)=>hole('A',{id:String(i)}))])expect(()=>parseProject({...p,room:{...p.room,openings}})).toThrow();
  });
});
