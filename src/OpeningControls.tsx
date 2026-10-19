import { Check, DoorOpen, Eye, TriangleAlert } from 'lucide-react';
import type { Cabinet, Project } from './model';
import { cabinetWall, typeOf } from './model';
import { frontAssemblies } from './openings';
import type { MotionIssue, OpeningPreview, OpeningPreviews } from './openings';

export function OpeningControls({cabinet:c,preview,onChange,onHinge,issues,currentIssues,onInspect,onAudit}:{cabinet:Cabinet;preview?:OpeningPreview;onChange:(p:OpeningPreview)=>void;onHinge:(hinge:Cabinet['hinge'])=>void;issues:MotionIssue[];currentIssues:MotionIssue[];onInspect:()=>void;onAudit:()=>void}){
  const parts=frontAssemblies(c);if(!parts.length)return null;
  const target=preview?.target??'all',progress=preview?.progress??0,selected=parts.find(p=>p.id===target),problems=issues.filter(i=>i.id===c.id),now=currentIssues.filter(i=>i.id===c.id||i.otherId===c.id);
  const set=(patch:Partial<OpeningPreview>)=>onChange({target,progress,...patch});
  return <section className="opening-controls" aria-label="Открывание выбранного шкафа"><h3><DoorOpen size={18}/>Открывание</h3>
    <label className="assembly-select"><span>Что открыть</span><select aria-label="Фасад для открывания" value={target} onChange={e=>set({target:e.target.value})}><option value="all">Все фасады этого модуля</option>{parts.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
    {parts.some(p=>p.mode==='swing')&&(parts.length===1||c.kind==='fridge'||c.kind==='pantry')&&<label className="assembly-select"><span>Петли</span><select aria-label="Сторона петель" value={c.hinge} onChange={e=>onHinge(e.target.value as Cabinet['hinge'])}><option value="left">Слева</option><option value="right">Справа</option></select></label>}
    <div className="opening-actions"><button className={progress>0?'active':''} onClick={()=>set({progress:progress>0?0:100})}><DoorOpen size={17}/>{progress>0?'Закрыть фасады':'Открыть фасады'}</button><button onClick={onInspect}><Eye size={17}/>Смотреть в 3D</button></div>
    <label className="opening-slider"><span>Степень открывания<strong>{Math.round(progress)}%</strong></span><input aria-label="Степень открывания фасада" type="range" min="0" max="100" step="1" value={progress} onChange={e=>set({progress:Number(e.target.value)})}/></label>
    <p className="opening-caption">{selected?selected.mode==='drawer'?`Полный ход: ${selected.travel} мм.`:`Полное открытие: ${selected.travel}°.`:'Дверцы — до 90°. Ящики — на полный типовой ход.'} Просмотр не меняет сохранённую расстановку.</p>
    {now.length>0&&<div className="opening-live-warning" role="status"><strong><TriangleAlert size={17}/>В текущем положении есть пересечение</strong>{now.slice(0,3).map((i,index)=><p key={index}>{i.message}</p>)}</div>}
    {problems.length>0?<div className="opening-audit-warning"><strong>На пути открывания</strong>{problems.slice(0,4).map((i,index)=><p key={index}>{i.message}</p>)}</div>:<p className="opening-clear"><Check size={16}/>На пути открывания препятствий не найдено</p>}
    <button className="opening-audit-link" onClick={onAudit}>Проверить все модули →</button>
    <p className="opening-caption">Типовые фасады без ручек в проверке. Для угла используется связанная L-пара. Петли и механизмы конкретного производителя могут требовать других зазоров.</p>
  </section>;
}
export function OpeningAuditPanel({project,issues,previews,onOpenAll,onCloseAll,showZones,onZones,onSelect,onBack}:{project:Project;issues:MotionIssue[];previews:OpeningPreviews;onOpenAll:()=>void;onCloseAll:()=>void;showZones:boolean;onZones:()=>void;onSelect:(id:string)=>void;onBack:()=>void}){
  const movable=project.cabinets.filter(c=>frontAssemblies(c).length),problemIds=new Set(issues.flatMap(i=>i.kind==='front'&&i.otherId?[i.id,i.otherId]:[i.id]));
  return <div className="panel-scroll opening-audit-panel"><button className="construction-back" onClick={onBack}>← К добавлению шкафов</button><div className="opening-intro"><DoorOpen size={27}/><h2>Хватит ли места открыть?</h2><p>Проверяем путь фасадов до полного открывания, стены и габариты соседних модулей с учётом высоты.</p></div>
    <div className={`opening-summary ${issues.length?'has-issues':''}`}>{issues.length?<TriangleAlert size={22}/>:<Check size={22}/>}<span><strong>{issues.length?`Проверьте модулей: ${problemIds.size}`:'Препятствий не найдено'}</strong><small>Подвижных модулей: {movable.length}</small></span></div>
    <div className="opening-actions"><button onClick={onOpenAll}>Открыть все</button><button onClick={onCloseAll}>Закрыть все</button></div><button className={`opening-zones ${showZones?'active':''}`} aria-pressed={showZones} onClick={onZones}>{showZones?'Скрыть зоны на плане':'Показать зоны на плане'}</button>
    <div className="opening-module-list">{movable.map((c,i)=>{const found=issues.filter(issue=>issue.id===c.id||issue.kind==='front'&&issue.otherId===c.id);return <button key={c.id} onClick={()=>onSelect(c.id)}><span className={found.length?'opening-badge bad':'opening-badge'}>{found.length?<TriangleAlert size={17}/>:<Check size={17}/>}</span><span><strong>{i+1}. {typeOf(c.kind).name}</strong><small>Стена {cabinetWall(c)} · {c.width} мм · {previews[c.id]?.progress?'открыт':'закрыт'}</small>{found.length>0&&<em>{found[0].message}</em>}</span><span>→</span></button>;})}</div>
    <p className="opening-caption">Предупреждения не запрещают сохранять проект. Одновременно открытые фасады дополнительно проверяются друг с другом. Входная дверь учитывается в открытом положении. Открывание створок окон пока не моделируется.</p>
  </div>;
}
