import { bounds, cabinet, cabinetIssues, cabinetWall, isFiller, placeAtWall, typeOf, wallFootprint } from './model';
import type { Cabinet, ConstructionSettings, Project } from './model';
import { wallFrame, wallPoint } from './room';
import type { Wall } from './room';

export type Point={x:number;z:number};
export type Rect={minX:number;maxX:number;minZ:number;maxZ:number};
export interface Surface { outline:Point[]; holes:Point[][]; area:number; }
export const constructionSettings=(p:Project):ConstructionSettings=>p.construction??{frontOverhang:20,bridgeGap:50};
export function localPoint(c:Cabinet,x:number,z:number):Point{
  const cos=Math.round(Math.cos(c.rotation*Math.PI/180)),sin=Math.round(Math.sin(c.rotation*Math.PI/180));
  return {x:c.x+x*cos+z*sin,z:c.z-x*sin+z*cos};
}
export function localRect(c:Cabinet,width:number,depth:number,x=0,z=0):Rect{
  const points=[localPoint(c,x-width/2,z-depth/2),localPoint(c,x+width/2,z+depth/2)];
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
}
/** Two 900×600 supports form the L of a 900×900 corner cabinet. */
export function worktopSupports(p:Project):Cabinet[]{
  return p.cabinets.filter(c=>typeOf(c.kind).category==='base').flatMap(c=>{
    if(c.kind!=='corner')return [c];
    const a=localPoint(c,0,-150),b=localPoint(c,150,0);
    return [{...c,kind:'base' as const,width:900,x:a.x,z:a.z},{...c,kind:'base' as const,width:900,x:b.x,z:b.z,rotation:(c.rotation+270)%360}];
  });
}
export const signedArea=(loop:Point[])=>loop.reduce((sum,p,i)=>{const next=loop[(i+1)%loop.length];return sum+p.x*next.z-next.x*p.z;},0)/2;
function inside(point:Point,loop:Point[]){
  let result=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){
    const a=loop[i],b=loop[j];if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)result=!result;
  }return result;
}
/** Exact orthogonal union/difference, using boundary edges rather than overlapping slabs. */
export function unionSurfaces(rectangles:Rect[],cutouts:Rect[]=[]):Surface[]{
  const valid=rectangles.filter(r=>r.maxX>r.minX&&r.maxZ>r.minZ);if(!valid.length)return [];
  const holes=cutouts.filter(r=>r.maxX>r.minX&&r.maxZ>r.minZ);
  const xs=[...new Set([...valid,...holes].flatMap(r=>[r.minX,r.maxX]))].sort((a,b)=>a-b),zs=[...new Set([...valid,...holes].flatMap(r=>[r.minZ,r.maxZ]))].sort((a,b)=>a-b);
  const nx=xs.length-1,nz=zs.length-1,cells=new Uint8Array(nx*nz);
  const contains=(r:Rect,x:number,z:number)=>x>r.minX&&x<r.maxX&&z>r.minZ&&z<r.maxZ;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;if(valid.some(r=>contains(r,x,z))&&!holes.some(r=>contains(r,x,z)))cells[j*nx+i]=1;}
  type Edge={from:string;to:string;dir:number;used:boolean};
  const edges:Edge[]=[],outgoing=new Map<string,Edge[]>();
  const add=(i:number,j:number,k:number,l:number,dir:number)=>{const edge={from:`${i}:${j}`,to:`${k}:${l}`,dir,used:false};edges.push(edge);outgoing.set(edge.from,[...(outgoing.get(edge.from)??[]),edge]);};
  const occupied=(i:number,j:number)=>i>=0&&j>=0&&i<nx&&j<nz&&cells[j*nx+i]===1;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)if(occupied(i,j)){
    if(!occupied(i,j-1))add(i,j,i+1,j,0);if(!occupied(i+1,j))add(i+1,j,i+1,j+1,1);
    if(!occupied(i,j+1))add(i+1,j+1,i,j+1,2);if(!occupied(i-1,j))add(i,j+1,i,j,3);
  }
  const point=(key:string)=>{const [i,j]=key.split(':').map(Number);return {x:xs[i],z:zs[j]};};
  const loops:Point[][]=[];
  for(const first of edges){if(first.used)continue;const points:Point[]=[];let edge:Edge|undefined=first;
    while(edge&&!edge.used){edge.used=true;points.push(point(edge.from));if(edge.to===first.from)break;const previous:number=edge.dir;
      edge=outgoing.get(edge.to)?.filter(e=>!e.used).sort((a,b):number=>[1,0,3,2].indexOf((a.dir-previous+4)%4)-[1,0,3,2].indexOf((b.dir-previous+4)%4))[0];
    }
    const simple=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x)!==0;});
    if(simple.length>=4)loops.push(simple);
  }
  const surfaces=loops.filter(loop=>signedArea(loop)>0).map(outline=>({outline,holes:[] as Point[][],area:signedArea(outline)}));
  for(const hole of loops.filter(loop=>signedArea(loop)<0)){const parents=surfaces.filter(s=>inside(hole[0],s.outline)).sort((a,b)=>a.area-b.area);if(parents[0]){parents[0].holes.push(hole);parents[0].area+=signedArea(hole);}}
  return surfaces;
}
export function worktopLayout(p:Project){
  const settings=constructionSettings(p),supports=worktopSupports(p),rectangles:Rect[]=[],bridges:Rect[]=[];
  const rectangle=(c:Cabinet)=>{const t=typeOf(c.kind);return localRect(c,c.width,t.depth+settings.frontOverhang,0,settings.frontOverhang/2);};
  rectangles.push(...supports.map(rectangle));
  for(let i=0;i<supports.length;i++)for(let j=i+1;j<supports.length;j++){
    const a=supports[i],b=supports[j];if(a.rotation!==b.rotation)continue;
    const wall=cabinetWall(a),ar=wallFootprint(a,p.room,wall),br=wallFootprint(b,p.room,wall);
    if(Math.abs(ar.back-br.back)>.001)continue;
    const left=ar.start<br.start?ar:br,right=ar.start<br.start?br:ar,gap=right.start-left.end;
    if(gap>.001&&gap<=settings.bridgeGap){const a=wallPoint(p.room,wall,left.end,left.back),b=wallPoint(p.room,wall,right.start,Math.min(left.front,right.front)+settings.frontOverhang);
      const r={minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};bridges.push(r);rectangles.push(r);
    }
  }
  const clip=(r:Rect)=>({minX:Math.max(0,r.minX),maxX:Math.min(p.room.width,r.maxX),minZ:Math.max(0,r.minZ),maxZ:Math.min(p.room.depth,r.maxZ)});
  const cutouts=p.cabinets.filter(c=>c.kind==='sink'||c.kind==='oven').map(c=>({cabinetId:c.id,kind:c.kind,rect:c.kind==='sink'?localRect(c,Math.min(c.width-160,460),320):localRect(c,480,460)}));
  const exclusions=[...cutouts.map(c=>c.rect),...p.cabinets.filter(c=>typeOf(c.kind).category==='tall').map(c=>localRect(c,c.width,typeOf(c.kind).depth+settings.frontOverhang,0,settings.frontOverhang/2))];
  const surfaces=unionSurfaces(rectangles.map(clip),exclusions);
  return {surfaces,cutouts,bridges,area:surfaces.reduce((sum,s)=>sum+s.area,0),settings};
}
export function surfacePath(s:Surface){return [s.outline,...s.holes].map(loop=>`M${loop.map(p=>`${p.x},${p.z}`).join('L')}Z`).join('');}
export interface FillerSuggestion { key:string; wall:Wall; width:number; cabinet:Cabinet; anchorId:string; side:'before'|'after'; }
export function fillerSuggestions(p:Project,anchorId?:string):FillerSuggestion[]{
  const out:FillerSuggestion[]=[],keys=new Set<string>();
  for(const c of p.cabinets){if(isFiller(c.kind)||(anchorId&&anchorId!==c.id))continue;const wall=cabinetWall(c),r=wallFootprint(c,p.room,wall),t=typeOf(c.kind);
    let before=0,after=wallFrame(p.room,wall).length;
    for(const other of p.cabinets){if(c.id===other.id)continue;const ot=typeOf(other.kind);if(t.elevation>=ot.elevation+ot.height||ot.elevation>=t.elevation+t.height)continue;
      const b=wallFootprint(other,p.room,wall);if(b.back>=r.front||b.front<=r.back)continue;
      if(b.end<=r.start)before=Math.max(before,b.end);if(b.start>=r.end)after=Math.min(after,b.start);
    }
    for(const side of ['before','after'] as const){const start=side==='before'?before:r.end,end=side==='before'?r.start:after,width=Math.round(end-start);
      if(width<10||width>300||Math.abs(width-(end-start))>.001)continue;
      const kind=t.category==='base'?'filler':t.category==='wall'?'wall-filler':'tall-filler';
      const candidate={...placeAtWall(cabinet(kind,width,0,0),p.room,wall,start,r.back),...(c.front?{front:c.front}:{})};
      const key=`${wall}:${start}:${end}:${r.back}:${t.category}`;
      if(keys.has(key)||cabinetIssues(candidate,p).some(i=>i.severity==='error'))continue;
      keys.add(key);out.push({key,wall,width,cabinet:candidate,anchorId:c.id,side});
    }
  }
  return out;
}
