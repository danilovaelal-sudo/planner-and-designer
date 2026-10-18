import { defaultRoom, emptyRoom, validateRoom, wallFrame, wallPoint } from './room';
import type { Opening, Room, Wall } from './room';
export type { Room, Wall } from './room';
export type Category = 'base' | 'wall' | 'tall';
export type Kind = 'base' | 'drawers' | 'sink' | 'oven' | 'dishwasher' | 'corner' | 'wall' | 'glass' | 'open' | 'fridge' | 'pantry';
export type View = '3d' | 'plan' | 'elevation';
export interface ModuleType {
  kind: Kind; name: string; description: string; category: Category;
  widths: number[]; depth: number; height: number; elevation: number;
}
export const MODULES: ModuleType[] = [
  { kind: 'base', name: 'Шкаф с полками', description: 'Распашной · 1–2 дверцы', category: 'base', widths: [300, 400, 450, 500, 600, 800, 900], depth: 600, height: 870, elevation: 0 },
  { kind: 'drawers', name: 'Шкаф с ящиками', description: 'Три выдвижных ящика', category: 'base', widths: [400, 450, 500, 600, 800, 900], depth: 600, height: 870, elevation: 0 },
  { kind: 'sink', name: 'Тумба под мойку', description: 'Мойка и смеситель', category: 'base', widths: [600, 800, 900], depth: 600, height: 870, elevation: 0 },
  { kind: 'oven', name: 'Шкаф под духовку', description: 'Духовка и варочная панель', category: 'base', widths: [600], depth: 600, height: 870, elevation: 0 },
  { kind: 'dishwasher', name: 'Посудомойка', description: 'Встроенная · с фасадом', category: 'base', widths: [450, 600], depth: 600, height: 870, elevation: 0 },
  { kind: 'corner', name: 'Угловой шкаф', description: 'Угловой модуль 900 × 900', category: 'base', widths: [900], depth: 900, height: 870, elevation: 0 },
  { kind: 'wall', name: 'Навесной шкаф', description: 'Полки за фасадом', category: 'wall', widths: [300, 400, 450, 500, 600, 800, 900], depth: 350, height: 720, elevation: 1450 },
  { kind: 'glass', name: 'Шкаф-витрина', description: 'Стекло в тонкой раме', category: 'wall', widths: [400, 500, 600, 800], depth: 350, height: 720, elevation: 1450 },
  { kind: 'open', name: 'Открытые полки', description: 'Два открытых отделения', category: 'wall', widths: [300, 400, 600, 800], depth: 320, height: 720, elevation: 1450 },
  { kind: 'fridge', name: 'Пенал с холодильником', description: 'Встроенный холодильник', category: 'tall', widths: [600], depth: 600, height: 2170, elevation: 0 },
  { kind: 'pantry', name: 'Пенал для хранения', description: 'Две секции с полками', category: 'tall', widths: [400, 500, 600], depth: 600, height: 2170, elevation: 0 },
];
export const typeOf = (kind: Kind) => MODULES.find(m => m.kind === kind)!;
export interface Cabinet { id: string; kind: Kind; width: number; x: number; z: number; rotation: number; front?: string; hinge: 'left' | 'right'; }
export interface Finishes { lower: string; upper: string; worktop: string; handle: 'black' | 'brass' | 'none'; floor: 'oak' | 'stone'; wall: 'cream' | 'white' | 'sand'; }
export interface Project { version: 2; name: string; room: Room; cabinets: Cabinet[]; finishes: Finishes; }
export interface Material { id: string; name: string; color: string; family: string; surface: string; wood?: boolean; stone?: boolean; note: string; }
export const FRONTS: Material[] = [
  { id: 'linen', name: 'Тёплый белый', color: '#e9e5d8', family: 'МДФ · эмаль', surface: 'Матовая', note: 'Универсальная палитра. Конкретный оттенок выбирается по образцу.' },
  { id: 'sage', name: 'Шалфей', color: '#8d9b82', family: 'МДФ · эмаль', surface: 'Матовая', note: 'Спокойный приглушённый зелёный. Визуальный образец.' },
  { id: 'cashmere', name: 'Кашемир', color: '#beb5a5', family: 'МДФ · плёнка', surface: 'Матовая', note: 'Нейтральный бежево-серый. Визуальный образец.' },
  { id: 'oak', name: 'Натуральный дуб', color: '#b78c5d', family: 'ЛДСП · древесный декор', surface: 'Текстурная', wood: true, note: 'Декор под дерево, не массив. Визуальный образец.' },
  { id: 'walnut', name: 'Тёплый орех', color: '#79513a', family: 'МДФ · шпон', surface: 'Текстурная', wood: true, note: 'Натуральный рисунок шпона зависит от партии.' },
  { id: 'graphite', name: 'Графит', color: '#474c49', family: 'МДФ · PET', surface: 'Матовая', note: 'Свойства покрытия зависят от выбранной серии производителя.' },
  { id: 'clay', name: 'Терракота', color: '#b17f68', family: 'МДФ · эмаль', surface: 'Матовая', note: 'Тёплый акцентный оттенок. Визуальный образец.' },
  { id: 'navy', name: 'Глубокий синий', color: '#405766', family: 'МДФ · эмаль', surface: 'Матовая', note: 'Холодный акцентный оттенок. Визуальный образец.' },
];
export const WORKTOPS: Material[] = [
  { id: 'limestone', name: 'Светлый известняк', color: '#ddd6c6', family: 'ДСП · пластик HPL', surface: 'Матовая · 38 мм', stone: true, note: 'Декор под камень на древесной основе. Визуальный образец.' },
  { id: 'marble', name: 'Белый мрамор', color: '#ebe9e2', family: 'Кварцевый агломерат', surface: 'Сатиновая · 20 мм', stone: true, note: 'Образ камня; рисунок и обработка уточняются у поставщика.' },
  { id: 'darkstone', name: 'Тёмный камень', color: '#41443f', family: 'Компакт-HPL', surface: 'Матовая · 12 мм', stone: true, note: 'Тонкая столешница. Визуальный образец.' },
  { id: 'woodoak', name: 'Медовый дуб', color: '#b89260', family: 'ДСП · пластик HPL', surface: 'Текстурная · 38 мм', wood: true, note: 'Древесный декор на основе ДСП. Визуальный образец.' },
];
export const PALETTES = [
  { name: 'Шалфей и дуб', lower: 'sage', upper: 'oak', worktop: 'limestone' },
  { name: 'Светлая классика', lower: 'linen', upper: 'linen', worktop: 'woodoak' },
  { name: 'Кашемир и камень', lower: 'cashmere', upper: 'cashmere', worktop: 'marble' },
  { name: 'Орех и графит', lower: 'walnut', upper: 'graphite', worktop: 'darkstone' },
];
export const uid = () => globalThis.crypto.randomUUID();
export function cabinet(kind: Kind, width: number, x: number, z: number, rotation = 0): Cabinet {
  return { id: uid(), kind, width, x, z, rotation, hinge: 'left' };
}
export function starter(layout: 'corner' | 'straight' = 'corner'): Project {
  const cabinets = [cabinet('fridge',600,300,300), cabinet('drawers',600,900,300), cabinet('oven',600,1500,300), cabinet('sink',layout==='corner'?900:800,layout==='corner'?2250:2200,300)];
  if (layout === 'corner') cabinets.push(cabinet('corner',900,3150,450), cabinet('drawers',600,3300,1200,270), cabinet('dishwasher',600,3300,1800,270));
  else cabinets.push(cabinet('base',600,2900,300));
  cabinets.push(cabinet('wall',600,900,175), cabinet('open',600,1500,160), cabinet('glass',800,2200,175));
  return { version: 2, name: 'Моя кухня', room: defaultRoom(), cabinets, finishes: { lower: 'sage', upper: 'oak', worktop: 'limestone', handle: 'brass', floor: 'oak', wall: 'cream' } };
}
export function bounds(c: Cabinet) {
  const d = typeOf(c.kind).depth;
  const sideways = c.rotation % 180 !== 0;
  const w = sideways ? d : c.width;
  const h = sideways ? c.width : d;
  return { minX: c.x-w/2, maxX: c.x+w/2, minZ: c.z-h/2, maxZ: c.z+h/2 };
}
export function isInside(c: Cabinet, room: Room) {
  const b = bounds(c); return b.minX >= 0 && b.minZ >= 0 && b.maxX <= room.width && b.maxZ <= room.depth;
}
export function intersects(a: Cabinet, b: Cabinet) {
  const ta=typeOf(a.kind), tb=typeOf(b.kind);
  if (ta.elevation >= tb.elevation+tb.height || tb.elevation >= ta.elevation+ta.height) return false;
  const aa=bounds(a), bb=bounds(b);
  return aa.minX < bb.maxX-.001 && aa.maxX > bb.minX+.001 && aa.minZ < bb.maxZ-.001 && aa.maxZ > bb.minZ+.001;
}
export interface PlacementIssue { id:string; message:string; severity:'error'|'warning'; code:'bounds'|'ceiling'|'overlap'|'opening'|'door-swing'|'window-access'|'passage'; otherId?:string; openingId?:string; }
export const cabinetWall=(c:Cabinet):Wall=>({0:'A',270:'B',180:'C',90:'D'} as Record<number,Wall>)[c.rotation];
export const wallRotation=(wall:Wall)=>({A:0,B:270,C:180,D:90})[wall];
export function wallFootprint(c:Cabinet,room:Room,wall:Wall){
  const f=wallFrame(room,wall),b=bounds(c);
  const points=[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]].map(([x,z])=>({u:(x-f.x)*f.ux+(z-f.z)*f.uz,v:(x-f.x)*f.nx+(z-f.z)*f.nz}));
  return {start:Math.min(...points.map(p=>p.u))+0,end:Math.max(...points.map(p=>p.u))+0,back:Math.min(...points.map(p=>p.v))+0,front:Math.max(...points.map(p=>p.v))+0};
}
export function placeAtWall(c:Cabinet,room:Room,wall:Wall,offset:number,backGap=0):Cabinet{
  const p=wallPoint(room,wall,offset+c.width/2,backGap+typeOf(c.kind).depth/2);
  return {...c,x:p.x,z:p.z,rotation:wallRotation(wall)};
}
export function placeBeside(c:Cabinet,other:Cabinet,room:Room,side:'before'|'after',gap=0):Cabinet{
  const wall=cabinetWall(other),r=wallFootprint(other,room,wall);
  return placeAtWall(c,room,wall,side==='after'?r.end+gap:r.start-gap-c.width,r.back);
}
export function worktopThickness(project:Project){return project.finishes.worktop==='darkstone'?12:project.finishes.worktop==='marble'?20:38;}
function vertical(c:Cabinet,project:Project){const t=typeOf(c.kind);return {bottom:t.elevation,top:t.elevation+t.height+(t.category==='base'?worktopThickness(project):0)};}
export function hitsDoorSwing(c:Cabinet,room:Room,o:Opening){
  if(o.kind!=='door'||o.swing!=='in')return false;
  const t=typeOf(c.kind);if(t.elevation>=o.height)return false;
  const r=wallFootprint(c,room,o.wall),pivot=o.hinge==='left'?o.offset:o.offset+o.width;
  const qmin=o.hinge==='left'?r.start-pivot:pivot-r.end,qmax=o.hinge==='left'?r.end-pivot:pivot-r.start;
  // Exact rectangle/quarter-disk intersection, including both hinge directions.
  return qmax>.001&&r.front>.001&&qmin<o.width&&r.back<o.width&&Math.max(0,qmin)**2+Math.max(0,r.back)**2<o.width**2-.001;
}
export function cabinetIssues(c:Cabinet,project:Project):PlacementIssue[]{
  const out:PlacementIssue[]=[],t=typeOf(c.kind),v=vertical(c,project);
  if(!isInside(c,project.room))out.push({id:c.id,severity:'error',code:'bounds',message:`«${t.name}» выходит за границы комнаты`});
  if(v.top>project.room.height)out.push({id:c.id,severity:'error',code:'ceiling',message:`«${t.name}» выше потолка`});
  for(const other of project.cabinets)if(other.id!==c.id&&intersects(c,other))out.push({id:c.id,otherId:other.id,severity:'error',code:'overlap',message:`Пересекаются: ${t.name.toLowerCase()} и ${typeOf(other.kind).name.toLowerCase()}`});
  for(const o of project.room.openings){
    const r=wallFootprint(c,project.room,o.wall),span=r.start<o.offset+o.width-.001&&r.end>o.offset+.001,levels=v.bottom<o.sill+o.height&&v.top>o.sill;
    if(span&&levels&&r.back<=.001&&r.front>0)out.push({id:c.id,openingId:o.id,severity:'error',code:'opening',message:`«${t.name}» перекрывает ${o.kind==='door'?'дверной':'оконный'} проём на стене ${o.wall}`});
    else if(hitsDoorSwing(c,project.room,o))out.push({id:c.id,openingId:o.id,severity:'error',code:'door-swing',message:`«${t.name}» мешает открыванию двери на стене ${o.wall}`});
    else if(o.kind==='window'&&span&&levels&&r.back>0&&r.back<=600)out.push({id:c.id,openingId:o.id,severity:'warning',code:'window-access',message:`Проверьте доступ к окну на стене ${o.wall}: «${t.name}» стоит перед ним`});
  }
  return out;
}
export function frontClearance(c:Cabinet,project:Project){
  const wall=cabinetWall(c),r=wallFootprint(c,project.room,wall),f=wallFrame(project.room,wall),roomDepth=wall==='A'||wall==='C'?project.room.depth:project.room.width;
  let distance=roomDepth-r.front,blocker:Cabinet|undefined;
  for(const other of project.cabinets){if(other.id===c.id||typeOf(other.kind).category==='wall')continue;const o=wallFootprint(other,project.room,wall);
    if(o.start<r.end-.001&&o.end>r.start+.001&&o.back>=r.front-.001&&o.back-r.front<distance){distance=o.back-r.front;blocker=other;}}
  return {distance:Math.max(0,Math.round(distance)),blocker,from:wallPoint(project.room,wall,(r.start+r.end)/2,r.front),to:wallPoint(project.room,wall,(r.start+r.end)/2,r.front+Math.max(0,distance)),wall:f};
}
export function issues(project:Project,minPassage=900):PlacementIssue[]{
  const out:PlacementIssue[]=[],pairs=new Set<string>();
  for(const c of project.cabinets){for(const issue of cabinetIssues(c,project)){if(issue.code==='overlap'){const key=[issue.id,issue.otherId].sort().join(':');if(pairs.has(key))continue;pairs.add(key);}out.push(issue);}
    if(typeOf(c.kind).category==='wall')continue;
    const clear=frontClearance(c,project);
    if(clear.blocker&&Math.abs(c.rotation-clear.blocker.rotation)===180&&clear.distance<minPassage){const key='passage:'+ [c.id,clear.blocker.id].sort().join(':');if(!pairs.has(key)){pairs.add(key);out.push({id:c.id,otherId:clear.blocker.id,severity:'warning',code:'passage',message:`Между встречными рядами ${clear.distance} мм — меньше выбранного ориентира ${minPassage} мм`});}}
  }
  return out;
}
export interface SnapOptions { enabled?:boolean; grid?:number; gap?:number; }
export function snap(c:Cabinet,project:Project,options:SnapOptions={}):Cabinet{
  const {enabled=true,grid=50,gap=0}=options;
  if(!enabled)return nudgeCabinet({...c,x:Math.round(c.x),z:Math.round(c.z)},0,0,project.room);
  const b=bounds(c),hx=(b.maxX-b.minX)/2,hz=(b.maxZ-b.minZ)/2,threshold=85;
  let x=Math.round(c.x/grid)*grid,z=Math.round(c.z/grid)*grid;
  if(Math.abs(b.minX)<threshold)x=hx;
  if(Math.abs(b.maxX-project.room.width)<threshold)x=project.room.width-hx;
  if(Math.abs(b.minZ)<threshold)z=hz;
  if(Math.abs(b.maxZ-project.room.depth)<threshold)z=project.room.depth-hz;
  let nearest:Cabinet|undefined,best=threshold;
  for(const other of project.cabinets){
    if(other.id===c.id||other.rotation!==c.rotation)continue;
    const t=typeOf(c.kind),o=typeOf(other.kind);
    if(t.elevation>=o.elevation+o.height||o.elevation>=t.elevation+t.height)continue;
    for(const side of ['before','after'] as const){
      const candidate=placeBeside(c,other,project.room,side,gap),distance=Math.hypot(candidate.x-c.x,candidate.z-c.z);
      if(distance<best&&!cabinetIssues(candidate,project).some(i=>i.severity==='error')){nearest=candidate;best=distance;}
    }
  }
  return nearest??nudgeCabinet({...c,x,z},0,0,project.room);
}
export function findPlacement(kind:Kind,width:number,project:Project,wall:Wall,gap=0):Cabinet|null{
  const template=cabinet(kind,width,0,0),length=wallFrame(project.room,wall).length;
  const f=wallFrame(project.room,wall);
  const doorEnds=project.room.openings.filter(o=>o.kind==='door'&&o.swing==='in').map(o=>{
    const corners=[wallPoint(project.room,o.wall,o.offset,0),wallPoint(project.room,o.wall,o.offset+o.width,0),wallPoint(project.room,o.wall,o.offset,o.width),wallPoint(project.room,o.wall,o.offset+o.width,o.width)];
    return Math.ceil(Math.max(...corners.map(p=>(p.x-f.x)*f.ux+(p.z-f.z)*f.uz)));
  });
  const offsets=[0,...project.cabinets.map(c=>wallFootprint(c,project.room,wall).end+gap),...project.room.openings.filter(o=>o.wall===wall).map(o=>o.offset+o.width),...doorEnds];
  for(const offset of [...new Set(offsets)].sort((a,b)=>a-b)){
    if(offset<0||offset+width>length)continue;
    const c=placeAtWall(template,project.room,wall,offset);
    if(!cabinetIssues(c,project).some(i=>i.severity==='error')&&project.cabinets.every(other=>{
      if(!gap||(typeOf(c.kind).category==='wall')!==(typeOf(other.kind).category==='wall'))return true;
      const r=wallFootprint(other,project.room,wall),t=wallFootprint(c,project.room,wall);
      if(r.back>=t.front||r.front<=t.back)return true;
      return t.start>=r.end+gap||t.end<=r.start-gap;
    }))return c;
  }
  return null;
}

export type KitchenLayout = 'straight' | 'corner' | 'empty';
export function nudgeCabinet(c: Cabinet, dx: number, dz: number, room: Room): Cabinet {
  const b=bounds(c),hx=(b.maxX-b.minX)/2,hz=(b.maxZ-b.minZ)/2;
  return {...c,x:Math.max(hx,Math.min(room.width-hx,c.x+dx)),z:Math.max(hz,Math.min(room.depth-hz,c.z+dz))};
}
export function resizeCabinet(c:Cabinet,width:number,room:Room):Cabinet{
  const wall=cabinetWall(c),r=wallFootprint(c,room,wall);
  return placeAtWall({...c,width},room,wall,r.start,r.back);
}
/** Start a layout in the user's room; never replace their measurements with a demo room. */
export function createKitchen(room: Room, layout: KitchenLayout): Project {
  const project: Project = {version:2,name:'Моя кухня',room:structuredClone(room),cabinets:[],finishes:{lower:'sage',upper:'oak',worktop:'limestone',handle:'brass',floor:'oak',wall:'cream'}};
  if(layout==='empty')return project;
  if(layout==='corner'){const corner=cabinet('corner',900,room.width-450,450);if(!cabinetIssues(corner,project).some(i=>i.severity==='error'))project.cabinets.push(corner);}
  for(const kind of ['fridge','sink','oven','drawers'] as const){
    const next=findPlacement(kind,600,project,'A') || (layout==='corner'?findPlacement(kind,600,project,'B'):null);
    if(next)project.cabinets.push(next);
  }
  // An open stretch is intentional: users can add and change modules themselves.
  for(const c of [...project.cabinets]){
    if(!['sink','drawers'].includes(c.kind))continue;
    const wall=c.rotation===0?'A':'B';
    const upper=cabinet('wall',c.width,wall==='A'?c.x:room.width-175,wall==='A'?175:c.z,c.rotation);
    if(!cabinetIssues(upper,project).some(i=>i.severity==='error'))project.cabinets.push(upper);
  }
  return project;
}
export const STORAGE_KEY='kitchen-planner:project:v1';
export const VARIANTS_KEY='kitchen-planner:variants:v1';
/** Accept v1 exports and stored variants, then persist only the v2 schema. */
export function parseProject(value: unknown): Project {
  if(!value || typeof value!=='object') throw new Error('Неверный формат проекта');
  const raw=value as Record<string, unknown>;
  if(raw.version!==1 && raw.version!==2) throw new Error('Неизвестная версия проекта');
  let migrated: unknown = value;
  if(raw.version===1){
    const r=raw.room as Record<string, unknown> | undefined;
    const num=(n:unknown,min:number,max:number): n is number => typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
    if(!r || !num(r.width,1800,8000)||!num(r.depth,1800,8000)||!num(r.height,2200,4500)||typeof r.window!=='boolean'||typeof r.door!=='boolean'||!num(r.windowWidth,300,4000)||!num(r.windowOffset,0,8000)) throw new Error('Некорректные размеры старого проекта');
    if(r.window && r.windowOffset+r.windowWidth>r.depth)throw new Error('Окно выходит за пределы стены');
    const room=emptyRoom(Math.round(r.width),Math.round(r.depth),Math.round(r.height));
    if(r.window)room.openings.push({id:'migrated-window',kind:'window',wall:'B',offset:Math.round(r.windowOffset),width:Math.round(r.windowWidth),height:Math.min(1200,room.height-1150),sill:1150,hinge:'left',swing:'in'});
    if(r.door)room.openings.push({id:'migrated-door',kind:'door',wall:'C',offset:150,width:900,height:2100,sill:0,hinge:'right',swing:'in'});
    migrated={...raw,version:2,room};
  }
  const p=migrated as Project;
  const num=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  if(typeof p.name!=='string' || p.name.length>100 || !p.room || !p.finishes || !Array.isArray(p.cabinets)||p.cabinets.length>150) throw new Error('Неверный формат проекта');
  if(!p.room.walls || !Array.isArray(p.room.openings) || p.room.openings.some(o=>!o||typeof o!=='object'))throw new Error('Неверный формат помещения');
  const errors=validateRoom(p.room);if(errors.length)throw new Error(errors[0]);
  const r=p.room;
  const ids=new Set<string>();
  for(const c of p.cabinets) {
    if(!c || typeof c!=='object')throw new Error('Некорректный модуль в проекте');
    const t=MODULES.find(t=>t.kind===c.kind);
    if(!t||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||!t.widths.includes(c.width)||!num(c.x,-8000,16000)||!num(c.z,-8000,16000)||![0,90,180,270].includes(c.rotation)||!['left','right'].includes(c.hinge)||(c.front!==undefined&&!FRONTS.some(m=>m.id===c.front))) throw new Error('Некорректный модуль в проекте');
    ids.add(c.id);
  }
  const f=p.finishes;
  if(!FRONTS.some(m=>m.id===f.lower)||!FRONTS.some(m=>m.id===f.upper)||!WORKTOPS.some(m=>m.id===f.worktop)||!['black','brass','none'].includes(f.handle)||!['oak','stone'].includes(f.floor)||!['cream','white','sand'].includes(f.wall)) throw new Error('Неизвестный материал');
  return {version:2,name:p.name,room:{width:r.width,depth:r.depth,height:r.height,walls:{A:{thickness:r.walls.A.thickness},B:{thickness:r.walls.B.thickness},C:{thickness:r.walls.C.thickness},D:{thickness:r.walls.D.thickness}},openings:r.openings.map(o=>({id:o.id,kind:o.kind,wall:o.wall,offset:o.offset,width:o.width,height:o.height,sill:o.sill,hinge:o.hinge,swing:o.swing}))},finishes:{lower:f.lower,upper:f.upper,worktop:f.worktop,handle:f.handle,floor:f.floor,wall:f.wall},cabinets:p.cabinets.map(c=>({id:c.id,kind:c.kind,width:c.width,x:c.x,z:c.z,rotation:c.rotation,hinge:c.hinge,...(c.front?{front:c.front}:{})}))};
}
