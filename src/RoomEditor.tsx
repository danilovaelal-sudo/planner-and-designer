import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, DoorOpen, Plus, Trash2 } from 'lucide-react';
import { WALLS, newOpening, validateRoom, wallFrame, wallLength } from './room';
import type { Opening, Room, RoomSelection, Wall } from './room';
import { RoomOverview, openingRemainder } from './RoomDrawing';

type Unit='cm'|'mm';
const unitName=(unit:Unit)=>unit==='cm'?'см':'мм';
const display=(n:number,unit:Unit)=>String(unit==='cm'?n/10:n);
function read(value:string,unit:Unit){
  if(!value.trim())throw new Error('Заполните все размеры.');
  const n=Number(value.replace(',','.'))*(unit==='cm'?10:1);
  if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>.00001)throw new Error('Введите размер с точностью до 1 мм (0,1 см).');
  return Math.round(n);
}
function Measure({label,value,onChange,unit}:{label:string;value:string;onChange:(v:string)=>void;unit:Unit}){
  return <label className="room-measure"><span>{label}</span><div><input aria-label={label} inputMode="decimal" type="text" value={value} onChange={e=>onChange(e.target.value)}/><span>{unitName(unit)}</span></div></label>;
}
function ErrorMessage({message}:{message:string}){return message?<p className="room-error" role="alert">{message}</p>:null;}
export default function RoomEditor({room,selection,onSelect,onChange,onInspect}:{room:Room;selection:RoomSelection;onSelect:(s:RoomSelection)=>void;onChange:(room:Room)=>void;onInspect:()=>void}) {
  const panelRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(selection?.kind==='opening'){const panel=panelRef.current,form=panel?.querySelector<HTMLElement>('.opening-edit-form');if(panel&&form)panel.scrollTo({top:form.offsetTop-panel.offsetTop-10,behavior:'smooth'});}},[selection?.kind,selection?.kind==='opening'?selection.id:null]);
  const [unit,setUnit]=useState<Unit>('cm');
  const [error,setError]=useState('');
  const wall=selection?.kind==='wall'?selection.wall:selection?.kind==='opening'?room.openings.find(o=>o.id===selection.id)?.wall??'A':'A';
  const opening=selection?.kind==='opening'?room.openings.find(o=>o.id===selection.id):undefined;
  function apply(next:Room){const errors=validateRoom(next);if(errors.length)throw new Error(errors[0]);onChange(next);setError('');}
  function add(kind:Opening['kind']){
    if(room.openings.length>=32){setError('Можно добавить до 32 проёмов.');return;}
    const o=newOpening(room,kind,wall);
    if(!o){setError(`На стене ${wall} нет места для нового проёма стандартного размера. Выберите другую стену.`);return;}
    apply({...room,openings:[...room.openings,o]});onSelect({kind:'opening',id:o.id});
  }
  return <div ref={panelRef} className="panel-scroll room-editor precise-room-editor">
    <p className="panel-description">Воспроизведите свою комнату: выберите стену, затем добавьте двери и окна.</p>
    <div className="room-unit-picker"><span>Размеры в</span><div>{(['cm','mm'] as const).map(u=><button key={u} aria-pressed={unit===u} className={unit===u?'active':''} onClick={()=>{setUnit(u);setError('');}}>{unitName(u)}</button>)}</div></div>
    <RoomOverview room={room} selection={selection} onSelect={s=>{onSelect(s);setError('');}}/>
    <div className="room-wall-picker" aria-label="Выбор стены">{WALLS.map(w=><button key={w} className={!opening&&wall===w?'active':''} aria-pressed={!opening&&wall===w} onClick={()=>{onSelect({kind:'wall',wall:w});setError('');}}><strong>{w}</strong><span>{display(wallLength(room,w),unit)} {unitName(unit)}</span></button>)}</div>
    <div className="add-openings room-editor-shortcuts"><button onClick={()=>add('door')}><DoorOpen size={18}/><span>Дверь</span><Plus size={16}/></button><button onClick={()=>add('window')}><span className="window-icon" aria-hidden="true">⊞</span><span>Окно</span><Plus size={16}/></button></div>
    {opening?<OpeningForm key={`${opening.id}-${unit}`} room={room} opening={opening} unit={unit} onApply={o=>apply({...room,openings:room.openings.map(old=>old.id===o.id?o:old)})} onDelete={()=>{apply({...room,openings:room.openings.filter(o=>o.id!==opening.id)});onSelect({kind:'wall',wall:opening.wall});}} onBack={()=>onSelect({kind:'wall',wall:opening.wall})}/>:<WallForm key={`${wall}-${unit}`} room={room} wall={wall} unit={unit} onApply={apply}/>}
    <CeilingForm room={room} unit={unit} onApply={apply}/>
    <div className="room-section-heading"><h3>Двери и окна</h3><span>{room.openings.length}</span></div>
    <p className="room-small-note">Новый проём добавится на стену {wall}. Можно перенести его на другую стену в настройках.</p>
    <ErrorMessage message={error}/>
    <div className="room-opening-list">{room.openings.length?room.openings.map((o,i)=><button key={o.id} className={opening?.id===o.id?'active':''} onClick={()=>{onSelect({kind:'opening',id:o.id});setError('');}}><span className="opening-list-icon">{o.kind==='door'?<DoorOpen size={18}/>:<span>⊞</span>}</span><span><strong>{o.kind==='door'?'Дверь':'Окно'} · стена {o.wall}</strong><small>{display(o.width,unit)} × {display(o.height,unit)} {unitName(unit)} · отступ {display(o.offset,unit)}</small></span><span className="opening-list-number">{i+1}</span></button>):<p className="room-small-note">Проёмов пока нет. Добавьте дверь или окно.</p>}</div>
    <button className="room-view-button" onClick={onInspect}>Посмотреть комнату без панели <Check size={17}/></button>
    <p className="room-small-note">Прямоугольная комната. Точность — 1 мм. Мебель сохраняет свои размеры и положение при изменении стен.</p>
  </div>;
}
function WallForm({room,wall,unit,onApply}:{room:Room;wall:Wall;unit:Unit;onApply:(r:Room)=>void}){
  const [length,setLength]=useState(display(wallLength(room,wall),unit)),[thickness,setThickness]=useState(display(room.walls[wall].thickness,unit)),[error,setError]=useState('');
  useEffect(()=>{setLength(display(wallLength(room,wall),unit));setThickness(display(room.walls[wall].thickness,unit));setError('');},[room,wall,unit]);
  const paired={A:'C',B:'D',C:'A',D:'B'}[wall];
  return <form className="room-edit-form" onSubmit={e=>{e.preventDefault();try{const size=read(length,unit);onApply({...room,[wall==='A'||wall==='C'?'width':'depth']:size,walls:{...room.walls,[wall]:{thickness:read(thickness,unit)}}});setError('');}catch(err){setError((err as Error).message);}}}>
    <h3>Стена {wall}</h3><div className="room-form-grid"><Measure label={`Длина стены ${wall}`} value={length} onChange={setLength} unit={unit}/><Measure label={`Толщина стены ${wall}`} value={thickness} onChange={setThickness} unit={unit}/></div>
    <p className="room-small-note">Длина между внутренними углами. Стена {paired} изменится вместе с {wall}. Верхний левый угол остаётся на месте; {wall==='A'||wall==='C'?'правая стена перемещается':'нижняя стена перемещается'}.</p>
    <ErrorMessage message={error}/><button className="room-apply" type="submit">Применить размеры <Check size={17}/></button>
  </form>;
}
function CeilingForm({room,unit,onApply}:{room:Room;unit:Unit;onApply:(r:Room)=>void}){
  const [height,setHeight]=useState(display(room.height,unit)),[error,setError]=useState('');
  useEffect(()=>{setHeight(display(room.height,unit));setError('');},[room.height,unit]);
  return <form className="room-ceiling-form" onSubmit={e=>{e.preventDefault();try{onApply({...room,height:read(height,unit)});setError('');}catch(err){setError((err as Error).message);}}}><Measure label="Высота потолка" value={height} onChange={setHeight} unit={unit}/><button type="submit" aria-label="Применить высоту потолка"><Check size={20}/></button><ErrorMessage message={error}/></form>;
}
function OpeningForm({room,opening:o,unit,onApply,onDelete,onBack}:{room:Room;opening:Opening;unit:Unit;onApply:(o:Opening)=>void;onDelete:()=>void;onBack:()=>void}){
  const values=()=>({wall:o.wall,offset:display(o.offset,unit),width:display(o.width,unit),height:display(o.height,unit),sill:display(o.sill,unit),hinge:o.hinge,swing:o.swing});
  const [draft,setDraft]=useState(values),[error,setError]=useState('');
  useEffect(()=>{setDraft(values());setError('');},[o,unit]);
  const field=(key:'offset'|'width'|'height'|'sill',label:string)=><Measure label={label} unit={unit} value={draft[key]} onChange={v=>setDraft(d=>({...d,[key]:v}))}/>;
  const f=wallFrame(room,draft.wall),name=o.kind==='door'?'Дверь':'Окно';
  const end=wallLength(room,draft.wall)-Number(draft.offset.replace(',','.'))*(unit==='cm'?10:1)-Number(draft.width.replace(',','.'))*(unit==='cm'?10:1);
  return <form className="room-edit-form opening-edit-form" onSubmit={e=>{e.preventDefault();try{onApply({...o,wall:draft.wall,width:read(draft.width,unit),height:read(draft.height,unit),offset:read(draft.offset,unit),sill:o.kind==='door'?0:read(draft.sill,unit),hinge:draft.hinge,swing:draft.swing});setError('');}catch(err){setError((err as Error).message);}}}>
    <button className="room-back" type="button" onClick={onBack}><ArrowLeft size={16}/>К стене {o.wall}</button>
    <h3>{name} · стена {o.wall}</h3>
    <label className="room-select"><span>На какой стене</span><select aria-label="Стена проёма" value={draft.wall} onChange={e=>setDraft(d=>({...d,wall:e.target.value as Wall}))}>{WALLS.map(w=><option key={w} value={w}>Стена {w} · {display(wallLength(room,w),unit)} {unitName(unit)}</option>)}</select></label>
    <p className="room-origin-note">Отступ считаем от <strong>{f.origin} угла</strong> по стрелке на схеме.</p>
    {field('offset','Отступ от начала стены')}
    <div className="room-form-grid">{field('width','Ширина проёма')}{field('height','Высота проёма')}</div>
    {o.kind==='window'?field('sill','Высота подоконника от пола'):<>
      <label className="room-select"><span>Петли при взгляде из комнаты</span><select aria-label="Петли двери" value={draft.hinge} onChange={e=>setDraft(d=>({...d,hinge:e.target.value as Opening['hinge']}))}><option value="left">Слева</option><option value="right">Справа</option></select></label>
      <label className="room-select"><span>Открывание</span><select aria-label="Открывание двери" value={draft.swing} onChange={e=>setDraft(d=>({...d,swing:e.target.value as Opening['swing']}))}><option value="in">Внутрь комнаты</option><option value="out">Из комнаты</option></select></label>
    </>}
    <p className={`opening-remainder ${end<0?'invalid':''}`}>До второго угла: <strong>{Number.isFinite(end)?display(Math.round(end),unit):'—'} {unitName(unit)}</strong></p>
    <ErrorMessage message={error}/><button className="room-apply" type="submit">Применить проём <Check size={17}/></button>
    <p className="room-small-note">Размеры строительного проёма. После применения: {display(o.offset,unit)} + {display(o.width,unit)} + {display(openingRemainder(room,o),unit)} = {display(wallLength(room,o.wall),unit)} {unitName(unit)}.</p>
    <button className="room-delete" type="button" onClick={onDelete}><Trash2 size={16}/>Удалить {o.kind==='door'?'дверь':'окно'}</button>
  </form>;
}
