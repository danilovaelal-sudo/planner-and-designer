import { describe, expect, it } from 'vitest';
import { cabinet, cabinetIssues, cabinetWall, createKitchen, findPlacement, frontClearance, intersects, issues, parseProject, placeAtWall, placeBeside, resizeCabinet, snap, wallFootprint } from '../src/model';
import { WALLS, emptyRoom } from '../src/room';
import type { Opening, Wall } from '../src/room';
const door=(wall:Wall,hinge:Opening['hinge']='left',swing:Opening['swing']='in'):Opening=>({id:'door',kind:'door',wall,offset:1000,width:800,height:2100,sill:0,hinge,swing});
describe('wall and neighbour placement',()=>{
  it('round-trips measured edge offsets and back gaps on every wall',()=>{
    const room=emptyRoom(4159,3109);
    for(const wall of WALLS){const c=placeAtWall(cabinet('base',600,0,0),room,wall,731,23);expect(cabinetWall(c)).toBe(wall);expect(wallFootprint(c,room,wall)).toEqual({start:731,end:1331,back:23,front:623});}
  });
  it('aligns rear edges and keeps the exact requested gap before and after neighbours',()=>{
    const room=emptyRoom();
    for(const wall of WALLS){const other=placeAtWall(cabinet('base',800,0,0),room,wall,1000,37),c=cabinet('base',600,0,0);
      expect(wallFootprint(placeBeside(c,other,room,'before',17),room,wall)).toEqual({start:383,end:983,back:37,front:637});
      expect(wallFootprint(placeBeside(c,other,room,'after',17),room,wall)).toEqual({start:1817,end:2417,back:37,front:637});}
  });
  it('preserves the selected start edge while resizing on C and D as well as A and B',()=>{
    const room=emptyRoom();for(const wall of WALLS){const c=placeAtWall(cabinet('base',600,0,0),room,wall,731,23),resized=resizeCabinet(c,800,room);expect(wallFootprint(resized,room,wall)).toEqual({start:731,end:1531,back:23,front:623});}
  });
  it('packs exact non-grid gaps without wasting the end of a row',()=>{
    for(const wall of WALLS){const p=createKitchen(emptyRoom(1806,1806),'empty');for(let i=0;i<3;i++){const c=findPlacement('base',600,p,wall,3);expect(c).not.toBeNull();p.cabinets.push(c!);expect(wallFootprint(c!,p.room,wall).start).toBe(i*603);}expect(findPlacement('base',300,p,wall,3)).toBeNull();}
  });
  it('keeps a gap to a tall unit and allows different vertical tiers',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[placeAtWall(cabinet('fridge',600,0,0),p.room,'A',0)];
    expect(wallFootprint(findPlacement('base',600,p,'A',13)!,p.room,'A').start).toBe(613);
    p.cabinets=[placeAtWall(cabinet('base',600,0,0),p.room,'A',0)];expect(wallFootprint(findPlacement('wall',600,p,'A',13)!,p.room,'A').start).toBe(0);
  });
  it('allows exact movement without snapping and uses the chosen gap when snapping',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[cabinet('base',600,300,300)];
    const c=snap(cabinet('base',600,932.4,317.4),p,{enabled:false});expect(c.x).toBe(932);expect(c.z).toBe(317);
    const snapped=snap(cabinet('base',600,932,315),p,{grid:10,gap:17});expect(snapped.x).toBe(917);expect(snapped.z).toBe(300);
  });
  it('detects a sub-millimetre overlap while allowing touching edges',()=>{
    const a=cabinet('base',600,300,300);expect(intersects(a,cabinet('base',600,899.5,300))).toBe(true);expect(intersects(a,cabinet('base',600,900,300))).toBe(false);
  });
  it('snaps shelves of different depths by their rear edges, rather than their centres',()=>{
    const p=createKitchen(emptyRoom(),'empty');p.cabinets=[cabinet('wall',600,300,175)];
    const c=snap(cabinet('open',600,927,166),p,{grid:10});expect(c.x).toBe(900);expect(c.z).toBe(160);
    expect(wallFootprint(c,p.room,'A').back).toBe(0);
  });
});
describe('openings and entry door sweep',()=>{
  it('checks real inward sweep sectors on every wall and both hinge sides',()=>{
    for(const wall of WALLS)for(const hinge of ['left','right'] as const){
      const room={...emptyRoom(),openings:[door(wall,hinge)]},p=createKitchen(room,'empty'),c=placeAtWall(cabinet('base',600,0,0),room,wall,1100,300);
      expect(cabinetIssues(c,p).some(i=>i.code==='door-swing'),wall+' '+hinge).toBe(true);
      p.room.openings[0].swing='out';expect(cabinetIssues(c,p).some(i=>i.code==='door-swing')).toBe(false);
    }
  });
  it('does not mistake the empty corner of the sweep bounding square for a collision',()=>{
    const room={...emptyRoom(),openings:[door('A')]},p=createKitchen(room,'empty');
    const outside=placeAtWall(cabinet('base',600,0,0),room,'A',1700,700),inside=placeAtWall(cabinet('base',600,0,0),room,'A',1200,300);
    expect(cabinetIssues(outside,p)).toEqual([]);expect(cabinetIssues(inside,p).some(i=>i.code==='door-swing')).toBe(true);
  });
  it('distinguishes a blocked window from a low cabinet with enough sill clearance, including the worktop',()=>{
    const room={...emptyRoom(),openings:[{...door('A'),kind:'window' as const,offset:0,sill:900,height:1000}]},p=createKitchen(room,'empty'),c=placeAtWall(cabinet('sink',600,0,0),room,'A',100);
    expect(cabinetIssues(c,p).some(i=>i.code==='opening')).toBe(true);
    p.finishes.worktop='darkstone';expect(cabinetIssues(c,p)).toEqual([]);
    const upper=placeAtWall(cabinet('wall',600,0,0),room,'A',100);expect(cabinetIssues(upper,p).some(i=>i.code==='opening')).toBe(true);
  });
  it('warns about window access for furniture near the window without claiming a physical collision',()=>{
    const room={...emptyRoom(),openings:[{...door('A'),kind:'window' as const,offset:0,sill:900,height:1000}]},p=createKitchen(room,'empty');
    const c=placeAtWall(cabinet('fridge',600,0,0),room,'A',100,50),found=cabinetIssues(c,p);expect(found).toHaveLength(1);expect(found[0]).toMatchObject({code:'window-access',severity:'warning'});
  });
  it('skips door and tall/window conflicts during automatic placement on all walls',()=>{
    for(const wall of WALLS){const room={...emptyRoom(),openings:[{...door(wall),offset:0}]},p=createKitchen(room,'empty'),c=findPlacement('base',600,p,wall);expect(c).not.toBeNull();expect(wallFootprint(c!,room,wall).start).toBe(800);expect(cabinetIssues(c!,p)).toEqual([]);}
  });
  it('does not insert automatic corners or uppers through an existing opening',()=>{
    const room={...emptyRoom(),openings:[{...door('A'),offset:2700,width:900}]},p=createKitchen(room,'corner');
    expect(issues(p).filter(i=>i.severity==='error')).toEqual([]);
  });
  it('finds a free stretch after a door that opens from the adjacent wall',()=>{
    const room={...emptyRoom(),openings:[{...door('A'),offset:2800}]},p=createKitchen(room,'empty');
    const c=findPlacement('base',600,p,'B');expect(c).not.toBeNull();expect(wallFootprint(c!,room,'B').start).toBe(800);expect(cabinetIssues(c!,p)).toEqual([]);
  });
});
describe('facing rows and saved geometry',()=>{
  it('measures a narrow aisle and treats its selected target as a recommendation',()=>{
    const p=createKitchen(emptyRoom(3600,2000),'empty'),a=placeAtWall(cabinet('base',600,0,0),p.room,'A',100),b=placeAtWall(cabinet('base',600,0,0),p.room,'C',2900);p.cabinets=[a,b];
    expect(frontClearance(a,p).distance).toBe(800);expect(frontClearance(a,p).blocker?.id).toBe(b.id);
    expect(issues(p,900).filter(i=>i.code==='passage')).toHaveLength(1);expect(issues(p,900).every(i=>i.severity==='warning')).toBe(true);expect(issues(p,800)).toEqual([]);
  });
  it('does not report an ordinary perpendicular L corner as an opposing-row aisle',()=>{
    const p=createKitchen(emptyRoom(),'corner');expect(issues(p).filter(i=>i.code==='passage')).toEqual([]);
  });
  it('exports the actual exact spacing and reloads it without applying a new grid',()=>{
    const p=createKitchen(emptyRoom(),'empty'),a=placeAtWall(cabinet('base',600,0,0),p.room,'D',373,19),b=placeBeside(cabinet('base',800,0,0),a,p.room,'after',17);p.cabinets=[a,b];
    const loaded=parseProject(JSON.parse(JSON.stringify(p)));expect(loaded).toEqual(p);expect(wallFootprint(loaded.cabinets[1],loaded.room,'D').start-wallFootprint(loaded.cabinets[0],loaded.room,'D').end).toBe(17);
  });
});
