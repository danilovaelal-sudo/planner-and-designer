import { useRef, useState } from 'react';
import { FRONTS, bounds, snap, typeOf } from './model';
import type { Cabinet, Project, Wall } from './model';

export function ModuleGlyph({kind,color='#a5ad92'}:{kind:string;color?:string}) {
  const wall=['wall','glass','open'].includes(kind),tall=['fridge','pantry'].includes(kind);
  const top=tall?5:wall?17:27,bottom=76;
  return <svg viewBox="0 0 112 88" fill="none" aria-hidden="true">
    <ellipse cx="58" cy="79" rx="36" ry="4" fill="#dfdcd3" opacity=".6" />
    <path d={`M24 ${top+6} 78 ${top+6} 91 ${top-2} 37 ${top-2}Z`} fill="#e8e2d4" stroke="#b5b3a5" strokeWidth=".7" />
    <path d={`M78 ${top+6} 91 ${top-2} 91 ${bottom-8} 78 ${bottom}Z`} fill="#808b72" stroke="#6e7964" strokeWidth=".5"/>
    <path d={`M24 ${top+6}H78V${bottom}H24Z`} fill={color} stroke="#7c866e" strokeWidth=".6"/>
    {!wall&&<path d={`M25 ${bottom-5}H78V${bottom}H25Z`} fill="#66715c"/>}
    {kind==='drawers'?<>{[top+22,top+39].map(y=><path key={y} d={`M25 ${y}H77`} stroke="#6e7964" strokeWidth=".8"/>)}{[top+13,top+30,top+47].map(y=><path key={y} d={`M46 ${y}H57`} stroke="#d7c391" strokeWidth="1.6"/>)}</>:kind==='oven'?<><rect x="28" y={top+12} width="46" height="30" rx="1" fill="#343e37"/><rect x="33" y={top+19} width="36" height="19" fill="#576258"/><path d={`M33 ${top+15}H69`} stroke="#deded0" strokeWidth="2"/><ellipse cx="53" cy={top+1} rx="16" ry="2" fill="#3f4940"/></>:kind==='open'?<>{[top+9,top+29,top+49].map(y=><path key={y} d={`M28 ${y}H74V${y+14}H28Z`} fill="#6f7965"/> )}</>:kind==='glass'?<><rect x="29" y={top+11} width="44" height="42" fill="#bfcbb7" opacity=".8"/><path d={`M31 ${top+32}H72`} stroke="#727c6a"/></>:tall?<><path d="M25 47H77" stroke="#6e7964"/><path d="M70 35V43M70 52V60" stroke="#dcc797" strokeWidth="1.6"/></>:<><path d={`M51 ${top+7}V${bottom-5}`} stroke="#77816c" strokeWidth=".8"/><path d={`M46 ${top+13}V${top+21}M57 ${top+13}V${top+21}`} stroke="#d8c493" strokeWidth="1.6"/></>}
    {kind==='sink'&&<><ellipse cx="53" cy={top+2} rx="15" ry="3" fill="#a0aaa0" stroke="#7b8779"/><path d={`M58 ${top-1}v-6q0-5 5-4v5`} stroke="#657566" strokeWidth="1.5"/></>}
  </svg>;
}

export default function Plan({project,selected,onSelect,onMove,layer,showGrid}:{project:Project;selected:string|null;onSelect:(id:string|null)=>void;onMove:(c:Cabinet)=>void;layer:'base'|'wall';showGrid:boolean}) {
  const svgRef=useRef<SVGSVGElement>(null);
  const drag=useRef<{cabinet:Cabinet;dx:number;dz:number}|null>(null);
  const [preview,setPreview]=useState<Cabinet|null>(null);
  const point=(e:React.PointerEvent)=>{const p=new DOMPoint(e.clientX,e.clientY);const matrix=svgRef.current!.getScreenCTM()!;return p.matrixTransform(matrix.inverse());};
  const {width:w,depth:d}=project.room;
  const items=project.cabinets.filter(c=>layer==='wall'?typeOf(c.kind).category==='wall':typeOf(c.kind).category!=='wall');
  return <svg ref={svgRef} className="plan-svg" viewBox={`-440 -350 ${w+800} ${d+750}`} role="img" aria-label="План кухни сверху. Перетаскивайте модули для расстановки."
    onPointerMove={e=>{if(!drag.current)return;const p=point(e),c=drag.current;setPreview(snap({...c.cabinet,x:p.x-c.dx,z:p.y-c.dz},project));}}
    onPointerUp={e=>{if(!drag.current)return;if(preview)onMove(preview);drag.current=null;setPreview(null);e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={()=>{drag.current=null;setPreview(null);}}
    onPointerDown={e=>{if(e.target===e.currentTarget)onSelect(null);}}>
    <defs><pattern id="plan-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#d7d7cb" strokeWidth="2"/></pattern><pattern id="plan-wood" width="180" height="1000" patternUnits="userSpaceOnUse"><rect width="180" height="1000" fill="#ece6da"/><path d="M0 0V1000M0 700H180" stroke="#d6cfbf" strokeWidth="3"/></pattern></defs>
    <rect width={w} height={d} fill={showGrid?'url(#plan-grid)':project.finishes.floor==='oak'?'url(#plan-wood)':'#e8e7df'} onPointerDown={()=>onSelect(null)}/>
    <path d={`M0 ${d}V0H${w}V${d}`} fill="none" stroke="#a8ac9e" strokeWidth="55"/>
    <path d={`M0 ${d}H${w-1050}M${w-150} ${d}H${w}`} stroke="#a8ac9e" strokeWidth="55"/>
    {project.room.door?<><path d={`M${w-1050} ${d}v-900a900 900 0 0 1 900 900`} fill="none" stroke="#b4b8ab" strokeWidth="9"/><text x={w-610} y={d+140} className="plan-label">ВХОД</text></>:<path d={`M${w-1050} ${d}H${w-150}`} stroke="#a8ac9e" strokeWidth="55"/>}
    {project.room.window&&<><path d={`M${w} ${project.room.windowOffset}v${project.room.windowWidth}`} stroke="#d1e4df" strokeWidth="58"/><path d={`M${w-15} ${project.room.windowOffset}v${project.room.windowWidth}M${w+15} ${project.room.windowOffset}v${project.room.windowWidth}`} stroke="#7a9891" strokeWidth="5"/></>}
    <Dimension from={[0,-170]} to={[w,-170]} label={`${w} мм`} />
    <Dimension from={[-210,0]} to={[-210,d]} label={`${d} мм`} vertical />
    <text x={w/2} y="-50" className="plan-wall">СТЕНА A</text><text x={w+140} y={d/2} transform={`rotate(90 ${w+140} ${d/2})`} className="plan-wall">СТЕНА B</text>
    {items.map(original=>{
      const c=preview?.id===original.id?preview:original,t=typeOf(c.kind),active=c.id===selected;
      const m=FRONTS.find(m=>m.id===(c.front || (t.category==='wall'?project.finishes.upper:project.finishes.lower)))!;
      return <g key={c.id} transform={`translate(${c.x},${c.z}) rotate(${-c.rotation})`} className="plan-cabinet" role="button" tabIndex={0} aria-label={`${t.name}, ${c.width} мм`} aria-pressed={active}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.id);}}}
        onPointerDown={e=>{e.stopPropagation();onSelect(c.id);const p=point(e);drag.current={cabinet:c,dx:p.x-c.x,dz:p.y-c.z};svgRef.current!.setPointerCapture(e.pointerId);}}>
        <rect x={-c.width/2} y={-t.depth/2} width={c.width} height={t.depth} rx="8" fill={m.color} fillOpacity={t.category==='wall'?.75:.84} stroke={active?'#a5543b':'#747d6a'} strokeWidth={active?18:7} strokeDasharray={t.category==='wall'?'18 8':undefined}/>
        <path d={`M${-c.width/2+8} ${t.depth/2-22}H${c.width/2-8}`} stroke={active?'#a5543b':'#68745c'} strokeWidth="16"/>
        {c.kind==='sink'&&<rect x={-c.width*.30} y={-t.depth*.28} width={c.width*.6} height={t.depth*.55} rx="45" fill="#b9c0b2" stroke="#7d8a79" strokeWidth="8"/>}
        {c.kind==='oven'&&[-1,1].flatMap(x=>[-1,1].map(z=><circle key={`${x}${z}`} cx={x*125} cy={z*110} r="60" fill="#55604d" stroke="#85917a" strokeWidth="8"/>))}
        <text y={c.kind==='oven'||c.kind==='sink'?t.depth/2-65:10} className="plan-size">{c.width}</text>
        {active&&<circle cx={c.width/2} cy={-t.depth/2} r="30" fill="#a5543b" stroke="#fffaf1" strokeWidth="10"/>}
      </g>;
    })}
    <text x={70} y={d-100} className="plan-area">{(w*d/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})} м²</text>
  </svg>;
}
function Dimension({from,to,label,vertical=false}:{from:[number,number];to:[number,number];label:string;vertical?:boolean}) {
  const [x1,y1]=from,[x2,y2]=to;
  return <g><path d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#929a87" strokeWidth="5"/><path d={vertical?`M${x1-30} ${y1}h60M${x2-30} ${y2}h60`:`M${x1} ${y1-30}v60M${x2} ${y2-30}v60`} stroke="#929a87" strokeWidth="5"/><text x={(x1+x2)/2} y={(y1+y2)/2-28} transform={vertical?`rotate(-90 ${(x1+x2)/2} ${(y1+y2)/2})`:undefined} className="plan-dimension">{label}</text></g>;
}
export function Elevation({project,wall,selected,onSelect}:{project:Project;wall:Wall;selected:string|null;onSelect:(id:string|null)=>void}) {
  const length=wall==='A'?project.room.width:project.room.depth,h=project.room.height;
  const items=project.cabinets.filter(c=>wall==='A'?c.rotation===0:c.rotation===270).sort((a,b)=>typeOf(a.kind).elevation-typeOf(b.kind).elevation);
  return <svg className="plan-svg elevation-svg" viewBox={`-250 -250 ${length+500} ${h+600}`} role="img" aria-label={`Вид со стороны стены ${wall}`}>
    <rect width={length} height={h} fill="#e8e5dc" stroke="#9ea491" strokeWidth="10"/>
    {items.map(c=>{const t=typeOf(c.kind),x=(wall==='A'?c.x:c.z)-c.width/2,y=h-t.elevation-t.height,m=FRONTS.find(m=>m.id===(c.front||(t.category==='wall'?project.finishes.upper:project.finishes.lower)))!;
      return <g key={c.id} onClick={()=>onSelect(c.id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onSelect(c.id);}} aria-label={`${t.name}, ${c.width} мм`} className="elevation-module"><rect x={x} y={y} width={c.width} height={t.height} fill={m.color} stroke={selected===c.id?'#a5543b':'#7e8974'} strokeWidth={selected===c.id?18:6}/>{t.category!=='wall'&&<rect x={x} y={h-100} width={c.width} height="100" fill="#727b67"/>}{c.kind==='drawers'?[1,2].map(n=><path key={n} d={`M${x} ${y+(t.height-100)*n/3}h${c.width}`} stroke="#737f67" strokeWidth="6"/>):c.kind==='oven'?<rect x={x+30} y={y+80} width={c.width-60} height="580" fill="#3c483e"/>:c.kind==='open'?<>{[20,350].map(n=><rect key={n} x={x+20} y={y+n} width={c.width-40} height="300" fill="#69775d"/>)}</>:<path d={`M${x+c.width-65} ${y+120}v100`} stroke="#d6bc82" strokeWidth="16"/>}<text x={x+c.width/2} y={y+t.height/2} className="plan-size">{c.width}</text></g>;
    })}
    <Dimension from={[0,h+150]} to={[length,h+150]} label={`${length} мм · стена ${wall}`}/>
  </svg>;
}
