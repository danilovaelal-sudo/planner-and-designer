/** All geometry is measured along the finished inside face, in millimetres. */
export const WALLS = ['A', 'B', 'C', 'D'] as const;
export type Wall = typeof WALLS[number];
export interface Opening {
  id: string;
  kind: 'door' | 'window';
  wall: Wall;
  offset: number;
  width: number;
  height: number;
  sill: number;
  hinge: 'left' | 'right';
  swing: 'in' | 'out';
}
export interface Room {
  width: number;
  depth: number;
  height: number;
  walls: Record<Wall, { thickness: number }>;
  openings: Opening[];
  objects?: RoomObject[];
}
export type RoomObjectKind='box'|'column'|'radiator'|'water'|'drain'|'socket'|'gas';
export interface RoomObject {id:string;kind:RoomObjectKind;label:string;wall:Wall;offset:number;width:number;height:number;depth:number;backGap:number;bottom:number;}
export const ROOM_OBJECT_TYPES:{kind:RoomObjectKind;name:string;solid:boolean;color:string;symbol:string;width:number;height:number;depth:number;bottom:number;backGap:number}[]=[
  {kind:'box',name:'Короб / выступ',solid:true,color:'#a69a86',symbol:'КР',width:400,height:2700,depth:300,bottom:0,backGap:0},
  {kind:'column',name:'Колонна',solid:true,color:'#999f8b',symbol:'КЛ',width:300,height:2700,depth:300,bottom:0,backGap:0},
  {kind:'radiator',name:'Радиатор',solid:true,color:'#b99479',symbol:'Р',width:800,height:600,depth:140,bottom:150,backGap:40},
  {kind:'water',name:'Вода',solid:false,color:'#528b9c',symbol:'В',width:60,height:60,depth:35,bottom:470,backGap:0},
  {kind:'drain',name:'Слив',solid:false,color:'#7b8594',symbol:'С',width:110,height:110,depth:80,bottom:195,backGap:0},
  {kind:'socket',name:'Розетка',solid:false,color:'#ab8853',symbol:'Э',width:80,height:80,depth:30,bottom:1060,backGap:0},
  {kind:'gas',name:'Газ',solid:false,color:'#af8255',symbol:'Г',width:60,height:60,depth:50,bottom:570,backGap:0},
];
export const roomObjectType=(kind:RoomObjectKind)=>ROOM_OBJECT_TYPES.find(t=>t.kind===kind)!;
export type RoomSelection = { kind: 'wall'; wall: Wall } | { kind: 'opening'; id: string } | {kind:'object';id:string} | null;
export const wallLength = (room: Room, wall: Wall) => wall === 'A' || wall === 'C' ? room.width : room.depth;
/** Clockwise around the room. Local x follows the arrow, local y points inside. */
export function wallFrame(room: Room, wall: Wall) {
  const frames = {
    A: { x: 0, z: 0, ux: 1, uz: 0, nx: 0, nz: 1, angle: 0, origin: 'верхнего левого' },
    B: { x: room.width, z: 0, ux: 0, uz: 1, nx: -1, nz: 0, angle: 90, origin: 'верхнего правого' },
    C: { x: room.width, z: room.depth, ux: -1, uz: 0, nx: 0, nz: -1, angle: 180, origin: 'нижнего правого' },
    D: { x: 0, z: room.depth, ux: 0, uz: -1, nx: 1, nz: 0, angle: 270, origin: 'нижнего левого' },
  };
  return { ...frames[wall], length: wallLength(room, wall), thickness: room.walls[wall].thickness };
}
export function wallPoint(room: Room, wall: Wall, along: number, inside = 0) {
  const f = wallFrame(room, wall);
  return { x: f.x + f.ux * along + f.nx * inside, z: f.z + f.uz * along + f.nz * inside };
}
/** The same inside-face, wall-relative volume is used in every view and check. */
export function roomObjectBounds(room:Room,o:RoomObject){
  const solid=roomObjectType(o.kind).solid,a=wallPoint(room,o.wall,o.offset,o.backGap-(solid?0:o.depth/2)),b=wallPoint(room,o.wall,o.offset+o.width,o.backGap+(solid?o.depth:o.depth/2));
  return {minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z),bottom:o.bottom,top:o.bottom+o.height};
}
export function roomFloorArea(room:Room){
  const rects=(room.objects??[]).filter(o=>roomObjectType(o.kind).solid&&o.bottom===0).map(o=>roomObjectBounds(room,o));
  const xs=[...new Set([0,room.width,...rects.flatMap(r=>[r.minX,r.maxX])])].sort((a,b)=>a-b);let occupied=0;
  for(let i=1;i<xs.length;i++){const x=(xs[i]+xs[i-1])/2,spans=rects.filter(r=>r.minX<x&&r.maxX>x).map(r=>[r.minZ,r.maxZ]).sort((a,b)=>a[0]-b[0]);let end=-Infinity,total=0;
    for(const [from,to] of spans){total+=Math.max(0,to-Math.max(from,end));end=Math.max(end,to);}occupied+=(xs[i]-xs[i-1])*total;
  }return room.width*room.depth-occupied;
}
export function emptyRoom(width = 3600, depth = 3000, height = 2700): Room {
  return { width, depth, height, walls: { A: { thickness: 150 }, B: { thickness: 150 }, C: { thickness: 150 }, D: { thickness: 150 } }, openings: [] };
}
export function defaultRoom(): Room {
  return { ...emptyRoom(), openings: [
    { id: 'initial-window', kind: 'window', wall: 'B', offset: 1050, width: 1400, height: 1200, sill: 1150, hinge: 'left', swing: 'in' },
    { id: 'initial-door', kind: 'door', wall: 'C', offset: 150, width: 900, height: 2100, sill: 0, hinge: 'right', swing: 'in' },
  ] };
}
const between = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= min && n <= max;
export function validateRoom(room: Room): string[] {
  const errors: string[] = [];
  if (!between(room.width, 1800, 8000) || !between(room.depth, 1800, 8000)) errors.push('Внутренние размеры комнаты должны быть от 1 800 до 8 000 мм.');
  if (!between(room.height, 2200, 4500)) errors.push('Высота потолка должна быть от 2 200 до 4 500 мм.');
  for (const wall of WALLS) if (!between(room.walls?.[wall]?.thickness, 50, 600)) errors.push(`Толщина стены ${wall}: от 50 до 600 мм.`);
  if (!Array.isArray(room.openings) || room.openings.length > 32) return [...errors, 'В комнате может быть до 32 проёмов.'];
  const ids = new Set<string>();
  for (const o of room.openings) {
    const name = o.kind === 'door' ? 'Дверь' : 'Окно';
    if (typeof o.id !== 'string' || !o.id || o.id.length > 100 || ids.has(o.id) || !['door', 'window'].includes(o.kind) || !WALLS.includes(o.wall) || !['left', 'right'].includes(o.hinge) || !['in', 'out'].includes(o.swing)) { errors.push('Некорректные параметры проёма.'); continue; }
    ids.add(o.id);
    if (!between(o.width, o.kind === 'door' ? 400 : 200, 4000) || !between(o.height, o.kind === 'door' ? 1800 : 200, 4000) || !between(o.sill, 0, 4000) || !between(o.offset, 0, 8000)) errors.push(`${name}: проверьте размеры и отступ (точность — 1 мм).`);
    if (o.kind === 'door' && o.sill !== 0) errors.push('Дверь должна начинаться от пола.');
    if (o.offset + o.width > wallLength(room, o.wall)) errors.push(`${name} на стене ${o.wall} выходит за угол. Уменьшите размер или отступ.`);
    if (o.sill + o.height > room.height) errors.push(`${name} на стене ${o.wall} выше потолка.`);
  }
  for (let i = 0; i < room.openings.length; i++) for (let j = i + 1; j < room.openings.length; j++) {
    const a = room.openings[i], b = room.openings[j];
    if (a.wall === b.wall && a.offset < b.offset + b.width && a.offset + a.width > b.offset && a.sill < b.sill + b.height && a.sill + a.height > b.sill) errors.push(`Проёмы на стене ${a.wall} пересекаются.`);
  }
  if(room.objects!==undefined){
    if(!Array.isArray(room.objects)||room.objects.length>64)return [...errors,'В комнате может быть до 64 выступов и инженерных точек.'];
    for(const o of room.objects){
      if(!o||typeof o!=='object'||typeof o.id!=='string'||!o.id||o.id.length>100||ids.has(o.id)||!ROOM_OBJECT_TYPES.some(t=>t.kind===o.kind)||!WALLS.includes(o.wall)||typeof o.label!=='string'||!o.label.trim()||o.label.length>60){errors.push('Некорректный элемент комнаты.');continue;}ids.add(o.id);
      const t=roomObjectType(o.kind),limit=t.solid?4000:300;
      if(!between(o.offset,t.solid?0:-150,8000)||!between(o.width,10,limit)||!between(o.height,10,t.solid?4500:300)||!between(o.depth,10,limit)||!between(o.backGap,0,8000)||!between(o.bottom,t.solid?0:-150,4500)||!t.solid&&(o.width!==t.width||o.height!==t.height||o.depth!==t.depth)){errors.push(`«${o.label}»: размеры должны быть целыми миллиметрами в допустимом диапазоне.`);continue;}
      const r=roomObjectBounds(room,o);
      if(t.solid?(r.minX<0||r.maxX>room.width||r.minZ<0||r.maxZ>room.depth):(o.offset+o.width/2<0||o.offset+o.width/2>wallLength(room,o.wall)||o.backGap>(o.wall==='A'||o.wall==='C'?room.depth:room.width)))errors.push(`«${o.label}» выходит за границы комнаты. Проверьте стену, отступ и глубину.`);
      if(t.solid?r.top>room.height:o.bottom+o.height/2>room.height||o.bottom+o.height/2<0)errors.push(`«${o.label}»: высота должна быть в пределах комнаты.`);
      if(t.solid&&o.backGap===0&&room.openings.some(h=>h.wall===o.wall&&h.offset<o.offset+o.width&&h.offset+h.width>o.offset&&h.sill<r.top&&h.sill+h.height>r.bottom))errors.push(`«${o.label}» перекрывает проём на стене ${o.wall}.`);
    }
  }
  return [...new Set(errors)];
}
export function newRoomObject(room:Room,kind:RoomObjectKind,wall:Wall):RoomObject|null{
  if((room.objects?.length??0)>=64)return null;
  const t=roomObjectType(kind),o:RoomObject={id:crypto.randomUUID(),kind,label:t.name,wall,offset:100,width:t.width,height:kind==='box'||kind==='column'?room.height:t.height,depth:t.depth,bottom:t.bottom,backGap:t.backGap};
  const candidates=[100,0,...room.openings.filter(h=>h.wall===wall).map(h=>h.offset+h.width+100),...(room.objects??[]).filter(h=>h.wall===wall).map(h=>h.offset+h.width+100)];
  for(const offset of candidates){const next={...o,offset},r=roomObjectBounds(room,next);
    if(t.solid&&(room.objects??[]).filter(old=>roomObjectType(old.kind).solid).some(old=>{const b=roomObjectBounds(room,old);return r.minX<b.maxX&&r.maxX>b.minX&&r.minZ<b.maxZ&&r.maxZ>b.minZ&&r.bottom<b.top&&r.top>b.bottom;}))continue;
    if(!validateRoom({...room,objects:[...room.objects??[],next]}).length)return next;
  }return null;
}
/** Partition the wall around real rectangular holes, shared by 3D and tests. */
export function wallPanels(room: Room, wall: Wall) {
  const holes = room.openings.filter(o => o.wall === wall);
  const xs = [...new Set([0, wallLength(room, wall), ...holes.flatMap(o => [o.offset, o.offset + o.width])])].sort((a, b) => a - b);
  const ys = [...new Set([0, room.height, ...holes.flatMap(o => [o.sill, o.sill + o.height])])].sort((a, b) => a - b);
  const panels: { start: number; bottom: number; width: number; height: number }[] = [];
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++) {
    const x = (xs[i - 1] + xs[i]) / 2, y = (ys[j - 1] + ys[j]) / 2;
    if (!holes.some(o => x > o.offset && x < o.offset + o.width && y > o.sill && y < o.sill + o.height)) panels.push({ start: xs[i - 1], bottom: ys[j - 1], width: xs[i] - xs[i - 1], height: ys[j] - ys[j - 1] });
  }
  return panels;
}
export function openingSegments(room: Room, wall: Wall) {
  const points = [...new Set([0, wallLength(room, wall), ...room.openings.filter(o => o.wall === wall).flatMap(o => [o.offset, o.offset + o.width])])].sort((a, b) => a - b);
  return points.slice(1).map((end, i) => ({ start: points[i], end, length: end - points[i] }));
}
export function newOpening(room: Room, kind: Opening['kind'], wall: Wall): Opening | null {
  const width = kind === 'door' ? 800 : 1000, height = kind === 'door' ? 2100 : 1000;
  const offsets = [100, 0, ...room.openings.filter(o => o.wall === wall).map(o => o.offset + o.width + 100)];
  for (const offset of offsets) {
    const o: Opening = { id: crypto.randomUUID(), kind, wall, offset, width, height, sill: kind === 'door' ? 0 : 1000, hinge: 'left', swing: 'in' };
    if (!validateRoom({ ...room, openings: [...room.openings, o] }).length) return o;
  }
  return null;
}
