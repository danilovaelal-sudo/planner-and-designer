export type Category = 'base' | 'wall' | 'tall';
export type Kind = 'base' | 'drawers' | 'sink' | 'oven' | 'dishwasher' | 'corner' | 'wall' | 'glass' | 'open' | 'fridge' | 'pantry';
export type View = '3d' | 'plan' | 'elevation';
export type Wall = 'A' | 'B';
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
export interface Room { width: number; depth: number; height: number; window: boolean; windowWidth: number; windowOffset: number; door: boolean; }
export interface Finishes { lower: string; upper: string; worktop: string; handle: 'black' | 'brass' | 'none'; floor: 'oak' | 'stone'; wall: 'cream' | 'white' | 'sand'; }
export interface Project { version: 1; name: string; room: Room; cabinets: Cabinet[]; finishes: Finishes; }
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
  return { version: 1, name: 'Моя кухня', room: { width: 3600, depth: 3000, height: 2700, window: true, windowWidth: 1400, windowOffset: 1050, door: true }, cabinets, finishes: { lower: 'sage', upper: 'oak', worktop: 'limestone', handle: 'brass', floor: 'oak', wall: 'cream' } };
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
  return aa.minX < bb.maxX-1 && aa.maxX > bb.minX+1 && aa.minZ < bb.maxZ-1 && aa.maxZ > bb.minZ+1;
}
export function issues(project: Project) {
  const out: { id: string; message: string }[]=[];
  for (const c of project.cabinets) {
    if (!isInside(c,project.room)) out.push({id:c.id,message:`«${typeOf(c.kind).name}» выходит за границы комнаты`});
    if (typeOf(c.kind).height+typeOf(c.kind).elevation > project.room.height) out.push({id:c.id,message:`«${typeOf(c.kind).name}» выше потолка`});
  }
  for (let i=0;i<project.cabinets.length;i++) for (let j=i+1;j<project.cabinets.length;j++) if(intersects(project.cabinets[i],project.cabinets[j])) out.push({id:project.cabinets[i].id,message:`Пересекаются: ${typeOf(project.cabinets[i].kind).name.toLowerCase()} и ${typeOf(project.cabinets[j].kind).name.toLowerCase()}`});
  return out;
}
export function snap(c: Cabinet, project: Project): Cabinet {
  const b=bounds(c), halfX=(b.maxX-b.minX)/2, halfZ=(b.maxZ-b.minZ)/2;
  let x=Math.round(c.x/50)*50, z=Math.round(c.z/50)*50;
  const threshold=85;
  if(Math.abs(c.x-halfX)<threshold) x=halfX;
  if(Math.abs(c.x+halfX-project.room.width)<threshold) x=project.room.width-halfX;
  if(Math.abs(c.z-halfZ)<threshold) z=halfZ;
  if(Math.abs(c.z+halfZ-project.room.depth)<threshold) z=project.room.depth-halfZ;
  for(const other of project.cabinets) {
    if(other.id===c.id) continue;
    const t=typeOf(c.kind),ot=typeOf(other.kind);
    if((t.category==='wall') !== (ot.category==='wall')) continue;
    const ob=bounds(other);
    if (Math.abs(c.z-other.z)<threshold) {
      if(Math.abs((c.x-halfX)-ob.maxX)<threshold) {x=ob.maxX+halfX;z=other.z;}
      else if(Math.abs((c.x+halfX)-ob.minX)<threshold) {x=ob.minX-halfX;z=other.z;}
    }
    if(Math.abs(c.x-other.x)<threshold) {
      if(Math.abs((c.z-halfZ)-ob.maxZ)<threshold) {z=ob.maxZ+halfZ;x=other.x;}
      else if(Math.abs((c.z+halfZ)-ob.minZ)<threshold) {z=ob.minZ-halfZ;x=other.x;}
    }
  }
  return {...c,x:Math.max(halfX,Math.min(project.room.width-halfX,x)),z:Math.max(halfZ,Math.min(project.room.depth-halfZ,z))};
}
export function findPlacement(kind: Kind, width: number, project: Project, wall: Wall): Cabinet | null {
  const t=typeOf(kind), rotation=wall==='A'?0:270;
  for(let pos=width/2;pos+width/2<=(wall==='A'?project.room.width:project.room.depth);pos+=50) {
    const candidate=cabinet(kind,width,wall==='A'?pos:project.room.width-t.depth/2,wall==='A'?t.depth/2:pos,rotation);
    if(isInside(candidate,project.room) && !project.cabinets.some(c=>intersects(c,candidate))) return candidate;
  }
  return null;
}
export const STORAGE_KEY='kitchen-planner:project:v1';
export const VARIANTS_KEY='kitchen-planner:variants:v1';
export function parseProject(value: unknown): Project {
  if(!value || typeof value!=='object') throw new Error('Неверный формат проекта');
  const p=value as Project;
  const num=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  if(p.version!==1 || typeof p.name!=='string' || p.name.length>100 || !p.room || !p.finishes || !Array.isArray(p.cabinets)||p.cabinets.length>150) throw new Error('Неверный формат или версия проекта');
  const r=p.room;
  if(!num(r.width,1800,8000)||!num(r.depth,1800,8000)||!num(r.height,2200,4500)||typeof r.window!=='boolean'||typeof r.door!=='boolean'||!num(r.windowWidth,300,4000)||!num(r.windowOffset,0,8000)) throw new Error('Некорректные размеры помещения');
  if(r.window && r.windowOffset+r.windowWidth>r.depth) throw new Error('Окно выходит за пределы стены');
  const ids=new Set<string>();
  for(const c of p.cabinets) {
    const t=MODULES.find(t=>t.kind===c.kind);
    if(!t||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||!t.widths.includes(c.width)||!num(c.x,-8000,16000)||!num(c.z,-8000,16000)||![0,90,180,270].includes(c.rotation)||!['left','right'].includes(c.hinge)||(c.front!==undefined&&!FRONTS.some(m=>m.id===c.front))) throw new Error('Некорректный модуль в проекте');
    ids.add(c.id);
  }
  const f=p.finishes;
  if(!FRONTS.some(m=>m.id===f.lower)||!FRONTS.some(m=>m.id===f.upper)||!WORKTOPS.some(m=>m.id===f.worktop)||!['black','brass','none'].includes(f.handle)||!['oak','stone'].includes(f.floor)||!['cream','white','sand'].includes(f.wall)) throw new Error('Неизвестный материал');
  // Pick only supported fields: imported files cannot inject arbitrary app state.
  return {version:1,name:p.name,room:{width:r.width,depth:r.depth,height:r.height,window:r.window,windowWidth:r.windowWidth,windowOffset:r.windowOffset,door:r.door},finishes:{lower:f.lower,upper:f.upper,worktop:f.worktop,handle:f.handle,floor:f.floor,wall:f.wall},cabinets:p.cabinets.map(c=>({id:c.id,kind:c.kind,width:c.width,x:c.x,z:c.z,rotation:c.rotation,hinge:c.hinge,...(c.front?{front:c.front}:{})}))};
}
