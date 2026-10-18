import { describe, expect, it } from 'vitest';
import { cabinet, createKitchen, parseProject, placeAtWall, starter, wallFootprint } from '../src/model';
import { WALLS, emptyRoom } from '../src/room';
import { constructionSettings, fillerSuggestions, localRect, signedArea, unionSurfaces, worktopLayout } from '../src/construction';

const rect=(minX:number,maxX:number,minZ:number,maxZ:number)=>({minX,maxX,minZ,maxZ});
describe('continuous orthogonal surfaces',()=>{
  it('unites touching and overlapping rectangles without duplicate area or internal edges',()=>{
    const s=unionSurfaces([rect(0,600,0,600),rect(600,1200,0,600),rect(300,900,0,600)]);
    expect(s).toHaveLength(1);expect(s[0].outline).toHaveLength(4);expect(s[0].area).toBe(720000);
  });
  it('keeps disconnected and diagonally touching surfaces separate',()=>{
    expect(unionSurfaces([rect(0,600,0,600),rect(617,1217,0,600)])).toHaveLength(2);
    const diagonal=unionSurfaces([rect(0,600,0,600),rect(600,1200,600,1200)]);expect(diagonal).toHaveLength(2);expect(diagonal.reduce((a,s)=>a+s.area,0)).toBe(720000);
  });
  it('makes real interior holes and turns edge cutouts into notches',()=>{
    const withHole=unionSurfaces([rect(0,1200,0,600)],[rect(300,700,100,400)]);
    expect(withHole[0].holes).toHaveLength(1);expect(withHole[0].area).toBe(600000);expect(signedArea(withHole[0].holes[0])).toBeLessThan(0);
    const notch=unionSurfaces([rect(0,1200,0,600)],[rect(300,700,0,300)]);expect(notch[0].holes).toEqual([]);expect(notch[0].outline).toHaveLength(8);expect(notch[0].area).toBe(600000);
  });
  it('handles multiple holes, a cutout outside the surface and a completely removed surface',()=>{
    const base=[rect(0,1800,0,600)],holes=[rect(100,500,100,400),rect(900,1400,100,400)];
    const s=unionSurfaces(base,[...holes,rect(3000,4000,0,600)]);expect(s[0].holes).toHaveLength(2);expect(s[0].area).toBe(810000);
    expect(unionSurfaces(base,[rect(-100,2000,-100,700)])).toEqual([]);
  });
});
describe('kitchen worktop layout',()=>{
  it('builds one L-shaped top for a corner on each rotation, preserving the inside notch',()=>{
    for(const rotation of [0,90,180,270]){const p=createKitchen(emptyRoom(),'empty');p.construction={frontOverhang:0,bridgeGap:0};p.cabinets=[cabinet('corner',900,1800,1500,rotation)];
      const top=worktopLayout(p);expect(top.surfaces).toHaveLength(1);expect(top.surfaces[0].outline).toHaveLength(6);expect(top.area).toBe(720000);}
  });
  it('connects the full starter corner with two holes rather than overlapping module slabs',()=>{
    const p=starter();p.construction={frontOverhang:0,bridgeGap:0};const top=worktopLayout(p);
    expect(top.surfaces).toHaveLength(1);expect(top.surfaces[0].holes).toHaveLength(2);expect(top.area).toBe(2332000);
  });
  it('bridges only the selected small gaps and fills them without changing any cabinet coordinates',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[cabinet('base',600,300,300),cabinet('base',600,917,300)];const saved=structuredClone(p);
    expect(worktopLayout(p).surfaces).toHaveLength(1);expect(worktopLayout(p).area).toBe(1217*620);expect(p).toEqual(saved);
    p.construction={frontOverhang:20,bridgeGap:0};expect(worktopLayout(p).surfaces).toHaveLength(2);expect(worktopLayout(p).area).toBe(1200*620);
    p.cabinets[1].x=1101;expect(worktopLayout({...p,construction:{frontOverhang:20,bridgeGap:100}}).surfaces).toHaveLength(2);
  });
  it('keeps independently facing rows separate and respects room limits',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.construction={frontOverhang:60,bridgeGap:50};p.cabinets=[placeAtWall(cabinet('base',600,0,0),p.room,'A',0),placeAtWall(cabinet('base',600,0,0),p.room,'C',0)];
    const top=worktopLayout(p);expect(top.surfaces).toHaveLength(2);for(const s of top.surfaces)for(const point of s.outline){expect(point.x).toBeGreaterThanOrEqual(0);expect(point.x).toBeLessThanOrEqual(p.room.width);expect(point.z).toBeGreaterThanOrEqual(0);expect(point.z).toBeLessThanOrEqual(p.room.depth);}
  });
  it('rotates sink cutouts with the furniture on all four walls',()=>{
    for(const wall of WALLS){const p=createKitchen(emptyRoom(),'empty');p.cabinets=[placeAtWall(cabinet('sink',600,0,0),p.room,wall,700)];const top=worktopLayout(p);
      expect(top.surfaces[0].holes).toHaveLength(1);expect(top.area).toBe(600*620-440*320);expect(top.cutouts[0].rect).toEqual(localRect(p.cabinets[0],440,320));}
  });
  it('subtracts tall cabinet volumes and returns no top for a kitchen without base units',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[cabinet('base',900,450,300),cabinet('pantry',600,450,300)];
    expect(worktopLayout(p).surfaces).toHaveLength(2);p.cabinets=p.cabinets.slice(1);expect(worktopLayout(p).surfaces).toEqual([]);
  });
});
describe('exact filler panels and saved construction',()=>{
  it('suggests one exact 17mm filler for the same gap from either neighbouring unit on every wall',()=>{
    for(const wall of WALLS){const p=createKitchen(emptyRoom(),'empty');p.cabinets=[placeAtWall(cabinet('base',600,0,0),p.room,wall,0,19),placeAtWall(cabinet('base',600,0,0),p.room,wall,617,19)];
      const suggestions=fillerSuggestions(p);expect(suggestions).toHaveLength(1);const filler=suggestions[0].cabinet;
      expect(filler.width).toBe(17);expect(wallFootprint(filler,p.room,wall)).toMatchObject({start:600,end:617,back:19});
      p.cabinets.push(filler);expect(fillerSuggestions(p)).toEqual([]);p.construction={frontOverhang:0,bridgeGap:0};expect(worktopLayout(p).surfaces).toHaveLength(1);
    }
  });
  it('closes a narrow gap to the side wall, matching the selected facade',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[{...cabinet('base',600,317,300),front:'navy'}];
    const f=fillerSuggestions(p,p.cabinets[0].id)[0].cabinet;expect(f.width).toBe(17);expect(f.front).toBe('navy');expect(f.x).toBe(8.5);
  });
  it('uses the correct upper or tall tier and does not suggest unsupported widths',()=>{
    for(const [kind,fillerKind] of [['wall','wall-filler'],['pantry','tall-filler']] as const){const p=createKitchen(emptyRoom(),'empty');p.cabinets=[placeAtWall(cabinet(kind,600,0,0),p.room,'A',17)];expect(fillerSuggestions(p)[0].cabinet.kind).toBe(fillerKind);}
    const p=createKitchen(emptyRoom(),'empty');for(const offset of [9,301]){p.cabinets=[placeAtWall(cabinet('base',600,0,0),p.room,'A',offset)];expect(fillerSuggestions(p)).toEqual([]);}
  });
  it('does not fill a door opening even when the gap is narrow',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.room.openings=[{id:'door',kind:'door',wall:'A',offset:0,width:400,height:2100,sill:0,hinge:'left',swing:'out'}];
    p.cabinets=[placeAtWall(cabinet('base',600,0,0),p.room,'A',200)];expect(fillerSuggestions(p)).toEqual([]);
  });
  it('round trips exact filler widths and optional settings while preserving older v2 files',()=>{
    const p=createKitchen(emptyRoom(),'empty');expect(parseProject(p)).toEqual(p);expect(constructionSettings(p)).toEqual({frontOverhang:20,bridgeGap:50});
    p.construction={frontOverhang:27,bridgeGap:17};p.cabinets=[cabinet('filler',17,8.5,300),cabinet('wall-filler',23,11.5,175)];
    expect(parseProject(JSON.parse(JSON.stringify(p)))).toEqual(p);expect(()=>parseProject({...p,cabinets:[cabinet('base',17,0,0)]})).toThrow();
    expect(()=>parseProject({...p,cabinets:[cabinet('filler',9,0,0)]})).toThrow();
  });
  it('rejects invalid settings and strips unrecognised fields',()=>{
    const p=starter();for(const settings of [null,{frontOverhang:NaN,bridgeGap:50},{frontOverhang:61,bridgeGap:50},{frontOverhang:20,bridgeGap:101},{frontOverhang:20.5,bridgeGap:50}])expect(()=>parseProject({...p,construction:settings})).toThrow();
    expect(parseProject({...p,construction:{frontOverhang:20,bridgeGap:50,unsupported:true}}).construction).toEqual({frontOverhang:20,bridgeGap:50});
  });
});
