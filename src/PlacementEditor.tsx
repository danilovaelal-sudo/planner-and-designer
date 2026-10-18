import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Magnet, TriangleAlert } from 'lucide-react';
import { cabinetWall, frontClearance, issues, placeAtWall, placeBeside, typeOf, wallFootprint } from './model';
import type { Cabinet, Project } from './model';
import { WALLS, wallFrame } from './room';
import type { Wall } from './room';

function Millimetres({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return <label className="assembly-measure"><span>{label}</span><div><input aria-label={label} inputMode="numeric" type="text" value={value} onChange={e=>onChange(e.target.value)}/><span>мм</span></div></label>;
}
function mm(value:string){const n=Number(value);if(!value.trim()||!Number.isInteger(n)||n<0||n>8000)throw new Error('Введите целое число от 0 до 8 000 мм.');return n;}
export function AssemblyOptions({gap,onGap,snapping,onSnapping,step,onStep,minPassage,onMinPassage}:{gap:number;onGap:(n:number)=>void;snapping:boolean;onSnapping:(v:boolean)=>void;step:number;onStep:(n:number)=>void;minPassage:number;onMinPassage:(n:number)=>void}){
  const [draft,setDraft]=useState(String(gap)),[error,setError]=useState('');
  useEffect(()=>setDraft(String(gap)),[gap]);
  return <details className="assembly-options"><summary><Magnet size={17}/>Привязки и зазоры<span>{gap} мм</span></summary><div>
    <label className="assembly-check"><input type="checkbox" checked={snapping} onChange={e=>onSnapping(e.target.checked)}/><span>Привязка при перетаскивании</span></label>
    <label className="assembly-select"><span>Шаг сетки и перемещения</span><select aria-label="Шаг перемещения" value={step} onChange={e=>onStep(Number(e.target.value))}>{[1,10,50].map(n=><option key={n} value={n}>{n} мм</option>)}</select></label>
    <form onSubmit={e=>{e.preventDefault();try{const n=mm(draft);if(n>100)throw new Error('Зазор между модулями: от 0 до 100 мм.');onGap(n);setError('');}catch(err){setError((err as Error).message);}}}><Millimetres label="Зазор при добавлении и привязке" value={draft} onChange={setDraft}/><button className="assembly-apply" type="submit">Применить зазор<Check size={16}/></button></form>
    <label className="assembly-select"><span>Ориентир прохода между рядами</span><select aria-label="Ориентир ширины прохода" value={minPassage} onChange={e=>onMinPassage(Number(e.target.value))}>{[800,900,1000,1100,1200].map(n=><option key={n} value={n}>{n} мм</option>)}</select></label>
    <p className="assembly-note">Зазор действует на новые добавления и привязки. Уже расставленные шкафы сохраняют положение. Проход — выбранный вами ориентир.</p>{error&&<p className="assembly-error" role="alert">{error}</p>}
  </div></details>;
}
export default function PlacementEditor({project,cabinet:c,onApply,step,onStep,gap,minPassage}:{project:Project;cabinet:Cabinet;onApply:(c:Cabinet)=>void;step:number;onStep:(n:number)=>void;gap:number;minPassage:number}){
  const [wall,setWall]=useState<Wall>(cabinetWall(c));
  const actual=wallFootprint(c,project.room,cabinetWall(c));
  const [offset,setOffset]=useState(String(actual.start)),[back,setBack]=useState(String(actual.back)),[error,setError]=useState('');
  const [neighbour,setNeighbour]=useState(''),[spacing,setSpacing]=useState(String(gap)),[windowId,setWindowId]=useState('');
  useEffect(()=>{const w=cabinetWall(c),r=wallFootprint(c,project.room,w);setWall(w);setOffset(String(r.start));setBack(String(r.back));setError('');},[c,project.room]);
  useEffect(()=>setSpacing(String(gap)),[gap]);
  const neighbours=project.cabinets.filter(o=>o.id!==c.id&&(typeOf(o.kind).category==='wall')===(typeOf(c.kind).category==='wall'));
  const windows=project.room.openings.filter(o=>o.kind==='window');
  const chosen=neighbours.find(o=>o.id===neighbour)??neighbours[0];
  const chosenWindow=windows.find(o=>o.id===windowId)??windows[0];
  const warnings=issues(project,minPassage).filter(i=>i.id===c.id||i.otherId===c.id),clear=frontClearance(c,project);
  function apply(next:()=>Cabinet){try{onApply(next());setError('');}catch(err){setError((err as Error).message);}}
  return <section className="placement-editor" aria-label="Точная расстановка шкафа">
    <h3>Положение у стены</h3>
    <form onSubmit={e=>{e.preventDefault();apply(()=>placeAtWall(c,project.room,wall,mm(offset),mm(back)));}}>
      <label className="assembly-select"><span>Стена за шкафом</span><select aria-label="Стена выбранного шкафа" value={wall} onChange={e=>setWall(e.target.value as Wall)}>{WALLS.map(w=><option key={w} value={w}>Стена {w}</option>)}</select></label>
      <p className="assembly-origin">От <strong>{wallFrame(project.room,wall).origin} угла</strong>, по стрелке на плане. Фасад будет направлен внутрь комнаты.</p>
      <div className="assembly-fields"><Millimetres label="Отступ от начала стены" value={offset} onChange={setOffset}/><Millimetres label="Зазор за шкафом" value={back} onChange={setBack}/></div>
      <button className="assembly-apply" type="submit">Применить положение<Check size={17}/></button>
    </form>
    <div className="assembly-shortcuts"><button onClick={()=>apply(()=>placeAtWall(c,project.room,wall,mm(offset),0))}>К стене</button><button onClick={()=>apply(()=>placeAtWall(c,project.room,wall,Math.round((wallFrame(project.room,wall).length-c.width)/2),mm(back)))}>По центру стены</button></div>
    <dl className="placement-readout"><div><dt>От начала стены {cabinetWall(c)}</dt><dd>{actual.start} мм</dd></div><div><dt>До второго угла</dt><dd>{wallFrame(project.room,cabinetWall(c)).length-actual.end} мм</dd></div><div><dt>За шкафом</dt><dd>{actual.back} мм</dd></div>{typeOf(c.kind).category!=='wall'&&<div><dt>Перед фасадом</dt><dd>{clear.distance} мм</dd></div>}</dl>
    {neighbours.length>0&&<div className="assembly-neighbours"><h3>Рядом с другим шкафом</h3><label className="assembly-select"><span>Соседний модуль</span><select aria-label="Соседний модуль" value={chosen?.id??''} onChange={e=>setNeighbour(e.target.value)}>{neighbours.map((o,i)=><option key={o.id} value={o.id}>{i+1}. {typeOf(o.kind).name} · {o.width} мм · {cabinetWall(o)}</option>)}</select></label><Millimetres label="Промежуток между шкафами" value={spacing} onChange={setSpacing}/><div className="assembly-shortcuts"><button onClick={()=>apply(()=>placeBeside(c,chosen!,project.room,'before',mm(spacing)))}>Перед соседом</button><button onClick={()=>apply(()=>placeBeside(c,chosen!,project.room,'after',mm(spacing)))}>После соседа</button></div><p className="assembly-note">Порядок по стрелке стены. Шкаф повернётся как сосед, задние края выровняются.</p></div>}
    {windows.length>0&&<div className="assembly-window"><h3>Совместить с окном</h3><label className="assembly-select"><span>Окно</span><select aria-label="Окно для выравнивания" value={chosenWindow?.id??''} onChange={e=>setWindowId(e.target.value)}>{windows.map((o,i)=><option key={o.id} value={o.id}>Окно {i+1} · стена {o.wall} · {o.width} мм</option>)}</select></label><button className="assembly-outline" onClick={()=>apply(()=>placeAtWall(c,project.room,chosenWindow!.wall,Math.round(chosenWindow!.offset+(chosenWindow!.width-c.width)/2),0))}>По центру окна</button><p className="assembly-note">Применится, если шкаф со столешницей не перекрывает проём.</p></div>}
    <h3>Подвинуть точно</h3><label className="assembly-select"><span>Одно нажатие</span><select aria-label="Шаг кнопок перемещения" value={step} onChange={e=>onStep(Number(e.target.value))}>{[1,10,50].map(n=><option key={n} value={n}>{n} мм</option>)}</select></label>
    <div className="assembly-move-pad">{[{label:'Подвинуть шкаф влево',dx:-step,dz:0,icon:<ArrowLeft size={20}/>},{label:'Подвинуть шкаф вверх на плане',dx:0,dz:-step,icon:<ArrowUp size={20}/>},{label:'Подвинуть шкаф вниз на плане',dx:0,dz:step,icon:<ArrowDown size={20}/>},{label:'Подвинуть шкаф вправо',dx:step,dz:0,icon:<ArrowRight size={20}/>}].map(a=><button key={a.label} aria-label={a.label} onClick={()=>apply(()=>({...c,x:c.x+a.dx,z:c.z+a.dz}))}>{a.icon}</button>)}</div>
    {error&&<p className="assembly-error" role="alert">{error}</p>}
    {warnings.length>0&&<div className="selected-placement-issues"><h3><TriangleAlert size={17}/>Проверьте положение</h3>{warnings.map((w,i)=><p key={i}>{w.message}</p>)}</div>}
    <p className="assembly-note">Применение проверяет стены, шкафы, проёмы и открывание входной двери. Створки окон и открывание мебельных фасадов пока не моделируются.</p>
  </section>;
}
