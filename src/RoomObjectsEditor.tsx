import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { newRoomObject, ROOM_OBJECT_TYPES, roomObjectType, wallFrame, WALLS, wallLength } from './room';
import type { Room, RoomObject, RoomObjectKind, RoomSelection, Wall } from './room';
import { display, ErrorMessage, Measure, read, unitName } from './RoomFields';
import type { Unit } from './RoomFields';

export default function RoomObjectsEditor({room,wall,selection,unit,onSelect,onApply}:{room:Room;wall:Wall;selection:RoomSelection;unit:Unit;onSelect:(s:RoomSelection)=>void;onApply:(r:Room)=>void}){
  const [kind,setKind]=useState<RoomObjectKind>('box'),[error,setError]=useState('');
  const object=selection?.kind==='object'?room.objects?.find(o=>o.id===selection.id):undefined;
  return <section className="room-objects-editor" aria-label="Выступы и инженерные точки">
    {!object&&<div className="room-object-add"><h3>Что есть в вашей кухне?</h3><p className="room-small-note">Выступы занимают место. Точки подключения помогают проверить доступ за мебелью.</p><label className="room-select"><span>Добавить элемент</span><select aria-label="Тип элемента комнаты" value={kind} onChange={e=>setKind(e.target.value as RoomObjectKind)}><optgroup label="Объёмные препятствия">{ROOM_OBJECT_TYPES.filter(t=>t.solid).map(t=><option key={t.kind} value={t.kind}>{t.name}</option>)}</optgroup><optgroup label="Места подключения">{ROOM_OBJECT_TYPES.filter(t=>!t.solid).map(t=><option key={t.kind} value={t.kind}>{t.name}</option>)}</optgroup></select></label><button className="room-apply" onClick={()=>{const o=newRoomObject(room,kind,wall);if(!o){setError(`На стене ${wall} нет места для элемента стандартного размера или достигнут лимит 64. Выберите другую стену.`);return;}try{onApply({...room,objects:[...room.objects??[],o]});onSelect({kind:'object',id:o.id});setError('');}catch(e){setError((e as Error).message);}}}><Plus size={18}/>Добавить на стену {wall}</button><ErrorMessage message={error}/></div>}
    {object&&<RoomObjectForm key={`${object.id}-${unit}`} room={room} object={object} unit={unit} onApply={next=>onApply({...room,objects:room.objects!.map(o=>o.id===next.id?next:o)})} onDelete={()=>{onApply({...room,objects:room.objects!.filter(o=>o.id!==object.id)});onSelect({kind:'wall',wall:object.wall});}} onBack={()=>onSelect({kind:'wall',wall:object.wall})}/>}
    <div className="room-section-heading"><h3>Выступы и точки</h3><span>{room.objects?.length??0}</span></div>
    <div className="room-opening-list room-object-list">{(room.objects??[]).map(o=>{const t=roomObjectType(o.kind);return <button key={o.id} className={o.id===object?.id?'active':''} onClick={()=>onSelect({kind:'object',id:o.id})}><span className="room-object-symbol" style={{background:t.color}}>{t.symbol}</span><span><strong>{o.label} · стена {o.wall}</strong><small>{t.solid?`${display(o.width,unit)} × ${display(o.depth,unit)} × ${display(o.height,unit)} ${unitName(unit)}`:`Центр: ${display(o.offset+o.width/2,unit)} ${unitName(unit)} · высота ${display(o.bottom+o.height/2,unit)} ${unitName(unit)}`}</small></span></button>;})}</div>
    <p className="room-small-note">Короб, колонна и радиатор учитываются при размещении шкафов и открывании фасадов. Сохранённая мебель сама не перемещается: появившиеся пересечения будут отмечены.</p>
    <p className="room-small-note">Точки подключения — отметки существующих коммуникаций. Трассы труб, подключение техники и нормативные расстояния здесь не рассчитываются.</p>
  </section>;
}
function RoomObjectForm({room,object:o,unit,onApply,onDelete,onBack}:{room:Room;object:RoomObject;unit:Unit;onApply:(o:RoomObject)=>void;onDelete:()=>void;onBack:()=>void}){
  const t=roomObjectType(o.kind),values=()=>({label:o.label,wall:o.wall,offset:display(o.offset+(t.solid?0:o.width/2),unit),bottom:display(o.bottom+(t.solid?0:o.height/2),unit),width:display(o.width,unit),depth:display(o.depth,unit),height:display(o.height,unit),backGap:display(o.backGap,unit)});
  const [draft,setDraft]=useState(values),[error,setError]=useState('');
  useEffect(()=>{setDraft(values());setError('');},[o,unit]);
  const field=(key:'offset'|'bottom'|'width'|'height'|'depth'|'backGap',label:string)=><Measure label={label} unit={unit} value={draft[key]} onChange={value=>setDraft(d=>({...d,[key]:value}))}/>;
  return <form className="room-edit-form room-object-edit-form" onSubmit={e=>{e.preventDefault();try{onApply({...o,label:draft.label.trim(),wall:draft.wall,offset:read(draft.offset,unit)-(t.solid?0:o.width/2),bottom:read(draft.bottom,unit)-(t.solid?0:o.height/2),width:t.solid?read(draft.width,unit):o.width,height:t.solid?read(draft.height,unit):o.height,depth:t.solid?read(draft.depth,unit):o.depth,backGap:read(draft.backGap,unit)});setError('');}catch(e){setError((e as Error).message);}}}>
    <button type="button" className="room-back" onClick={onBack}><ArrowLeft size={16}/>К списку элементов</button><h3>{t.name}</h3>
    <label className="room-select"><span>Название</span><input className="room-object-name" aria-label="Название элемента комнаты" maxLength={60} value={draft.label} onChange={e=>setDraft(d=>({...d,label:e.target.value}))}/></label>
    <label className="room-select"><span>На какой стене</span><select aria-label="Стена элемента комнаты" value={draft.wall} onChange={e=>setDraft(d=>({...d,wall:e.target.value as Wall}))}>{WALLS.map(w=><option key={w} value={w}>Стена {w} · {display(wallLength(room,w),unit)} {unitName(unit)}</option>)}</select></label>
    <p className="room-origin-note">Отступ от <strong>{wallFrame(room,draft.wall).origin} угла</strong> по стрелке. {t.solid?'Измеряется до ближнего края элемента.':'Измеряется до центра точки подключения.'}</p>
    {field('offset',t.solid?'Отступ элемента от начала стены':'Отступ центра от начала стены')}
    {t.solid&&<div className="room-form-grid">{field('width','Ширина элемента вдоль стены')}{field('depth','Глубина элемента в комнату')}</div>}
    {t.solid? <div className="room-form-grid">{field('bottom','Низ элемента от пола')}{field('height','Высота элемента')}</div>:field('bottom','Высота центра от пола')}
    {field('backGap',t.solid?'Зазор элемента от стены':'Вынос точки от стены')}
    <ErrorMessage message={error}/><button type="submit" className="room-apply">Применить элемент <Check size={18}/></button>
    <p className="room-small-note">Положение сохранится после применения. {t.solid?'Для колонны внутри комнаты задайте расстояние от стены.':'Размер символа условный; координаты центра точные.'}</p>
    <button className="room-delete" type="button" onClick={onDelete}><Trash2 size={16}/>Удалить элемент</button>
  </form>;
}
