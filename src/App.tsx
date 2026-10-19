import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Ruler, Armchair, ArrowDownToLine, ArrowLeft, ArrowRight, Box, Check, ChevronDown, ChevronRight, CircleHelp, Columns3, Copy, DoorOpen, Download, Expand, FolderOpen, Grid2X2, Layers3, LayoutDashboard, Maximize2, Minus, MousePointer2, Move, Palette, Plus, Redo2, RotateCcw, RotateCw, Save, Search, Settings2, Sparkles, Square, Trash2, Undo2, Upload, X, TriangleAlert, CheckCheck } from 'lucide-react';
import Scene from './Scene';
import { OpeningAuditPanel, OpeningControls } from './OpeningControls';
import { auditOpenings, frontAssemblies, previewConflicts } from './openings';
import type { OpeningPreview, OpeningPreviews } from './openings';
import RoomEditor from './RoomEditor';
import ConstructionEditor, { FillerSuggestions } from './ConstructionEditor';
import PlacementEditor, { AssemblyOptions } from './PlacementEditor';
import { RoomOverview } from './RoomDrawing';
import { WALLS, roomFloorArea } from './room';
import type { RoomSelection } from './room';
import ProjectSetup, { STEPS, StepNavigation, SheetHandle, guideSeen, markGuideSeen } from './Journey';
import type { KitchenLayout, Room } from './model';
import Plan, { Elevation, ModuleGlyph } from './Plan';
import { FRONTS, MODULES, PALETTES, STORAGE_KEY, VARIANTS_KEY, WORKTOPS, cabinetIssues, cabinetWall, createKitchen, isFiller, findPlacement, issues, parseProject, resizeCabinet, starter, typeOf, uid } from './model';
import type { Cabinet, Category, Finishes, Kind, Material, Project, View, Wall } from './model';

type Panel = 'modules' | 'room' | 'materials' | 'variants';
interface Variant { id: string; name: string; project: Project; }
function initialProject() { try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) return parseProject(JSON.parse(raw)); } catch { /* An unavailable or old cache must not prevent opening the planner. */ } return starter(); }
function initialVariants(): Variant[] {try{const raw=JSON.parse(localStorage.getItem(VARIANTS_KEY)||'[]');if(!Array.isArray(raw))return [];return raw.slice(0,8).map(v=>({id:String(v.id),name:String(v.name).slice(0,50),project:parseProject(v.project)}));}catch{return [];}}

const ASSEMBLY_KEY='kitchen-planner:assembly:v1';
function initialAssembly(){
  const fallback={gap:0,step:10,snapping:true,minPassage:900};
  try{const p=JSON.parse(localStorage.getItem(ASSEMBLY_KEY)||'null');if(p&&Number.isInteger(p.gap)&&p.gap>=0&&p.gap<=100&&[1,10,50].includes(p.step)&&typeof p.snapping==='boolean'&&[800,900,1000,1100,1200].includes(p.minPassage))return p as typeof fallback;}catch{/* Use defaults if settings are unavailable. */}return fallback;
}

export default function App() {
  const [history,setHistory]=useState<{past:Project[];present:Project;future:Project[]}>(()=>({past:[],present:initialProject(),future:[]}));
  const project=history.present;
  const projectRef=useRef(project);projectRef.current=project;
  const commit=useCallback((next:Project)=>setHistory(h=>JSON.stringify(next)===JSON.stringify(h.present)?h:{past:[...h.past.slice(-39),h.present],present:next,future:[]}),[]);
  const [panel,setPanel]=useState<Panel>('room');
  const [category,setCategory]=useState<Category>('base');
  const [constructionOpen,setConstructionOpen]=useState(false);
  const [openingPanel,setOpeningPanel]=useState(false);
  const [openingPreviews,setOpeningPreviews]=useState<OpeningPreviews>({});
  const [showOpeningZones,setShowOpeningZones]=useState(false);
  const [query,setQuery]=useState('');
  const [view,setView]=useState<View>('plan');
  const [wall,setWall]=useState<Wall>('A');
  const [roomSelection,setRoomSelection]=useState<RoomSelection>({kind:'wall',wall:'A'});
  const [selected,setSelected]=useState<string|null>(null);
  const [layer,setLayer]=useState<'base'|'wall'>('base');
  const [showGrid,setShowGrid]=useState(false);
  const [snapping,setSnapping]=useState(()=>initialAssembly().snapping);
  const [moveStep,setMoveStep]=useState(()=>initialAssembly().step);
  const [moduleGap,setModuleGap]=useState(()=>initialAssembly().gap);
  const [minPassage,setMinPassage]=useState(()=>initialAssembly().minPassage);
  const [resetKey,setResetKey]=useState(0);
  const [materialTarget,setMaterialTarget]=useState<'lower'|'upper'|'worktop'>('lower');
  const [toast,setToast]=useState('');
  const [help,setHelp]=useState(false);
  const [variants,setVariants]=useState<Variant[]>(initialVariants);
  const [storageOk,setStorageOk]=useState(true);
  const [mobilePanel,setMobilePanel]=useState(false);
  const [showProperties,setShowProperties]=useState(false);
  const [variantName,setVariantName]=useState('');
  const [setupOpen,setSetupOpen]=useState(()=>!guideSeen());
  const [hadProject]=useState(()=>{try{return !!localStorage.getItem(STORAGE_KEY);}catch{return false;}});
  const [isMobile,setIsMobile]=useState(()=>window.matchMedia('(max-width: 800px)').matches);
  const [sheetExpanded,setSheetExpanded]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [cameraMode,setCameraMode]=useState<'kitchen'|'room'|'selected'>('room');
  const [zoom,setZoom]=useState(1);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const motionIssues=useMemo(()=>auditOpenings(project),[project]);
  const currentMotionIssues=useMemo(()=>previewConflicts(project,openingPreviews),[project,openingPreviews]);
  const problems=[...issues(project,minPassage),...motionIssues];
  const selectedCabinet=project.cabinets.find(c=>c.id===selected);
  const selectedType=selectedCabinet?typeOf(selectedCabinet.kind):null;
  const totalLength=project.cabinets.filter(c=>typeOf(c.kind).category!=='wall').reduce((sum,c)=>sum+c.width,0);
  const stepIndex=STEPS.findIndex(step=>step.id===panel);
  const step=STEPS[stepIndex];

  const notify=(message:string)=>setToast(message);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(project));setStorageOk(true);}catch{setStorageOk(false);}},[project]);
  useEffect(()=>{try{localStorage.setItem(ASSEMBLY_KEY,JSON.stringify({gap:moduleGap,step:moveStep,snapping,minPassage}));}catch{/* Project coordinates remain saved separately. */}},[moduleGap,moveStep,snapping,minPassage]);
  useEffect(()=>{try{localStorage.setItem(VARIANTS_KEY,JSON.stringify(variants));}catch{setToast('Не удалось сохранить варианты. Скачайте файл проекта.');}},[variants]);
  useEffect(()=>{if(selected&&!project.cabinets.some(c=>c.id===selected))setSelected(null);},[project,selected]);
  useEffect(()=>{const media=window.matchMedia('(max-width: 800px)');const update=()=>setIsMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);

  const undo=()=>setHistory(h=>h.past.length?{past:h.past.slice(0,-1),present:h.past[h.past.length-1],future:[h.present,...h.future]}:h);
  const redo=()=>setHistory(h=>h.future.length?{past:[...h.past,h.present],present:h.future[0],future:h.future.slice(1)}:h);
  const updateCabinet=(c:Cabinet)=>commit({...projectRef.current,cabinets:projectRef.current.cabinets.map(old=>old.id===c.id?c:old)});
  function applyPlacement(c:Cabinet){
    const error=cabinetIssues(c,projectRef.current).find(i=>i.severity==='error');
    if(error)throw new Error(error.message);
    updateCabinet(c);
  }
  function moveCabinet(c:Cabinet){try{applyPlacement(c);return true;}catch(err){notify((err as Error).message);return false;}}
  const removeCabinet=(id:string)=>{commit({...project,cabinets:project.cabinets.filter(c=>c.id!==id)});setSelected(null);};
  const selectCabinet=(id:string|null)=>{setSelected(id);if(id)setRoomSelection(null);const c=project.cabinets.find(c=>c.id===id);if(c)setLayer(typeOf(c.kind).category==='wall'?'wall':'base');};
  const updateFinishes=(patch:Partial<Finishes>)=>{
    const {lower,upper,worktop,handle,floor,wall}={...project.finishes,...patch};
    commit({...project,finishes:{lower,upper,worktop,handle,floor,wall}});
  };

  useEffect(()=>{
    const listener=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement;if(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName))return;
      if(e.key==='Escape'){setHelp(false);setSelected(null);setMobilePanel(false);setShowProperties(false);setMenuOpen(false);}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
      if(help||setupOpen)return;
      const c=project.cabinets.find(c=>c.id===selected);if(!c)return;
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeCabinet(c.id);}
      const step=e.shiftKey?moveStep*10:moveStep;
      const delta:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
      if(delta[e.key]){e.preventDefault();const [dx,dz]=delta[e.key];moveCabinet({...c,x:c.x+dx,z:c.z+dz});}
    };
    window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);
  });

  function previewCabinet(id:string,next:OpeningPreview){setOpeningPreviews(state=>({...state,[id]:next}));}
  function toggleOpening(c:Cabinet){if(!frontAssemblies(c).length)return;previewCabinet(c.id,{target:'all',progress:openingPreviews[c.id]?.progress?0:100});}
  function inspectOpening(){setMobilePanel(false);setShowProperties(false);setView('3d');setCameraMode('selected');setZoom(1);setResetKey(k=>k+1);}
  function showOpeningAudit(){setPanel('modules');setConstructionOpen(false);setOpeningPanel(true);setMobilePanel(true);setShowProperties(false);setSheetExpanded(false);}
  function addModule(kind:Kind,width:number) {
    if(project.cabinets.length>=150){notify('В проекте может быть до 150 модулей.');return;}
    let chosenWall=wall;
    let c=findPlacement(kind,width,project,wall,moduleGap);
    if(!c)for(const nextWall of WALLS.filter(w=>w!==wall)){c=findPlacement(kind,width,project,nextWall,moduleGap);if(c){chosenWall=nextWall;break;}}
    if(!c){notify('Для этого шкафа нет места вдоль стен комнаты. Попробуйте меньшую ширину или уберите другой модуль.');return;}
    commit({...project,cabinets:[...project.cabinets,c]});setSelected(c.id);setWall(chosenWall);setLayer(typeOf(kind).category==='wall'?'wall':'base');
    if(isMobile){setMobilePanel(false);setShowProperties(false);}
    setCameraMode('kitchen');setZoom(1);notify(`${typeOf(kind).name} добавлен · стена ${chosenWall}`);
  }
  function addFiller(c:Cabinet){
    const p=projectRef.current;if(p.cabinets.length>=150){notify('В проекте может быть до 150 модулей.');return;}
    const error=cabinetIssues(c,p).find(i=>i.severity==='error');if(error){notify(error.message);return;}
    commit({...p,cabinets:[...p.cabinets,c]});setSelected(c.id);setLayer(typeOf(c.kind).category==='wall'?'wall':'base');
    if(isMobile){setMobilePanel(false);setShowProperties(false);}notify(`Добавлен добор ${c.width} мм`);
  }
  function duplicate() {
    if(!selectedCabinet)return;const c=findPlacement(selectedCabinet.kind,selectedCabinet.width,project,cabinetWall(selectedCabinet),moduleGap);
    if(!c){notify('Для копии пока нет свободного места у выбранной стены.');return;}
    const copy={...c,front:selectedCabinet.front,hinge:selectedCabinet.hinge};commit({...project,cabinets:[...project.cabinets,copy]});setSelected(copy.id);
  }
  function download(blob:Blob,filename:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportProject(){download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),'my-kitchen.json');notify('Файл проекта сохранён. Его можно открыть в планировщике.');}
  async function importProject(file?:File){if(!file)return;try{if(file.size>2_000_000)throw new Error('Файл слишком большой: максимум 2 МБ');const p=parseProject(JSON.parse(await file.text()));commit(p);setSelected(null);notify('Проект открыт');}catch(e){notify(e instanceof Error?e.message:'Не удалось открыть проект');}finally{if(fileRef.current)fileRef.current.value='';}}
  function snapshot(){
    if(view==='3d'){
      if(!canvasRef.current){notify('Выберите план 2D, чтобы сохранить изображение.');return;}
      canvasRef.current.toBlob(blob=>{if(blob){download(blob,'my-kitchen-3d.png');notify('3D-изображение сохранено');}});
    } else {
      const svg=document.querySelector('.plan-svg')?.cloneNode(true) as SVGSVGElement|undefined;if(!svg)return;
      const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='text{font-family:Arial,sans-serif;text-anchor:middle;fill:#414b3b}.plan-size{font-size:70px;font-weight:600}.plan-wall,.plan-label{font-size:65px}.plan-dimension{font-size:78px}.plan-area{font-size:80px;text-anchor:start}';svg.prepend(style);
      svg.setAttribute('xmlns','http://www.w3.org/2000/svg');download(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}),`my-kitchen-${view}.svg`);notify('План сохранён в SVG');
    }
  }
  function saveVariant(){if(variants.length>=8){notify('Можно сохранить до 8 вариантов. Удалите один из старых.');return;}const name=variantName.trim()||`Вариант ${variants.length+1}`;setVariants(v=>[...v,{id:uid(),name,project:structuredClone(project)}]);setVariantName('');notify(`«${name}» сохранён в этом браузере`);}
  function selectRoom(selection:RoomSelection){
    setRoomSelection(selection);setOpeningPreviews({});setShowOpeningZones(false);setSelected(null);setPanel('room');setShowProperties(false);setMobilePanel(true);setSheetExpanded(false);setCameraMode('room');
    if(selection?.kind==='wall')setWall(selection.wall);
    if(selection?.kind==='opening'){const o=project.room.openings.find(o=>o.id===selection.id);if(o)setWall(o.wall);}
    if(selection?.kind==='object'){const o=project.room.objects?.find(o=>o.id===selection.id);if(o)setWall(o.wall);}
  }
  const currentMaterial=(materialTarget==='worktop'?WORKTOPS:FRONTS).find(m=>m.id===project.finishes[materialTarget])!;
  const palette=PALETTES.find(p=>p.lower===project.finishes.lower&&p.upper===project.finishes.upper&&p.worktop===project.finishes.worktop);
  function nav(next:Panel,open=true){setOpeningPanel(false);if(next==='room'){setOpeningPreviews({});setShowOpeningZones(false);}setConstructionOpen(false);if(next==='room'&&!roomSelection)setRoomSelection({kind:'wall',wall:'A'});setPanel(next);setMobilePanel(open);setShowProperties(false);setSelected(null);setSheetExpanded(false);setZoom(1);setCameraMode(next==='room'?'room':'kitchen');if(next==='room')setView('plan');if(next==='materials'||next==='variants')setView('3d');}
  function advance(){if(panel==='modules'&&!project.cabinets.length){notify('Добавьте хотя бы один шкаф, чтобы выбрать отделку.');setMobilePanel(true);return;}if(stepIndex<3)nav(STEPS[stepIndex+1].id,false);else setMobilePanel(false);}
  function continueProject(){markGuideSeen();setSetupOpen(false);setMenuOpen(false);}
  function startProject(room:Room,layout:KitchenLayout){commit(createKitchen(room,layout));continueProject();nav('room',false);setView('plan');setRoomSelection({kind:'wall',wall:'A'});setWall('A');setResetKey(k=>k+1);}
  if(setupOpen)return <ProjectSetup room={project.room} hasProject={hadProject||guideSeen()||history.past.length>0} onContinue={continueProject} onClose={continueProject} onExample={()=>{commit(starter());continueProject();nav('modules',false);}} onCreate={startProject}/>;

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" aria-label="Кухня — планировщик" onClick={e=>{e.preventDefault();setSelected(null);}}><span className="brand-mark">к</span><span>кухня<span className="brand-dot">.</span><small>ПЛАНИРОВЩИК ПРОСТРАНСТВА</small></span></a>
      <div className="project-identity"><span className="breadcrumb">Личное пространство <ChevronRight size={13}/></span><input aria-label="Название проекта" value={project.name} maxLength={100} onChange={e=>commit({...project,name:e.target.value})}/><span className={`save-status ${storageOk?'':'storage-error'}`}><span/>{storageOk?'Сохранено в браузере':'Скачайте файл проекта'}</span></div>
      <div className="header-actions"><button className="button new-project-button" onClick={()=>setSetupOpen(true)}><Plus size={16}/>Новая кухня</button><div className="history-buttons"><IconButton label="Отменить (Ctrl+Z)" disabled={!history.past.length} onClick={undo}><Undo2 size={17}/></IconButton><IconButton label="Повторить (Ctrl+Shift+Z)" disabled={!history.future.length} onClick={redo}><Redo2 size={17}/></IconButton></div><button className="button import-button" onClick={()=>fileRef.current?.click()}><FolderOpen size={16}/><span>Открыть</span></button><button className="button export-button" onClick={exportProject}><ArrowDownToLine size={16}/><span>Файл проекта</span></button><button className="button primary" onClick={snapshot}><Download size={16}/><span>Снимок</span></button></div>
      <button className="mobile-menu-button icon-button" aria-label="Меню проекта" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><MoreHorizontal size={25}/></button>
      {menuOpen&&<><button className="menu-screen" aria-label="Закрыть меню" onClick={()=>setMenuOpen(false)}/><div className="project-menu" role="menu"><button role="menuitem" onClick={()=>{setMenuOpen(false);setSetupOpen(true);}}><Plus size={19}/>Новая кухня</button><button role="menuitem" onClick={()=>{setMenuOpen(false);fileRef.current?.click();}}><FolderOpen size={19}/>Открыть файл проекта</button><button role="menuitem" onClick={()=>{setMenuOpen(false);exportProject();}}><Save size={19}/>Скачать проект</button><button role="menuitem" onClick={()=>{setMenuOpen(false);snapshot();}}><Download size={19}/>Сохранить изображение</button><button role="menuitem" onClick={()=>{setMenuOpen(false);setHelp(true);}}><CircleHelp size={19}/>Как пользоваться</button></div></>}
      <input type="file" ref={fileRef} accept=".json,application/json" className="visually-hidden" onChange={e=>void importProject(e.target.files?.[0])}/>
    </header>
    <StepNavigation current={panel} onChange={next=>nav(next)}/>

    <div className="workspace">
      <nav className="nav-rail" aria-label="Инструменты планировщика">
        <div className="nav-group"><NavButton icon={<Box size={22}/>} label="Модули" active={panel==='modules'} onClick={()=>nav('modules')}/><NavButton icon={<Square size={22}/>} label="Комната" active={panel==='room'} onClick={()=>nav('room')}/><NavButton icon={<Palette size={22}/>} label="Материалы" active={panel==='materials'} onClick={()=>nav('materials')}/><NavButton icon={<Layers3 size={22}/>} label="Варианты" active={panel==='variants'} onClick={()=>nav('variants')}/></div>
        <button className="help-nav" onClick={()=>setHelp(true)} aria-label="Как пользоваться"><CircleHelp size={21}/><span>Помощь</span></button>
      </nav>

      <aside className={`library-panel ${mobilePanel?'mobile-open':''} ${sheetExpanded?'sheet-expanded':''}`} aria-label="Каталог и настройки">
        <SheetHandle expanded={sheetExpanded} onExpand={()=>setSheetExpanded(v=>!v)} onClose={()=>setMobilePanel(false)}/>
        <div className="panel-heading"><div><span className="eyebrow">ШАГ {stepIndex+1} ИЗ 4</span><h1>{panel==='modules'&&openingPanel?'Открывание мебели':panel==='modules'&&constructionOpen?'Столешница и доборы':{modules:'Добавить шкаф',room:'Ваша комната',materials:'Выбрать отделку',variants:'Сохранить результат'}[panel]}</h1></div><button className="mobile-close icon-button" aria-label="Закрыть панель" onClick={()=>setMobilePanel(false)}><X size={18}/></button></div>
        {panel==='modules'&&!constructionOpen&&!openingPanel&&<>
          <p className="panel-description">Выберите стену и размер. Шкаф займёт свободное место с учётом проёмов и заданного зазора.</p>
          <div className="placement-picker"><span>Добавлять к стене</span><div>{WALLS.map(w=><button key={w} className={wall===w?'active':''} aria-pressed={wall===w} onClick={()=>setWall(w)}>Стена {w}{wall===w&&<Check size={15}/>}</button>)}</div></div>
          <AssemblyOptions gap={moduleGap} onGap={setModuleGap} snapping={snapping} onSnapping={setSnapping} step={moveStep} onStep={setMoveStep} minPassage={minPassage} onMinPassage={setMinPassage}/>
          <div className="assembly-detail-buttons"><button className="construction-open" onClick={()=>setConstructionOpen(true)}><Ruler size={17}/><span>Столешница и доборы</span></button><button className="construction-open" onClick={showOpeningAudit}><DoorOpen size={17}/><span>Проверить открывание</span></button></div>
          <div className="search-field"><Search size={16}/><input aria-label="Найти модуль" placeholder="Найти модуль" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={14}/></button>}</div>
          <div className="category-tabs" role="tablist" aria-label="Категории модулей">{([['base','Нижние'],['wall','Верхние'],['tall','Пеналы']] as const).map(([id,name])=><button key={id} role="tab" aria-selected={category===id} className={category===id?'active':''} onClick={()=>{setCategory(id);setLayer(id==='wall'?'wall':'base');}}>{name}</button>)}</div>
          <div className="catalog-meta"><span>{category==='base'?'Напольные модули':category==='wall'?'Навесные модули':'Высокие модули'}</span><span>{MODULES.filter(m=>m.category===category&&m.name.toLowerCase().includes(query.toLowerCase())).length} типов</span></div>
          <div className="module-list">{MODULES.filter(m=>m.category===category&&m.name.toLowerCase().includes(query.toLowerCase())).map(m=><ModuleCard key={m.kind} module={m} onAdd={width=>addModule(m.kind,width)}/>)}{!MODULES.some(m=>m.category===category&&m.name.toLowerCase().includes(query.toLowerCase()))&&<div className="empty-search"><Search size={25}/><p>Такого модуля пока нет.<br/>Попробуйте другое название.</p></div>}</div>
          <div className="library-note"><MousePointer2 size={17}/><p>Нажмите <strong>+</strong> для добавления.<br/>Перемещайте модули на плане 2D.</p></div>
        </>}
        {panel==='modules'&&constructionOpen&&<ConstructionEditor project={project} onBack={()=>setConstructionOpen(false)} onAdd={addFiller} onChange={settings=>{commit({...project,construction:settings});notify('Столешница обновлена');}} onMaterial={()=>{setMaterialTarget('worktop');nav('materials');}}/>}
        {panel==='modules'&&openingPanel&&<OpeningAuditPanel project={project} issues={[...motionIssues,...currentMotionIssues]} previews={openingPreviews} onOpenAll={()=>{setOpeningPreviews(Object.fromEntries(project.cabinets.filter(c=>frontAssemblies(c).length).map(c=>[c.id,{target:'all',progress:100}])));setMobilePanel(false);}} onCloseAll={()=>setOpeningPreviews({})} showZones={showOpeningZones} onZones={()=>{setShowOpeningZones(v=>!v);setView('plan');setMobilePanel(false);}} onSelect={id=>{selectCabinet(id);setMobilePanel(false);setShowProperties(true);}} onBack={()=>setOpeningPanel(false)}/>}
        {panel==='room'&&<RoomEditor room={project.room} selection={roomSelection} onSelect={selectRoom} onChange={room=>{commit({...project,room});notify('Параметры комнаты сохранены');}} onInspect={()=>setMobilePanel(false)}/>}
        {panel==='materials'&&<div className="panel-scroll materials-editor"><p className="panel-description">Попробуйте готовое сочетание или выберите каждую поверхность отдельно.</p><div className="palette-list">{PALETTES.map(p=><button key={p.name} className={`palette-card ${palette?.name===p.name?'active':''}`} onClick={()=>updateFinishes(p)}><span className="palette-colors">{[p.lower,p.upper].map((id,i)=><i key={i} style={{background:FRONTS.find(m=>m.id===id)!.color}}/>)}<i style={{background:WORKTOPS.find(m=>m.id===p.worktop)!.color}}/></span><span>{p.name}</span>{palette?.name===p.name&&<Check size={15}/>}</button>)}</div><div className="section-rule"/><h3>Поверхность</h3><div className="surface-selector">{([['lower','Нижние фасады'],['upper','Верхние фасады'],['worktop','Столешница']] as const).map(([id,label])=><button key={id} className={materialTarget===id?'active':''} onClick={()=>setMaterialTarget(id)}>{label}<ChevronRight size={14}/></button>)}</div><div className="material-grid">{(materialTarget==='worktop'?WORKTOPS:FRONTS).map(m=><button key={m.id} className={`material-tile ${project.finishes[materialTarget]===m.id?'active':''}`} onClick={()=>updateFinishes({[materialTarget]:m.id})}><MaterialSwatch material={m}/><span>{m.name}</span>{project.finishes[materialTarget]===m.id&&<Check size={13}/>}</button>)}</div><div className="material-info"><strong>{currentMaterial.name}</strong><span>{currentMaterial.family}</span><span>{currentMaterial.surface}</span><p>{currentMaterial.note}</p><small>Палитра для визуализации. Наличие и точная цена у поставщиков пока не подключены.</small></div><div className="section-rule"/><h3>Ручки</h3><div className="segmented">{([['brass','Латунь'],['black','Чёрные'],['none','Без ручек']] as const).map(([id,label])=><button key={id} className={project.finishes.handle===id?'active':''} onClick={()=>updateFinishes({handle:id})}>{label}</button>)}</div><h3>Пол</h3><div className="segmented"><button className={project.finishes.floor==='oak'?'active':''} onClick={()=>updateFinishes({floor:'oak'})}>Дуб</button><button className={project.finishes.floor==='stone'?'active':''} onClick={()=>updateFinishes({floor:'stone'})}>Камень</button></div><h3>Стены</h3><div className="segmented">{([['cream','Молочные'],['white','Белые'],['sand','Песочные']] as const).map(([id,label])=><button key={id} className={project.finishes.wall===id?'active':''} onClick={()=>updateFinishes({wall:id})}>{label}</button>)}</div></div>}
        {panel==='variants'&&<div className="panel-scroll variants-editor"><div className="result-summary"><span className="result-check"><Check size={24}/></span><h2>Ваша кухня готова к просмотру</h2><p>{project.cabinets.length} модулей · {(project.room.width/1000).toLocaleString('ru-RU')} × {(project.room.depth/1000).toLocaleString('ru-RU')} м</p><button className="journey-primary" onClick={exportProject}><Save size={18}/>Скачать проект</button><button className="journey-secondary" onClick={snapshot}><Download size={18}/>Сохранить изображение</button>{problems.length>0&&<button className="result-issues" onClick={()=>{setMobilePanel(false);setShowProperties(true);}}><TriangleAlert size={17}/>Проверьте замечания: {problems.length}</button>}<small>Файл проекта можно открыть здесь и продолжить редактирование. Изображением удобно поделиться.</small></div><p className="panel-description">Сохраните расстановку и материалы, чтобы вернуться к ним и сравнить решения.</p><label className="text-field-label">Название варианта<input className="text-field" value={variantName} maxLength={50} placeholder={`Вариант ${variants.length+1}`} onChange={e=>setVariantName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveVariant();}}/></label><button className="button primary full-width" onClick={saveVariant}><Plus size={16}/>Сохранить вариант</button><div className="variants-list">{variants.length===0?<div className="empty-state"><Layers3 size={32}/><h3>Место для ваших идей</h3><p>Сохраните первый вариант кухни.<br/>Он останется в этом браузере.</p></div>:variants.map((v,i)=><div className="variant-card" key={v.id}><div className="variant-preview" style={{background:FRONTS.find(m=>m.id===v.project.finishes.lower)!.color}}><ModuleGlyph kind="drawers" color={FRONTS.find(m=>m.id===v.project.finishes.upper)!.color}/><span>0{i+1}</span></div><div><strong>{v.name}</strong><small>{v.project.cabinets.length} модулей · {v.project.room.width} × {v.project.room.depth}</small><button className="text-button" onClick={()=>{commit(structuredClone(v.project));setSelected(null);notify(`Открыт «${v.name}». Предыдущий вариант доступен через отмену.`);}}>Открыть вариант <ArrowRight size={13}/></button></div><IconButton label={`Удалить вариант ${v.name}`} onClick={()=>setVariants(vs=>vs.filter(x=>x.id!==v.id))}><Trash2 size={15}/></IconButton></div>)}</div><p className="field-hint">До 8 вариантов в браузере. Скачайте файл проекта, чтобы перенести его на другое устройство.</p></div>}
        <div className="sheet-footer"><button className="journey-primary" onClick={()=>{if(panel==='materials')advance();else setMobilePanel(false);}}>{panel==='room'?'Смотреть комнату':panel==='materials'?'Посмотреть результат':panel==='modules'?'Смотреть кухню':'Готово'}<ArrowRight size={18}/></button></div>
      </aside>

      <main className="studio" aria-label="Рабочая область">
        <div className="studio-topbar"><div className="view-tabs" role="tablist" aria-label="Вид проекта"><button role="tab" aria-selected={view==='plan'} className={view==='plan'?'active':''} onClick={()=>setView('plan')}><LayoutDashboard size={15}/>План 2D</button><button role="tab" aria-selected={view==='3d'} className={view==='3d'?'active':''} onClick={()=>setView('3d')}><Box size={16}/>Объём 3D</button><button role="tab" aria-selected={view==='elevation'} className={view==='elevation'?'active':''} onClick={()=>setView('elevation')}><Columns3 size={15}/>Стены</button></div><div className="scene-tools"><span className="scale-label">{view==='3d'?'ПЕРСПЕКТИВА':view==='plan'?'ВИД СВЕРХУ':`СТЕНА ${wall}`}</span><IconButton label="Сбросить положение камеры" onClick={()=>{setZoom(1);setCameraMode('kitchen');setResetKey(k=>k+1);notify('Кухня показана целиком');}}><Expand size={17}/></IconButton><IconButton label="Как пользоваться" onClick={()=>setHelp(true)}><CircleHelp size={17}/></IconButton></div></div>
        <div className={`scene-area ${selected?'has-selection':''}`}>
          <div className="journey-caption"><span>ШАГ {stepIndex+1} ИЗ 4</span><h2>{panel==='modules'&&!project.cabinets.length?'Добавьте первый шкаф':step.title}</h2><p>{step.hint}</p></div>
          {view==='3d'?<Scene project={project} selected={selected} onSelect={selectCabinet} resetKey={resetKey} cameraMode={cameraMode} zoom={zoom} roomSelection={panel==='room'?roomSelection:null} onSelectRoom={selectRoom} openingPreviews={openingPreviews} openingConflicts={currentMotionIssues} onReady={canvas=>{canvasRef.current=canvas;}}/>:view==='plan'?<Plan project={project} selected={selected} onSelect={selectCabinet} onMove={moveCabinet} snapOptions={{enabled:snapping,grid:moveStep,gap:moduleGap}} minPassage={minPassage} openingPreviews={openingPreviews} openingIssues={[...motionIssues,...currentMotionIssues]} showOpeningZones={showOpeningZones} layer={layer} showGrid={showGrid} zoom={zoom} focus={cameraMode==='selected'?selected:null} roomMode={panel==='room'} roomSelection={panel==='room'?roomSelection:null} onSelectRoom={selectRoom}/>:<Elevation project={project} wall={wall} selected={selected} onSelect={selectCabinet} roomSelection={panel==='room'?roomSelection:null} onSelectRoom={panel==='room'?selectRoom:undefined}/>}
          {view==='3d'&&panel==='room'&&<p className="room-view-note">Ближние стены скрыты для обзора. Вращайте комнату, чтобы увидеть остальные.</p>}
          <div className="scene-title"><span className="eyebrow">ВАШЕ ПРОСТРАНСТВО</span><h2>{project.name||'Моя кухня'}<span>01</span></h2><p>{(project.room.width/1000).toLocaleString('ru-RU')} × {(project.room.depth/1000).toLocaleString('ru-RU')} м <i/> {(roomFloorArea(project.room)/1e6).toLocaleString('ru-RU',{maximumFractionDigits:1})} м²</p></div>
          <div className="scene-top-right"><span className="prototype-badge"><span/>Ранняя версия</span><button className="properties-toggle button" onClick={()=>setShowProperties(v=>!v)}><Settings2 size={16}/>Параметры</button></div>
          {view==='plan'&&panel!=='room'&&<div className="plan-layer-controls"><div className="segmented"><button className={layer==='base'?'active':''} onClick={()=>setLayer('base')}>Нижний ярус</button><button className={layer==='wall'?'active':''} onClick={()=>setLayer('wall')}>Верхний ярус</button></div><button className={`icon-button ${showGrid?'active':''}`} aria-label="Показать сетку" aria-pressed={showGrid} onClick={()=>setShowGrid(v=>!v)}><Grid2X2 size={17}/></button></div>}
          {view==='elevation'&&<div className="plan-layer-controls"><div className="segmented">{WALLS.map(w=><button key={w} className={wall===w?'active':''} onClick={()=>setWall(w)}>Стена {w}</button>)}</div></div>}
          <div className="scene-hint">{view==='3d'?<><RotateCcw size={15}/><span>Вращайте, чтобы рассмотреть <i/> Колёсико — масштаб</span></>:view==='plan'?<><Move size={15}/><span>{panel==='room'?'Нажмите стену, дверь или окно':'Перетаскивайте шкафы · точные размеры в настройках'}</span></>:<><MousePointer2 size={15}/><span>Выберите модуль для настройки</span></>}</div>
          {selectedCabinet&&<div className="selection-toolbar"><span>{selectedType!.name}</span><IconButton label="Повернуть модуль" onClick={()=>moveCabinet({...selectedCabinet,rotation:(selectedCabinet.rotation+90)%360})}><RotateCw size={16}/></IconButton><IconButton label="Дублировать модуль" onClick={duplicate}><Copy size={16}/></IconButton><IconButton label="Удалить модуль" onClick={()=>removeCabinet(selectedCabinet.id)}><Trash2 size={16}/></IconButton><IconButton label="Снять выделение" onClick={()=>setSelected(null)}><X size={15}/></IconButton></div>}
          <div className="camera-controls"><div className="zoom-buttons"><button aria-label="Увеличить" onClick={()=>setZoom(z=>Math.min(2.5,z+.2))}><Plus size={20}/></button><button aria-label="Уменьшить" onClick={()=>setZoom(z=>Math.max(.6,z-.2))}><Minus size={20}/></button></div><button className="camera-fit" onClick={()=>{setCameraMode(cameraMode==='room'?'kitchen':'room');setZoom(1);setResetKey(k=>k+1);}}><Expand size={17}/>{cameraMode==='room'?'Кухня крупно':'Вся комната'}</button></div>
          {selectedCabinet&&<div className="mobile-selection"><div><span><strong>{selectedType!.name}</strong><small>{selectedCabinet.width} мм · выбранный модуль</small></span><button aria-label="Снять выделение шкафа" onClick={()=>setSelected(null)}><X size={20}/></button></div><div><button onClick={()=>{setMobilePanel(false);setShowProperties(true);setSheetExpanded(false);}}><Settings2 size={17}/>Настроить</button>{frontAssemblies(selectedCabinet).length>0?<button onClick={()=>toggleOpening(selectedCabinet)}><DoorOpen size={17}/>{openingPreviews[selectedCabinet.id]?.progress?'Закрыть':'Открыть'}</button>:<button onClick={()=>moveCabinet({...selectedCabinet,rotation:(selectedCabinet.rotation+90)%360})}><RotateCw size={17}/>Повернуть</button>}<button onClick={()=>{setCameraMode('selected');setZoom(1);setResetKey(k=>k+1);}}><Maximize2 size={17}/>Крупнее</button></div></div>}
        </div>
        <div className="finish-bar"><div className="finish-heading"><Palette size={19}/><div><strong>Какой будет ваша кухня?</strong><span>Попробуйте другое сочетание материалов</span></div></div><div className="quick-palettes">{PALETTES.map(p=><button key={p.name} className={`quick-palette ${palette?.name===p.name?'active':''}`} title={p.name} aria-label={`Применить сочетание ${p.name}`} aria-pressed={palette?.name===p.name} onClick={()=>updateFinishes(p)}><span><i style={{background:FRONTS.find(m=>m.id===p.lower)!.color}}/><i style={{background:FRONTS.find(m=>m.id===p.upper)!.color}}/></span>{palette?.name===p.name&&<Check size={12}/>}</button>)}</div><button className="materials-link" onClick={()=>nav('materials')}>Все материалы <ArrowRight size={15}/></button></div>
        <footer className="studio-footer"><span><span className="status-dot"/>{project.cabinets.length} модулей <i/>{(totalLength/1000).toLocaleString('ru-RU',{maximumFractionDigits:2})} м по ширине модулей</span><button className={problems.length?'issue-link':'geometry-ok'} onClick={()=>{setShowProperties(true);notify(problems.length?problems[0].message:'Проверены шкафы, проёмы, входные двери и типовое открывание фасадов. Фурнитура конкретного производителя требует уточнения.');}}>{problems.length?<><TriangleAlert size={13}/>{problems.length} замечаний</>:<><CheckCheck size={14}/>Проверить расстановку</>}</button><span className="footer-units">мм <i/> Россия · ₽</span></footer>
        <div className="desktop-journey-footer"><span><strong>Шаг {stepIndex+1}. {step.title}</strong><small>{step.hint}</small></span><button className="button primary" onClick={panel==='variants'?exportProject:advance}>{panel==='room'?'К сборке':panel==='modules'?'К отделке':panel==='materials'?'К результату':'Скачать проект'}<ArrowRight size={16}/></button></div>
      </main>

      <aside className={`properties-panel ${showProperties?'mobile-open':''} ${sheetExpanded?'sheet-expanded':''}`} aria-label="Параметры проекта">
        <SheetHandle expanded={sheetExpanded} onExpand={()=>setSheetExpanded(v=>!v)} onClose={()=>setShowProperties(false)}/>
        <div className="properties-heading"><span>ПАРАМЕТРЫ</span><button className="mobile-close icon-button" aria-label="Закрыть параметры" onClick={()=>setShowProperties(false)}><X size={17}/></button><Settings2 size={15}/></div>
        <div className="properties-scroll">{selectedCabinet&&selectedType?<><div className="selected-heading"><span className="selected-icon"><ModuleGlyph kind={selectedCabinet.kind}/></span><span className="eyebrow">ВЫБРАННЫЙ МОДУЛЬ</span><h2>{selectedType.name}</h2><p>{selectedType.description}</p></div>{selectedType.widthRange?<NumberField label="Ширина добора" value={selectedCabinet.width} min={selectedType.widthRange.min} max={selectedType.widthRange.max} onCommit={width=>moveCabinet(resizeCabinet(selectedCabinet,width,project.room))}/>:<label className="select-label">Ширина<select aria-label="Ширина выбранного модуля" value={selectedCabinet.width} onChange={e=>moveCabinet(resizeCabinet(selectedCabinet,Number(e.target.value),project.room))}>{selectedType.widths.map(width=><option key={width} value={width}>{width} мм</option>)}</select></label>}<div className="static-dimensions"><span>Глубина<strong>{selectedType.depth} мм</strong></span><span>Высота<strong>{selectedType.height} мм</strong></span></div><OpeningControls cabinet={selectedCabinet} preview={openingPreviews[selectedCabinet.id]} onChange={next=>previewCabinet(selectedCabinet.id,next)} onHinge={hinge=>updateCabinet({...selectedCabinet,hinge})} issues={motionIssues} currentIssues={currentMotionIssues} onInspect={inspectOpening} onAudit={showOpeningAudit}/><PlacementEditor project={project} cabinet={selectedCabinet} onApply={applyPlacement} step={moveStep} onStep={setMoveStep} gap={moduleGap} minPassage={minPassage}/><FillerSuggestions project={project} anchorId={selectedCabinet.id} onAdd={addFiller}/><label className="select-label">Поворот<select aria-label="Поворот выбранного модуля" value={selectedCabinet.rotation} onChange={e=>moveCabinet({...selectedCabinet,rotation:Number(e.target.value)})}>{[0,90,180,270].map(r=><option key={r} value={r}>{r}°</option>)}</select></label><div className="section-rule"/><h3>Фасад этого модуля</h3><label className="select-label">Материал<select aria-label="Материал выбранного модуля" value={selectedCabinet.front||''} onChange={e=>updateCabinet({...selectedCabinet,front:e.target.value||undefined})}><option value="">Как у всего яруса</option>{FRONTS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="button full-width" onClick={duplicate}><Copy size={14}/>Дублировать</button><button className="button danger full-width" onClick={()=>removeCabinet(selectedCabinet.id)}><Trash2 size={14}/>Удалить модуль</button></>:<><div className="room-summary"><span className="eyebrow">ПОМЕЩЕНИЕ</span><h2>Место для жизни</h2><p>Ваша кухня начинается здесь.</p><div className="summary-plan"><RoomOverview room={project.room} selection={null} onSelect={selectRoom}/><span>{(roomFloorArea(project.room)/1e6).toFixed(1)}<small>м²</small></span></div><dl><div><dt>Ширина</dt><dd>{project.room.width.toLocaleString('ru-RU')} мм</dd></div><div><dt>Глубина</dt><dd>{project.room.depth.toLocaleString('ru-RU')} мм</dd></div><div><dt>Потолок</dt><dd>{project.room.height.toLocaleString('ru-RU')} мм</dd></div></dl><button className="text-button" onClick={()=>nav('room')}>Изменить размеры <ArrowRight size={13}/></button></div><div className="section-rule"/><div className="placement-setting"><h3>Добавлять к стене</h3><p>Новые модули займут свободное место вдоль выбранной стены.</p><div className="wall-buttons">{WALLS.map(w=><button key={w} className={wall===w?'active':''} onClick={()=>setWall(w)}><span>{w==='A'?'━':'┃'}</span>Стена {w}{wall===w&&<Check size={13}/>}</button>)}</div></div><div className="section-rule"/><div className="current-finish"><h3>Ваше сочетание</h3><div className="large-palette">{[project.finishes.lower,project.finishes.upper].map((id,i)=><MaterialSwatch key={i} material={FRONTS.find(m=>m.id===id)!}/>)}<MaterialSwatch material={WORKTOPS.find(m=>m.id===project.finishes.worktop)!}/></div><strong>{palette?.name||'Своё сочетание'}</strong><p>{FRONTS.find(m=>m.id===project.finishes.lower)!.name} + {FRONTS.find(m=>m.id===project.finishes.upper)!.name.toLowerCase()}</p><button className="text-button" onClick={()=>nav('materials')}>Подобрать материалы <ArrowRight size={13}/></button></div></>}
          {problems.length>0&&<div className="issues-panel"><h3><TriangleAlert size={15}/>Проверьте расстановку</h3>{problems.slice(0,6).map((p,i)=><button key={i} onClick={()=>{setSelected(p.id);setView('plan');const c=project.cabinets.find(c=>c.id===p.id);if(c)setLayer(typeOf(c.kind).category==='wall'?'wall':'base');}}>{p.message}<ChevronRight size={13}/></button>)}</div>}
          <div className="tip-card"><span><Sparkles size={16}/>Маленькая подсказка</span><p>{selectedCabinet?'Выберите стену и отступ в параметрах. Стрелки двигают на выбранный шаг, Shift увеличивает его в 10 раз.':'Начните с расположения холодильника, мойки и плиты. Затем заполните пространство модулями хранения.'}</p></div>
          <p className="prototype-note">Эскиз для выбора расстановки и отделки. Проверка открывания использует типовые фасады и ход ящиков. Фурнитура, размеры техники и её монтажные зазоры уточняются отдельно.</p>
        </div>
        <div className="sheet-footer"><button className="journey-primary" onClick={()=>setShowProperties(false)}>Готово<Check size={18}/></button></div>
      </aside>
    </div>
    <div className="mobile-action-bar"><button className="journey-primary" onClick={()=>{if(panel==='variants')exportProject();else nav(panel);}}>{panel==='room'?<Square size={20}/>:panel==='modules'?<Plus size={21}/>:panel==='materials'?<Palette size={20}/>:<Save size={19}/>}{panel==='room'?'Стены, двери и окна':panel==='modules'?'Добавить шкаф':panel==='materials'?'Выбрать отделку':'Скачать проект'}</button><button className="journey-next" onClick={()=>{if(panel==='variants')nav('variants');else advance();}}>{panel==='room'?'К сборке':panel==='modules'?'К отделке':panel==='materials'?'Результат':'Варианты'}<ArrowRight size={18}/></button></div>
    {(mobilePanel||showProperties)&&<button className="panel-backdrop" aria-label="Закрыть каталог" onClick={()=>{setMobilePanel(false);setShowProperties(false);}}/>}
    {toast&&<div className="toast" role="status"><Check size={17}/><span>{toast}</span><button aria-label="Закрыть уведомление" onClick={()=>setToast('')}><X size={15}/></button></div>}
    {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" autoFocus aria-label="Закрыть помощь" onClick={()=>setHelp(false)}><X size={20}/></button><span className="eyebrow">НЕМНОГО О ПЛАНИРОВЩИКЕ</span><h2 id="help-title">Ваша кухня, шаг за шагом</h2><ol><li><strong>Задайте комнату</strong><span>В разделе «Комната» выберите стену, введите размеры и нажмите «Применить». Добавьте двери и окна на нужных стенах. В разделе «Выступы и точки» отметьте короба, радиаторы и коммуникации.</span></li><li><strong>Соберите свою кухню</strong><span>Очистите пример или измените его. Добавляйте модули кнопкой +. Выбирайте стену A, B, C или D в каталоге.</span></li><li><strong>Настройте расстановку</strong><span>В виде 2D перетаскивайте модули. Выбранный шкаф можно двигать стрелками, повернуть или удалить.</span></li><li><strong>Попробуйте материалы</strong><span>Меняйте сочетания целиком, по ярусам или у отдельного модуля.</span></li><li><strong>Сохраните идею</strong><span>Варианты сохраняются в браузере. Файл JSON переносит проект на другое устройство. «Снимок» сохраняет PNG для 3D или SVG для плана.</span></li></ol><p className="modal-note">Это ранний прототип: 14 типов модулей, условная палитра и точная прямоугольная комната с редактируемыми проёмами. Проверяются шкафы, границы комнаты, проёмы и открывание входных дверей. Типовое открывание фасадов проверяется. Точки коммуникаций отмечаются без расчёта трасс и подключений. Монтажные требования конкретной техники пока не моделируются.</p><button className="button primary full-width" onClick={()=>setHelp(false)}>Начать проектировать <ArrowRight size={16}/></button></section></div>}
  </div>;
}

function IconButton({label,children,onClick,disabled=false}:{label:string;children:React.ReactNode;onClick:()=>void;disabled?:boolean}){return <button className="icon-button" type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>;}
function NavButton({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}){return <button className={`nav-button ${active?'active':''}`} onClick={onClick} aria-pressed={active}>{icon}<span>{label}</span></button>;}
function NumberField({label,value,onCommit,min,max}:{label:string;value:number;onCommit:(v:number)=>boolean|void;min:number;max:number}){
  const cancelled=useRef(false);
  const [draft,setDraft]=useState(String(value));useEffect(()=>setDraft(String(value)),[value]);
  return <label className="number-field"><span>{label}</span><div><input aria-label={label} type="number" min={min} max={max} step="1" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelled.current=true;setDraft(String(value));e.currentTarget.blur();}}} onBlur={()=>{if(cancelled.current){cancelled.current=false;setDraft(String(value));return;}const n=Number(draft);if(!draft||!Number.isFinite(n)){setDraft(String(value));return;}const next=Math.round(Math.max(min,Math.min(max,n)));setDraft(String(next));if(next!==value&&onCommit(next)===false)setDraft(String(value));}}/><span>мм</span></div></label>;
}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="toggle-field"><span>{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className="toggle" aria-hidden="true"/></label>;}
function ModuleCard({module:m,onAdd}:{module:typeof MODULES[number];onAdd:(width:number)=>void}){
  const [width,setWidth]=useState(m.widthRange?50:m.widths.includes(600)?600:m.widths[0]);
  return <article className="module-card"><div className="module-visual"><ModuleGlyph kind={m.kind}/>{m.kind==='corner'&&<span className="module-tag">УГЛОВОЙ</span>}</div><div className="module-content"><h2>{m.name}</h2><p>{m.description}</p><div className="module-card-bottom"><label className="module-width"><select aria-label={`Ширина: ${m.name}`} value={width} onChange={e=>setWidth(Number(e.target.value))}>{m.widths.map(w=><option key={w} value={w}>{w} мм</option>)}</select><ChevronDown size={12}/></label><span className="module-depth">гл. {m.depth}</span><button className="add-module" aria-label={`Добавить: ${m.name}`} title={`Добавить ${m.name.toLowerCase()}`} onClick={()=>onAdd(width)}><Plus size={17}/><span>Добавить</span></button></div></div></article>;
}
function MaterialSwatch({material:m}:{material:Material}){return <span className={`material-swatch ${m.wood?'wood':m.stone?'stone':''}`} style={{backgroundColor:m.color}}/>;}
