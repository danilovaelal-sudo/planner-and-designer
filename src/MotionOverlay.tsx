import type { Project } from './model';
import { typeOf } from './model';
import { frontAssemblies, frontPlanPolygon, previewProgress } from './openings';
import type { MotionIssue, OpeningPreviews } from './openings';

export default function MotionOverlay({project,previews,issues,layer,zones=false}:{project:Project;previews:OpeningPreviews;issues:MotionIssue[];layer:'base'|'wall';zones?:boolean}){
  return <g className={`motion-overlay ${zones?'motion-zones':''}`} pointerEvents="none" aria-hidden="true">{project.cabinets.filter(c=>(typeOf(c.kind).category==='wall')===(layer==='wall')).flatMap(c=>frontAssemblies(c).flatMap(part=>{
    const progress=previewProgress(previews[c.id],part);if(!zones&&!progress)return [];
    const bad=issues.some(i=>i.id===c.id&&i.partId===part.id||i.kind==='front'&&i.otherId===c.id);
    return part.pieces.filter(piece=>zones?piece.style!=='tray':true).map((piece,i)=>{const poly=frontPlanPolygon(c,part,piece,progress,zones);return <polygon key={`${c.id}:${part.id}:${i}`} data-motion-cabinet={c.id} data-motion-part={part.id} data-motion-progress={progress} points={poly.map(p=>`${p.x},${p.y}`).join(' ')} className={bad?'blocked':''} fill={bad?'#c86d4b':'#7d9c79'} stroke={bad?'#b15236':'#698d68'} strokeWidth={zones?6:12} fillOpacity={zones?.12:piece.style==='tray'?.18:.32} strokeDasharray={zones?'22 16':undefined}/>;});
  }))}</g>;
}
