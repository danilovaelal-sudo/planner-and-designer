import { roomObjectType, wallFrame } from './room';
import type { Room, RoomSelection, Wall } from './room';

export function RoomObjectsPlan({room,selection=null,onSelect,filter='all'}:{room:Room;selection?:RoomSelection;onSelect?:(s:RoomSelection)=>void;filter?:'all'|'solid'|'points'}){
  return <g className="room-objects-plan">{(room.objects??[]).filter(o=>filter==='all'||roomObjectType(o.kind).solid===(filter==='solid')).map(o=>{
    const t=roomObjectType(o.kind),f=wallFrame(room,o.wall),active=selection?.kind==='object'&&selection.id===o.id;
    const select=()=>onSelect?.({kind:'object',id:o.id}),cx=o.offset+o.width/2,cz=o.backGap+(t.solid?o.depth/2:0);
    return <g key={o.id} data-room-object-id={o.id} data-object-kind={o.kind} pointerEvents={onSelect?undefined:'none'} transform={`translate(${f.x} ${f.z}) rotate(${f.angle})`} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${o.label}, стена ${o.wall}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();select();}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();select();}}}>
      {t.solid?<><rect x={o.offset} y={o.backGap} width={o.width} height={o.depth} fill={t.color} fillOpacity=".65" stroke={active?'#a5543b':'#7f806e'} strokeWidth={active?20:8}/>{o.kind==='radiator'&&Array.from({length:Math.max(1,Math.floor(o.width/80))},(_,i)=><path key={i} d={`M${o.offset+40+i*80} ${o.backGap+10}v${Math.max(1,o.depth-20)}`} stroke="#f6efe4" strokeWidth="14"/>)}<text x={cx} y={cz+23} transform={`rotate(${-f.angle} ${cx} ${cz})`} textAnchor="middle" fontSize="75" fill="#565d4e" pointerEvents="none">{t.symbol}</text></>:<g transform={`translate(${cx} ${cz}) rotate(${-f.angle})`}><circle r="320" fill="transparent"/><circle r="115" fill="#fffcf2" stroke={active?'#a5543b':t.color} strokeWidth={active?24:16}/><text y="32" textAnchor="middle" fontSize="92" fontWeight="650" fill={t.color} pointerEvents="none">{t.symbol}</text><circle r="15" cy="-63" fill={t.color}/></g>}
      {active&&<g transform={`translate(${cx} ${cz+Math.max(200,o.depth/2+100)}) rotate(${-f.angle})`} pointerEvents="none"><text textAnchor="middle" fontSize="86" fill="#875c3f" stroke="#fff9ed" strokeWidth="15" paintOrder="stroke">{o.label.length>25?o.label.slice(0,24)+'…':o.label} · {t.solid?`${o.width}×${o.depth}`:`центр ${o.bottom+o.height/2}`} мм</text></g>}
    </g>;
  })}</g>;
}
export function RoomObjectsElevation({room,wall,selection,onSelect}:{room:Room;wall:Wall;selection?:RoomSelection;onSelect?:(s:RoomSelection)=>void}){
  return <g className="room-objects-elevation">{(room.objects??[]).filter(o=>o.wall===wall).map(o=>{const t=roomObjectType(o.kind),active=selection?.kind==='object'&&selection.id===o.id,x=o.offset+o.width/2,y=room.height-o.bottom-o.height/2;return <g key={o.id} data-room-object-id={o.id} pointerEvents={onSelect?undefined:'none'} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${o.label}, стена ${wall}`} onClick={()=>onSelect?.({kind:'object',id:o.id})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.({kind:'object',id:o.id});}}}>
    {t.solid?<rect x={o.offset} y={room.height-o.bottom-o.height} width={o.width} height={o.height} fill={t.color} fillOpacity=".8" stroke={active?'#a5543b':'#7f806e'} strokeWidth={active?20:8}/>:<><circle cx={x} cy={y} r="260" fill="transparent"/><circle cx={x} cy={y} r="110" fill="#fffdf4" stroke={active?'#a5543b':t.color} strokeWidth="16"/></>}
    <text x={x} y={y+28} fontSize="85" textAnchor="middle" fill={t.solid?'#555f4c':t.color} pointerEvents="none">{t.symbol}</text>
    {active&&<text x={x} y={y-160} fontSize="82" textAnchor="middle" fill="#875c3f" stroke="#fff9ed" strokeWidth="13" paintOrder="stroke" pointerEvents="none">{t.solid?`${o.width} × ${o.height}`:`Высота центра ${o.bottom+o.height/2}`} мм</text>}
  </g>;})}</g>;
}
