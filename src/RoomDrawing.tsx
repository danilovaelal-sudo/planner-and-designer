import { RoomObjectsPlan } from './RoomObjectsDrawing';
import type { KeyboardEvent } from 'react';
import { WALLS, openingSegments, wallFrame, wallLength, roomFloorArea } from './room';
import type { Opening, Room, RoomSelection } from './room';

const activate = (e: KeyboardEvent, action: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } };
export function Dimension({from,to,label,vertical=false,onClick,small=false,flip=false}:{from:[number,number];to:[number,number];label:string;vertical?:boolean;onClick?:()=>void;small?:boolean;flip?:boolean}) {
  const [x1,y1]=from,[x2,y2]=to;
  return <g className={`room-dimension ${onClick?'editable':''} ${small?'dimension-small':''}`} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} aria-label={onClick?`Изменить ${label}`:undefined} onClick={onClick} onKeyDown={onClick?e=>activate(e,onClick):undefined}>
    {onClick&&<path d={`M${x1} ${y1}L${x2} ${y2}`} stroke="transparent" strokeWidth="190"/>}
    <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#89947e" strokeWidth="5"/>
    <path d={vertical?`M${x1-30} ${y1}h60M${x2-30} ${y2}h60`:`M${x1} ${y1-30}v60M${x2} ${y2-30}v60`} stroke="#89947e" strokeWidth="5"/>
    <text x={(x1+x2)/2} y={(y1+y2)/2-32} transform={vertical?`rotate(-90 ${(x1+x2)/2} ${(y1+y2)/2})`:flip?`rotate(180 ${(x1+x2)/2} ${(y1+y2)/2-32})`:undefined} className="plan-dimension">{label}</text>
  </g>;
}
export function DoorSymbol({opening:o,thickness,active=false}:{opening:Opening;thickness:number;active?:boolean}) {
  const pivot=o.hinge==='left'?o.offset:o.offset+o.width;
  const direction=o.hinge==='left'?1:-1, inside=o.swing==='in'?1:-1;
  const base=o.swing==='in'?0:-thickness;
  const sweep=direction*inside>0?1:0;
  return <g stroke={active?'#a5543b':'#839378'} fill="none"><path d={`M${pivot+direction*o.width} ${base}A${o.width} ${o.width} 0 0 ${sweep} ${pivot} ${base+inside*o.width}`} strokeWidth="7" strokeDasharray="20 12"/><path d={`M${pivot} ${base}v${inside*o.width}`} strokeWidth="18"/><circle cx={pivot} cy={base} r="12" fill={active?'#a5543b':'#839378'}/></g>;
}
export default function RoomDrawing({room,selection=null,onSelect,dimensions=true,arrows=false}:{room:Room;selection?:RoomSelection;onSelect?:(s:RoomSelection)=>void;dimensions?:boolean;arrows?:boolean}) {
  const w=room.width,d=room.depth;
  return <g className="room-drawing">
    {WALLS.map(wall=>{
      const f=wallFrame(room,wall),active=selection?.kind==='wall'&&selection.wall===wall;
      const holes=room.openings.filter(o=>o.wall===wall);
      const previous=wall==='A'?room.walls.D.thickness:wall==='C'?room.walls.B.thickness:0;
      const next=wall==='A'?room.walls.B.thickness:wall==='C'?room.walls.D.thickness:0;
      const select=()=>onSelect?.({kind:'wall',wall});
      return <g key={wall} transform={`translate(${f.x} ${f.z}) rotate(${f.angle})`}>
        <g className="room-wall-hit" role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`Стена ${wall}, ${f.length} мм`} onClick={e=>{e.stopPropagation();select();}} onKeyDown={e=>activate(e,select)}>
          <rect x={-previous} y={-f.thickness} width={f.length+previous+next} height={f.thickness} fill={active?'#b7c89f':'#b6bcaa'} stroke={active?'#7d9565':'#9da68f'} strokeWidth={active?16:5}/>
          <path d={`M0 0H${f.length}`} stroke="transparent" strokeWidth="160"/>
        </g>
        {holes.map(o=>{
          const chosen=selection?.kind==='opening'&&selection.id===o.id;
          const action=()=>onSelect?.({kind:'opening',id:o.id});
          return <g key={o.id} className="room-opening" data-opening-id={o.id} data-wall={wall} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${o.kind==='door'?'Дверь':'Окно'} на стене ${wall}, ${o.width} мм, отступ ${o.offset} мм`} onClick={e=>{e.stopPropagation();action();}} onKeyDown={e=>activate(e,action)}>
            <rect x={o.offset} y={-f.thickness-8} width={o.width} height={f.thickness+16} fill={o.kind==='window'?'#d6e7e2':'#f6f5ee'} stroke={chosen?'#a5543b':'#81988d'} strokeWidth={chosen?18:7}/>
            {o.kind==='window'?<><path d={`M${o.offset} ${-f.thickness*.3}h${o.width}M${o.offset} ${-f.thickness*.7}h${o.width}`} stroke="#829e97" strokeWidth="6"/><path d={`M${o.offset+o.width/2} 0v${-f.thickness}`} stroke="#829e97" strokeWidth="10"/></>:<DoorSymbol opening={o} thickness={f.thickness} active={chosen}/>}
            <rect x={o.offset} y={-Math.max(f.thickness,120)} width={o.width} height={Math.max(f.thickness,240)} fill="transparent"/>
          </g>;
        })}
        {(arrows||active)&&<g className="room-origin" pointerEvents="none"><circle cx="0" cy="0" r="28" fill="#a5543b"/><path d={`M85 105H${Math.min(f.length-60,450)}l-55 -30m55 30 -55 30`} stroke="#a5543b" strokeWidth="9" fill="none"/></g>}
        <text x={f.length/2} y={-f.thickness-90} transform={wall==='C'||wall==='D'?`rotate(180 ${f.length/2} ${-f.thickness-90})`:undefined} className="plan-wall" pointerEvents="none">{wall}</text>
        {dimensions && (active || (selection?.kind==='opening'&&holes.some(o=>o.id===selection.id))) && openingSegments(room,wall).map((s,i)=><Dimension key={i} from={[s.start,220]} to={[s.end,220]} label={s.length>=400?String(s.length):''} small flip={wall==='C'||wall==='D'}/>)}
      </g>;
    })}
    {dimensions&&<>
      <Dimension from={[0,-room.walls.A.thickness-330]} to={[w,-room.walls.A.thickness-330]} label={`${w} мм · A`} onClick={onSelect?()=>onSelect({kind:'wall',wall:'A'}):undefined}/>
      <Dimension from={[w+room.walls.B.thickness+330,0]} to={[w+room.walls.B.thickness+330,d]} label={`${d} мм · B`} vertical onClick={onSelect?()=>onSelect({kind:'wall',wall:'B'}):undefined}/>
      <Dimension from={[0,d+room.walls.C.thickness+330]} to={[w,d+room.walls.C.thickness+330]} label={`${w} мм · C`} onClick={onSelect?()=>onSelect({kind:'wall',wall:'C'}):undefined}/>
      <Dimension from={[-room.walls.D.thickness-330,0]} to={[-room.walls.D.thickness-330,d]} label={`${d} мм · D`} vertical onClick={onSelect?()=>onSelect({kind:'wall',wall:'D'}):undefined}/>
    </>}
  </g>;
}
export function RoomOverview({room,selection,onSelect}:{room:Room;selection:RoomSelection;onSelect:(s:RoomSelection)=>void}) {
  const margin=750;
  return <svg className="room-overview" viewBox={`${-margin} ${-margin} ${room.width+2*margin} ${room.depth+2*margin}`} aria-label="Выберите стену или проём на схеме комнаты"><rect width={room.width} height={room.depth} fill="#f1f2e8"/><RoomDrawing room={room} selection={selection} onSelect={onSelect} dimensions={false} arrows/><RoomObjectsPlan room={room} selection={selection} onSelect={onSelect}/><text x={room.width/2} y={room.depth/2} className="overview-area">{(roomFloorArea(room)/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})} м²</text></svg>;
}
export const openingRemainder=(room:Room,o:Opening)=>wallLength(room,o.wall)-o.offset-o.width;
