import { cabinetWall, frontClearance, typeOf, wallFootprint } from './model';
import type { Cabinet, Project } from './model';
import { Dimension } from './RoomDrawing';
import { wallFrame } from './room';

export default function CabinetGuides({cabinet:c,project,minPassage}:{cabinet:Cabinet;project:Project;minPassage:number}){
  const wall=cabinetWall(c),f=wallFrame(project.room,wall),r=wallFootprint(c,project.room,wall),clear=frontClearance(c,project);
  const narrow=clear.blocker&&Math.abs(c.rotation-clear.blocker.rotation)===180&&clear.distance<minPassage;
  return <g className="cabinet-guides" pointerEvents="none" aria-hidden="true">
    <g transform={`translate(${f.x} ${f.z}) rotate(${f.angle})`}>
      <circle cx="0" cy="0" r="25" fill="#a5543b"/><path d="M65 90H290l-45 -25m45 25 -45 25" fill="none" stroke="#a5543b" strokeWidth="8"/>
      {r.start>0&&<Dimension from={[0,r.back+100]} to={[r.start,r.back+100]} label={`${Math.round(r.start)} мм`} flip={wall==='C'||wall==='D'} small/>}
      {r.end<f.length&&<Dimension from={[r.end,r.back+100]} to={[f.length,r.back+100]} label={`${Math.round(f.length-r.end)} мм`} flip={wall==='C'||wall==='D'} small/>}
    </g>
    {typeOf(c.kind).category!=='wall'&&clear.distance>0&&<g className={narrow?'narrow-clearance':''}><path d={`M${clear.from.x} ${clear.from.z}L${clear.to.x} ${clear.to.z}`} fill="none" stroke={narrow?'#b46b46':'#83966f'} strokeWidth="8" strokeDasharray="30 20"/><text x={(clear.from.x+clear.to.x)/2+80} y={(clear.from.z+clear.to.z)/2} className="clearance-label">{clear.distance} мм</text></g>}
  </g>;
}
