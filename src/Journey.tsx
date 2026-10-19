import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Ruler, X } from 'lucide-react';
import { emptyRoom } from './room';
import type { KitchenLayout, Room } from './model';

export const STEPS = [
  {id:'room',label:'Комната',title:'Задайте размеры комнаты',hint:'Задайте стены и проёмы, отметьте выступы и точки подключения.'},
  {id:'modules',label:'Сборка',title:'Соберите свою кухню',hint:'Добавляйте шкафы. Нажмите на любой, чтобы изменить.'},
  {id:'materials',label:'Отделка',title:'Подберите цвета и материалы',hint:'Выберите поверхность и попробуйте разные сочетания.'},
  {id:'variants',label:'Результат',title:'Сохраните понравившийся вариант',hint:'Посмотрите кухню в 3D и сохраните проект или снимок.'},
] as const;
export type JourneyStep = typeof STEPS[number]['id'];
export const GUIDE_KEY='kitchen-planner:guide:v2';
export function guideSeen(){try{return localStorage.getItem(GUIDE_KEY)==='seen';}catch{return false;}}
export function markGuideSeen(){try{localStorage.setItem(GUIDE_KEY,'seen');}catch{/* The guide also works without browser storage. */}}

export function StepNavigation({current,onChange}:{current:JourneyStep;onChange:(step:JourneyStep)=>void}){
  const index=STEPS.findIndex(s=>s.id===current);
  return <nav className="journey-steps" aria-label="Этапы создания кухни">{STEPS.map((step,i)=><button key={step.id} className={`${current===step.id?'current':''} ${i<index?'visited':''}`} aria-current={current===step.id?'step':undefined} onClick={()=>onChange(step.id)}><span className="step-number">{i<index?<Check size={14}/>:i+1}</span><span>{step.label}</span>{i<3&&<span className="step-connector"/>}</button>)}</nav>;
}

export function SheetHandle({expanded,onExpand,onClose}:{expanded:boolean;onExpand:()=>void;onClose:()=>void}){
  const start=useRef<number|null>(null);
  return <button className="sheet-handle" aria-label={expanded?'Свернуть панель':'Развернуть панель'} onClick={onExpand} onPointerDown={e=>{start.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const distance=e.clientY-(start.current??e.clientY);start.current=null;if(distance>65){e.preventDefault();onClose();}}}><span/><small>{expanded?'Свернуть':'Развернуть'}<ChevronDown size={13}/></small></button>;
}

export default function ProjectSetup({room,hasProject,onContinue,onExample,onCreate,onClose}:{room:Room;hasProject:boolean;onContinue:()=>void;onExample:()=>void;onCreate:(room:Room,layout:KitchenLayout)=>void;onClose:()=>void}){
  const [page,setPage]=useState<'welcome'|'room'|'layout'>('welcome');
  const [width,setWidth]=useState(String(room.width/10)),[depth,setDepth]=useState(String(room.depth/10)),[height,setHeight]=useState(String(room.height/10));
  const [layout,setLayout]=useState<KitchenLayout>('straight');
  const [filled,setFilled]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{document.querySelector('.setup-backdrop')?.scrollTo(0,0);document.querySelector('.project-setup')?.scrollTo(0,0);},[page]);
  const parse=(v:string)=>Number(v.replace(',','.'));
  function next(){
    if(![width,depth,height].every(v=>v.trim()&&Number.isFinite(parse(v)))){setError('Заполните все три размера.');return;}
    if(parse(width)<180||parse(width)>800||parse(depth)<180||parse(depth)>800||parse(height)<220||parse(height)>450){setError('Стены: от 180 до 800 см. Потолок: от 220 до 450 см.');return;}
    setError('');setPage('layout');
  }
  function create(){
    const d=Math.round(parse(depth)*10);
    onCreate(emptyRoom(Math.round(parse(width)*10),d,Math.round(parse(height)*10)),filled?layout:'empty');
  }
  return <div className="setup-backdrop"><section className={`project-setup setup-${page}`} role="dialog" aria-modal="true" aria-labelledby="setup-title">
    <header className="setup-top"><span className="setup-brand"><span>к</span>кухня.</span><button className="setup-close" aria-label="Закрыть начало проекта" onClick={onClose}><X size={22}/></button></header>
    {page==='welcome'?<>
      <div className="welcome-art" aria-hidden="true"><div className="art-wall"/><div className="art-unit tall"/><div className="art-unit upper one"/><div className="art-unit upper two"/><div className="art-unit lower one"/><div className="art-unit lower two"/><div className="art-unit lower three"/><div className="art-counter"/><div className="art-plant"/><span className="art-pill"><Check size={14}/>Всё по вашим размерам</span></div>
      <div className="setup-copy"><span className="setup-kicker">ОТ РАЗМЕРОВ ДО ВАШЕЙ КУХНИ</span><h1 id="setup-title">Представьте.<br/>Соберите.<br/><em>Посмотрите в 3D.</em></h1><p>Пройдём четыре простых шага. Дизайнерские навыки не понадобятся.</p><div className="welcome-steps">{STEPS.map((s,i)=><span key={s.id}><i>{i+1}</i>{s.label}</span>)}</div><button className="journey-primary" onClick={()=>setPage('room')}>Создать свою кухню <ArrowRight size={19}/></button>{hasProject?<button className="journey-secondary" onClick={onContinue}>Продолжить сохранённый проект</button>:<button className="journey-secondary" onClick={onExample}>Сначала посмотреть пример</button>}<small className="setup-storage-note">Проект сохраняется в этом браузере.</small></div>
    </>:<>
      <div className="setup-form-heading"><button className="setup-back" onClick={()=>setPage(page==='room'?'welcome':'room')}><ArrowLeft size={18}/>Назад</button><span>НАЧАЛО ПРОЕКТА · {page==='room'?'1':'2'} / 2</span></div>
      <div className="setup-form-body">{page==='room'?<>
        <h1 id="setup-title">Какая у вас комната?</h1><p>Введите размеры в сантиметрах. Окна и дверь можно настроить на следующем экране.</p>
        <div className="setup-room-preview"><svg viewBox="0 0 300 150" fill="none" aria-hidden="true"><path d="M65 122V35H249V122H225M65 122H184" stroke="#8e9d7c" strokeWidth="7"/><path d="M75 18H239M269 45V110" stroke="#adb49f"/><text x="155" y="12" textAnchor="middle">Стена A</text><text x="287" y="80" transform="rotate(90 287 80)" textAnchor="middle">Стена B</text><text x="156" y="88" textAnchor="middle" className="setup-area">{Number.isFinite(parse(width)*parse(depth))?((parse(width)*parse(depth))/10000).toFixed(1):'—'} м²</text></svg></div>
        <div className="setup-dimensions">{[{label:'Стена A · ширина',value:width,set:setWidth},{label:'Стена B · глубина',value:depth,set:setDepth},{label:'Высота потолка',value:height,set:setHeight}].map(f=><label key={f.label}><span>{f.label}</span><div><input type="text" inputMode="decimal" aria-label={f.label} value={f.value} onChange={e=>f.set(e.target.value)}/><span>см</span></div></label>)}</div>
        {error&&<p className="setup-error" role="alert">{error}</p>}
      </>:<>
        <h1 id="setup-title">Как расположить кухню?</h1><p>Выберите начальную схему. Любой шкаф потом можно убрать, добавить или переместить.</p>
        <div className="setup-layouts">{([{id:'straight',name:'Вдоль одной стены',detail:'Прямая кухня',shape:'straight'},{id:'corner',name:'Вдоль двух стен',detail:'Угловая кухня',shape:'corner'}] as const).map(l=><button key={l.id} className={layout===l.id?'active':''} aria-pressed={layout===l.id} onClick={()=>setLayout(l.id)}><span className={`layout-sketch ${l.shape}`}><i/><i/><i/><i/></span><strong>{l.name}</strong><small>{l.detail}</small>{layout===l.id&&<Check size={19}/>}</button>)}</div>
        <label className="setup-template-choice"><input type="checkbox" checked={filled} onChange={e=>setFilled(e.target.checked)}/><span><strong>Добавить начальные модули</strong><small>Мойка, плита и хранение — только то, что помещается. Снимите галочку для сборки с нуля.</small></span></label><div className="setup-room-recap"><Ruler size={18}/>{width} × {depth} см · потолок {height} см</div>
      </>}</div>
      <footer className="setup-form-footer"><button className="journey-primary" onClick={page==='room'?next:create}>{page==='room'?'Выбрать планировку':'Настроить комнату'}<ArrowRight size={19}/></button><span>{page==='room'?'Размеры можно изменить в любой момент.':'Далее добавьте двери и окна на плане комнаты.'}</span></footer>
    </>}
  </section></div>;
}
