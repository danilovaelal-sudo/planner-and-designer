import { WORKTOPS, worktopThickness } from './model';
import type { Project, Wall } from './model';
import { cabinetWall, wallFootprint } from './model';
import { constructionSettings, surfacePath, worktopLayout, worktopSupports } from './construction';

export default function WorktopDrawing({project,outlineOnly=false}:{project:Project;outlineOnly?:boolean}){
  const layout=worktopLayout(project),color=WORKTOPS.find(m=>m.id===project.finishes.worktop)!.color;
  return <g className="worktop-drawing" pointerEvents="none" aria-hidden="true">
    {layout.surfaces.map((s,i)=><path key={i} data-worktop-surface={i} d={surfacePath(s)} fill={outlineOnly?'none':color} fillRule="evenodd" fillOpacity=".85" stroke="#8d8b7c" strokeWidth={outlineOnly?9:3}/>)}
    {outlineOnly&&layout.cutouts.map(c=><rect key={c.cabinetId} data-worktop-cutout={c.kind} x={c.rect.minX} y={c.rect.minZ} width={c.rect.maxX-c.rect.minX} height={c.rect.maxZ-c.rect.minZ} fill={c.kind==='sink'?'#a4b2a8':'#48544b'} fillOpacity=".9" stroke="#7b8778" strokeWidth="6"/>)}
  </g>;
}
export function WorktopElevation({project,wall}:{project:Project;wall:Wall}){
  const settings=constructionSettings(project),intervals=worktopSupports(project).filter(c=>cabinetWall(c)===wall).map(c=>wallFootprint(c,project.room,wall)).sort((a,b)=>a.start-b.start);
  const runs:{start:number;end:number}[]=[];
  for(const r of intervals){const last=runs[runs.length-1];if(last&&r.start<=last.end+settings.bridgeGap)last.end=Math.max(last.end,r.end);else runs.push({start:r.start,end:r.end});}
  const thickness=worktopThickness(project),color=WORKTOPS.find(m=>m.id===project.finishes.worktop)!.color;
  return <g pointerEvents="none" aria-hidden="true">{runs.map((r,i)=><rect key={i} data-worktop-elevation x={r.start} y={project.room.height-870-thickness} width={r.end-r.start} height={thickness} fill={color} stroke="#8c8a7a" strokeWidth="3"/>)}</g>;
}
