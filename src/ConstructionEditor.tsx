import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Plus, Ruler } from 'lucide-react';
import { FRONTS, WORKTOPS, worktopThickness } from './model';
import type { Cabinet, ConstructionSettings, Project } from './model';
import { constructionSettings, fillerSuggestions, worktopLayout } from './construction';

export function FillerSuggestions({project,anchorId,onAdd}:{project:Project;anchorId?:string;onAdd:(c:Cabinet)=>void}){
  const suggestions=fillerSuggestions(project,anchorId);
  return <section className="filler-suggestions"><h3>Закрыть промежуток добором</h3><p>Добор — узкая панель в цвет фасада. Подбираем ширину от 10 до 300 мм.</p>
    {suggestions.length?<div className="filler-list">{suggestions.slice(0,10).map(s=><button key={s.key} onClick={()=>onAdd(s.cabinet)}><span><strong>{s.width} мм · стена {s.wall}</strong><small>{s.cabinet.kind==='wall-filler'?'Навесной ярус':s.cabinet.kind==='tall-filler'?'Рядом с пеналом':'Нижний ярус'}</small></span><Plus size={19}/></button>)}</div>:<p className="construction-empty">Подходящих промежутков пока нет. Добор любой ширины от 10 до 300 мм можно добавить из каталога и настроить как шкаф.</p>}
  </section>;
}
export default function ConstructionEditor({project,onChange,onAdd,onBack,onMaterial}:{project:Project;onChange:(s:ConstructionSettings)=>void;onAdd:(c:Cabinet)=>void;onBack:()=>void;onMaterial:()=>void}){
  const settings=constructionSettings(project),layout=worktopLayout(project);
  const [overhang,setOverhang]=useState(String(settings.frontOverhang)),[bridge,setBridge]=useState(String(settings.bridgeGap)),[error,setError]=useState('');
  useEffect(()=>{setOverhang(String(settings.frontOverhang));setBridge(String(settings.bridgeGap));setError('');},[settings.frontOverhang,settings.bridgeGap]);
  const material=WORKTOPS.find(m=>m.id===project.finishes.worktop)!;
  return <div className="panel-scroll construction-editor"><button className="construction-back" onClick={onBack}><ArrowLeft size={17}/>К добавлению шкафов</button>
    <div className="construction-intro"><span className="construction-icon"><Ruler size={24}/></span><h2>Столешница по форме кухни</h2><p>Поверхность автоматически соединяется над нижними шкафами, включая угловой модуль. После перестановки форма обновляется.</p></div>
    <dl className="construction-summary"><div><dt>Связных поверхностей</dt><dd data-testid="worktop-count">{layout.surfaces.length}</dd></div><div><dt>Площадь с учётом вырезов</dt><dd>{(layout.area/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})} м²</dd></div><div><dt>Толщина</dt><dd>{worktopThickness(project)} мм</dd></div><div><dt>Мойки и варочные панели</dt><dd>{layout.cutouts.length}</dd></div></dl>
    <button className="construction-material" onClick={onMaterial}><span style={{background:material.color}}/><span><strong>{material.name}</strong><small>Выбрать материал столешницы</small></span><span>→</span></button>
    <form className="construction-form" onSubmit={e=>{e.preventDefault();const frontOverhang=Number(overhang),bridgeGap=Number(bridge);if(!overhang.trim()||!bridge.trim()||!Number.isInteger(frontOverhang)||frontOverhang<0||frontOverhang>60||!Number.isInteger(bridgeGap)||bridgeGap<0||bridgeGap>100){setError('Свес: от 0 до 60 мм. Перекрытие зазоров: от 0 до 100 мм. Введите целые числа.');return;}onChange({frontOverhang,bridgeGap});setError('');}}>
      <label className="assembly-measure"><span>Свес перед фасадами</span><div><input aria-label="Свес столешницы" inputMode="numeric" value={overhang} onChange={e=>setOverhang(e.target.value)}/><span>мм</span></div></label>
      <label className="assembly-measure"><span>Перекрывать промежутки до</span><div><input aria-label="Максимальный зазор под столешницей" inputMode="numeric" value={bridge} onChange={e=>setBridge(e.target.value)}/><span>мм</span></div></label>
      <p className="construction-note">При значении 0 соединяются только соприкасающиеся шкафы. У стен свес ограничен размером комнаты. Высокие пеналы отделяют поверхности.</p>
      {error&&<p className="assembly-error" role="alert">{error}</p>}<button className="assembly-apply" type="submit">Применить столешницу<Check size={17}/></button>
    </form>
    <FillerSuggestions project={project} onAdd={onAdd}/>
    <div className="construction-detail-note"><span style={{background:FRONTS.find(m=>m.id===project.finishes.lower)!.color}}/><p>В 3D уточнены угловой шкаф, корпуса, полки и мойка с чашей. Вырезы показаны для визуализации; размеры конкретной техники и монтажные стыки потребуют уточнения.</p></div>
  </div>;
}
