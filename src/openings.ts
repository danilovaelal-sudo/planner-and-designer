import { bounds, isFiller, typeOf, worktopThickness } from './model';
import type { Cabinet, Project } from './model';
import { localRect } from './construction';
import { wallPoint } from './room';

export interface Vec3 {x:number;y:number;z:number;}
export interface FrontPiece {center:Vec3;size:Vec3;yaw:number;style:'front'|'glass'|'oven'|'tray';}
export interface FrontAssembly {id:string;label:string;mode:'swing'|'drawer'|'fold';pivot:Vec3;sign:number;travel:number;pieces:FrontPiece[];}
export interface OpeningPreview {target:string;progress:number;}
export type OpeningPreviews=Record<string,OpeningPreview>;
export interface MotionIssue {id:string;partId:string;otherId?:string;openingId?:string;kind:'wall'|'cabinet'|'entry-door'|'front';severity:'warning';message:string;}
const vec=(x=0,y=0,z=0):Vec3=>({x,y,z});
const plus=(a:Vec3,b:Vec3):Vec3=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
const minus=(a:Vec3,b:Vec3):Vec3=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
const dot=(a:Vec3,b:Vec3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Vec3,b:Vec3):Vec3=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
function rotateY(v:Vec3,a:number):Vec3{const c=Math.cos(a),s=Math.sin(a);return vec(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);}
function rotateX(v:Vec3,a:number):Vec3{const c=Math.cos(a),s=Math.sin(a);return vec(v.x,v.y*c-v.z*s,v.y*s+v.z*c);}
export function frontAssemblies(c:Cabinet):FrontAssembly[]{
  if(isFiller(c.kind)||c.kind==='open')return [];
  const t=typeOf(c.kind),bottom=t.category==='wall'?0:100,depth=t.depth,top=t.height;
  const piece=(x:number,y:number,z:number,w:number,h:number,d=22,yaw=0,style:FrontPiece['style']='front'):FrontPiece=>({center:vec(x,y,z),size:vec(w,h,d),yaw,style});
  const swing=(id:string,label:string,left:number,b:number,width:number,height:number,hinge:'left'|'right',style:FrontPiece['style']='front'):FrontAssembly=>{
    const direction=hinge==='left'?1:-1;
    return {id,label,mode:'swing',pivot:vec(hinge==='left'?left:left+width,b,depth/2+22),sign:-direction,travel:90,pieces:[piece(direction*width/2,height/2,-11,width,height,22,0,style)]};
  };
  const drawer=(id:string,label:string,b:number,height:number):FrontAssembly=>{
    const trayDepth=depth-100;
    return {id,label,mode:'drawer',pivot:vec(0,b,depth/2+22),sign:1,travel:trayDepth,pieces:[piece(0,height/2,-11,c.width-8,height),piece(0,height/2-8,-22-trayDepth/2,c.width-60,Math.max(40,height-45),trayDepth,0,'tray')]};
  };
  if(c.kind==='drawers'){const h=(top-bottom)/3;return [0,1,2].map(i=>drawer(`drawer-${i+1}`,`Ящик ${i+1} · ${i===0?'нижний':i===1?'средний':'верхний'}`,bottom+h*i+3,h-6));}
  if(c.kind==='dishwasher')return [{id:'appliance-door',label:'Дверца посудомойки',mode:'fold',pivot:vec(0,bottom+3,depth/2+22),sign:1,travel:90,pieces:[piece(0,(top-bottom-6)/2,-11,c.width-8,top-bottom-6)]}];
  if(c.kind==='oven')return [{id:'oven-door',label:'Дверца духовки',mode:'fold',pivot:vec(0,285,depth/2+22),sign:1,travel:90,pieces:[piece(0,255,-17.5,c.width-40,510,35,0,'oven')]},drawer('oven-drawer','Ящик под духовкой',105,165)];
  if(c.kind==='fridge'||c.kind==='pantry'){
    const split=c.kind==='fridge'?720:1100;
    return [swing('lower-door','Нижняя дверца',-c.width/2+4,bottom+4,c.width-8,split-bottom-8,c.hinge),swing('upper-door','Верхняя дверца',-c.width/2+4,split+4,c.width-8,top-split-8,c.hinge)];
  }
  if(c.kind==='corner'){
    const pivot=vec(-447,103,172),pieces=[piece(147,382,-11,294,764),piece(286,382,128,294,764,22,270)];
    if(c.hinge==='right')return [{id:'corner-pair',label:'Связанная угловая пара',mode:'swing',pivot:vec(-pivot.z,pivot.y,-pivot.x),sign:1,travel:90,pieces:pieces.map(p=>({...p,center:vec(-p.center.z,p.center.y,-p.center.x),yaw:p.yaw===0?270:0}))}];
    return [{id:'corner-pair',label:'Связанная угловая пара',mode:'swing',pivot,sign:-1,travel:90,pieces}];
  }
  const count=c.kind==='glass'?1:c.width>650?2:1,w=c.width/count;
  return Array.from({length:count},(_,i)=>swing(`door-${i+1}`,count===1?'Дверца':i===0?'Левая дверца':'Правая дверца',-c.width/2+w*i+3,bottom+3,w-6,top-bottom-6,count===1?c.hinge:i===0?'left':'right',c.kind==='glass'?'glass':'front'));
}
export function previewProgress(state:OpeningPreview|undefined,part:FrontAssembly){return state&&(state.target==='all'||state.target===part.id)?Math.max(0,Math.min(100,state.progress)):0;}
export function pieceLocalPoint(part:FrontAssembly,piece:FrontPiece,p:Vec3,progress:number):Vec3{
  let point=plus(rotateY(p,piece.yaw*Math.PI/180),piece.center);
  const amount=part.travel*Math.max(0,Math.min(100,progress))/100;
  if(part.mode==='drawer')point.z+=amount;
  else if(part.mode==='swing')point=rotateY(point,part.sign*amount*Math.PI/180);
  else point=rotateX(point,amount*Math.PI/180);
  return plus(point,part.pivot);
}
export function worldPoint(c:Cabinet,p:Vec3):Vec3{return plus(rotateY(p,c.rotation*Math.PI/180),vec(c.x,typeOf(c.kind).elevation,c.z));}
function localPoint(c:Cabinet,p:Vec3):Vec3{return rotateY(minus(p,vec(c.x,typeOf(c.kind).elevation,c.z)),-c.rotation*Math.PI/180);}
export function pieceVertices(c:Cabinet,part:FrontAssembly,piece:FrontPiece,progress:number):Vec3[]{
  return [-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>worldPoint(c,pieceLocalPoint(part,piece,vec(x*piece.size.x/2,y*piece.size.y/2,z*piece.size.z/2),progress)))));
}
export interface BoxPose {center:Vec3;axes:Vec3[];half:number[];vertices:Vec3[];}
export function pieceBox(c:Cabinet,part:FrontAssembly,piece:FrontPiece,progress:number):BoxPose{
  const center=worldPoint(c,pieceLocalPoint(part,piece,vec(),progress));
  const axes=[vec(1,0,0),vec(0,1,0),vec(0,0,1)].map(axis=>minus(worldPoint(c,pieceLocalPoint(part,piece,axis,progress)),center));
  return {center,axes,half:[piece.size.x/2,piece.size.y/2,piece.size.z/2],vertices:pieceVertices(c,part,piece,progress)};
}
/** Full 15-axis OBB test, so a tilted appliance door is checked in three dimensions. */
export function boxesIntersect(a:BoxPose,b:BoxPose,padding=0){
  const delta=minus(b.center,a.center),axes=[...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>cross(x,y)))];
  for(const axis of axes){const length=Math.hypot(axis.x,axis.y,axis.z);if(length<1e-8)continue;const unit=vec(axis.x/length,axis.y/length,axis.z/length);
    const ra=a.axes.reduce((s,x,i)=>s+Math.abs(dot(x,unit))*a.half[i],0),rb=b.axes.reduce((s,x,i)=>s+Math.abs(dot(x,unit))*b.half[i],0);
    if(Math.abs(dot(delta,unit))>=ra+rb+padding-.01)return false;
  }return true;
}
interface Obstacle {id:string;label:string;kind:'cabinet'|'entry-door';min:Vec3;max:Vec3;}
function obstacleBox(o:Obstacle):BoxPose{
  const center=vec((o.min.x+o.max.x)/2,(o.min.y+o.max.y)/2,(o.min.z+o.max.z)/2),half=[(o.max.x-o.min.x)/2,(o.max.y-o.min.y)/2,(o.max.z-o.min.z)/2];
  return {center,half,axes:[vec(1,0,0),vec(0,1,0),vec(0,0,1)],vertices:[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>vec(center.x+x*half[0],center.y+y*half[1],center.z+z*half[2]))))};
}
function obstacles(p:Project,owner:string):Obstacle[]{
  const result:Obstacle[]=[];
  for(const c of p.cabinets){if(c.id===owner)continue;const t=typeOf(c.kind),bottom=t.elevation+(t.category==='wall'?0:100);
    const rectangles=isFiller(c.kind)?[localRect(c,c.width,18,0,t.depth/2-9)]:c.kind==='corner'?[localRect(c,900,622,0,-139),localRect(c,622,900,139,0)]:[localRect(c,c.width,t.depth+(c.kind==='open'?0:22),0,c.kind==='open'?0:11)];
    for(const r of rectangles)result.push({id:c.id,label:typeOf(c.kind).name,kind:'cabinet',min:vec(r.minX,bottom,r.minZ),max:vec(r.maxX,t.elevation+t.height,r.maxZ)});
    if(t.category==='base'){const r=c.kind==='corner'?bounds(c):localRect(c,c.width,t.depth+(p.construction?.frontOverhang??20),0,(p.construction?.frontOverhang??20)/2);
      // The corner top is split in two to leave its inside notch clear.
      const tops=c.kind==='corner'?[localRect(c,900,600+(p.construction?.frontOverhang??20),0,-150+(p.construction?.frontOverhang??20)/2),localRect(c,600+(p.construction?.frontOverhang??20),900,150-(p.construction?.frontOverhang??20)/2,0)]:[r];
      for(const top of tops)result.push({id:c.id,label:'Столешница',kind:'cabinet',min:vec(top.minX,870,top.minZ),max:vec(top.maxX,870+worktopThickness(p),top.maxZ)});
    }
  }
  for(const door of p.room.openings.filter(o=>o.kind==='door'&&o.swing==='in')){
    const pivot=door.hinge==='left'?door.offset:door.offset+door.width,a=wallPoint(p.room,door.wall,pivot-17.5,0),b=wallPoint(p.room,door.wall,pivot+17.5,door.width-60);
    result.push({id:door.id,label:`Открытая входная дверь на стене ${door.wall}`,kind:'entry-door',min:vec(Math.min(a.x,b.x),0,Math.min(a.z,b.z)),max:vec(Math.max(a.x,b.x),door.height,Math.max(a.z,b.z))});
  }
  return result;
}
type Point2={x:number;y:number};
function hull(points:Point2[]):Point2[]{
  const ps=[...new Map(points.map(p=>[`${p.x.toFixed(6)}:${p.y.toFixed(6)}`,p])).values()].sort((a,b)=>a.x-b.x||a.y-b.y);
  const turn=(a:Point2,b:Point2,c:Point2)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const chain=(list:Point2[])=>{const out:Point2[]=[];for(const p of list){while(out.length>1&&turn(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}return out;};
  if(ps.length<3)return ps;return [...chain(ps).slice(0,-1),...chain([...ps].reverse()).slice(0,-1)];
}
function polygonIntersectsRect(poly:Point2[],min:Point2,max:Point2,padding:number){
  const rect=[min,{x:max.x,y:min.y},max,{x:min.x,y:max.y}],axes=[{x:1,y:0},{x:0,y:1},...poly.map((p,i)=>({x:-(poly[(i+1)%poly.length].y-p.y),y:poly[(i+1)%poly.length].x-p.x}))];
  for(const axis of axes){const length=Math.hypot(axis.x,axis.y);if(length<1e-8)continue;const a=poly.map(p=>(p.x*axis.x+p.y*axis.y)/length),b=rect.map(p=>(p.x*axis.x+p.y*axis.y)/length);if(Math.max(...a)+padding<=Math.min(...b)+.01||Math.max(...b)+padding<=Math.min(...a)+.01)return false;}return true;
}
function sweepSegments(c:Cabinet,part:FrontAssembly,piece:FrontPiece){
  const steps=part.mode==='drawer'?1:30,segments:{poly:Point2[];lo:number;hi:number;padding:number;points:Vec3[]}[]=[];
  for(let i=0;i<steps;i++){
    const points=[...pieceVertices(c,part,piece,i*100/steps),...pieceVertices(c,part,piece,(i+1)*100/steps)];
    const local=points.map(p=>localPoint(c,p)),fold=part.mode==='fold',plane=local.map(p=>({x:fold?p.y:p.x,y:p.z})),spans=local.map(p=>fold?p.x:p.y);
    const radii=local.map(p=>Math.hypot((fold?p.y:p.x)-(fold?part.pivot.y:part.pivot.x),p.z-part.pivot.z));
    // Inflating each short chord by its maximum arc sagitta contains the full sweep.
    const padding=part.mode==='drawer'?0:Math.max(...radii)*(1-Math.cos(Math.PI/steps/4));
    segments.push({poly:hull(plane),lo:Math.min(...spans),hi:Math.max(...spans),padding,points});
  }return segments;
}
function sweepIssue(c:Cabinet,part:FrontAssembly,obstacle:Obstacle):MotionIssue{return {id:c.id,partId:part.id,kind:obstacle.kind,otherId:obstacle.kind==='cabinet'?obstacle.id:undefined,openingId:obstacle.kind==='entry-door'?obstacle.id:undefined,severity:'warning',message:`${part.label}: при открывании пересекает ${obstacle.kind==='entry-door'?obstacle.label.toLowerCase():`габарит «${obstacle.label}»`}`};}
export function auditCabinetOpening(c:Cabinet,p:Project):MotionIssue[]{
  const result:MotionIssue[]=[],obs=obstacles(p,c.id).map(o=>({o,points:obstacleBox(o).vertices.map(p=>localPoint(c,p))}));
  for(const part of frontAssemblies(c)){
    const seen=new Set<string>();
    for(const piece of part.pieces){const segments=sweepSegments(c,part,piece),fold=part.mode==='fold';
      if(segments.some(s=>{const angle=c.rotation*Math.PI/180,px=fold?Math.abs(Math.sin(angle))*s.padding:s.padding,pz=fold?Math.abs(Math.cos(angle))*s.padding:s.padding,py=fold?s.padding:0;return s.points.some(v=>v.x-px<-.01||v.x+px>p.room.width+.01||v.z-pz<-.01||v.z+pz>p.room.depth+.01||v.y-py<-.01||v.y+py>p.room.height+.01);})&&!seen.has('wall')){seen.add('wall');result.push({id:c.id,partId:part.id,kind:'wall',severity:'warning',message:`${part.label}: при открывании выходит за границы комнаты`});}
      for(const {o,points} of obs){if(seen.has(o.id))continue;const spans=points.map(v=>fold?v.x:v.y),lo=Math.min(...spans),hi=Math.max(...spans),a=points.map(v=>({x:fold?v.y:v.x,y:v.z})),min={x:Math.min(...a.map(v=>v.x)),y:Math.min(...a.map(v=>v.y))},max={x:Math.max(...a.map(v=>v.x)),y:Math.max(...a.map(v=>v.y))};
        if(segments.some(s=>s.lo<hi-.01&&s.hi>lo+.01&&polygonIntersectsRect(s.poly,min,max,s.padding))){seen.add(o.id);result.push(sweepIssue(c,part,o));}
      }
    }
  }return result;
}
export function auditOpenings(p:Project):MotionIssue[]{return p.cabinets.flatMap(c=>auditCabinetOpening(c,p));}
export function previewConflicts(p:Project,states:OpeningPreviews):MotionIssue[]{
  const out:MotionIssue[]=[],moving:{c:Cabinet;part:FrontAssembly;box:BoxPose}[]=[];
  for(const c of p.cabinets){const state=states[c.id];if(!state||state.progress<=0)continue;const obs=obstacles(p,c.id).map(o=>({o,box:obstacleBox(o)}));
    for(const part of frontAssemblies(c)){const progress=previewProgress(state,part);if(!progress)continue;const seen=new Set<string>();
      for(const piece of part.pieces){const box=pieceBox(c,part,piece,progress);moving.push({c,part,box});
        if(box.vertices.some(v=>v.x<-.01||v.x>p.room.width+.01||v.z<-.01||v.z>p.room.depth+.01||v.y<-.01||v.y>p.room.height+.01)&&!seen.has('wall')){seen.add('wall');out.push({id:c.id,partId:part.id,kind:'wall',severity:'warning',message:`${part.label}: открытый фасад выходит за границы комнаты`});}
        for(const {o,box:other} of obs)if(!seen.has(o.id)&&boxesIntersect(box,other)){seen.add(o.id);out.push(sweepIssue(c,part,o));}
      }
    }
  }
  const pairs=new Set<string>();
  for(let i=0;i<moving.length;i++)for(let j=i+1;j<moving.length;j++){const a=moving[i],b=moving[j];if(a.c.id===b.c.id&&a.part.id===b.part.id)continue;const key=[`${a.c.id}:${a.part.id}`,`${b.c.id}:${b.part.id}`].sort().join('|');if(pairs.has(key))continue;
    if(boxesIntersect(a.box,b.box)){pairs.add(key);out.push({id:a.c.id,partId:a.part.id,otherId:b.c.id,kind:'front',severity:'warning',message:`Открытые фасады пересекаются: ${a.part.label.toLowerCase()} и ${b.part.label.toLowerCase()}`});}
  }
  return out;
}
export function frontPlanPolygon(c:Cabinet,part:FrontAssembly,piece:FrontPiece,progress:number,sweep=false){
  const points=sweep?Array.from({length:31},(_,i)=>pieceVertices(c,part,piece,i*100/30)).flat():pieceVertices(c,part,piece,progress);
  return hull(points.map(p=>({x:p.x,y:p.z})));
}
