export type Unit='cm'|'mm';
export const unitName=(unit:Unit)=>unit==='cm'?'см':'мм';
export const display=(n:number,unit:Unit)=>String(unit==='cm'?n/10:n);
export function read(value:string,unit:Unit){
  if(!value.trim())throw new Error('Заполните все размеры.');
  const n=Number(value.replace(',','.'))*(unit==='cm'?10:1);
  if(!Number.isFinite(n)||Math.abs(n-Math.round(n))>.00001)throw new Error('Введите размер с точностью до 1 мм (0,1 см).');
  return Math.round(n);
}
export function Measure({label,value,onChange,unit}:{label:string;value:string;onChange:(v:string)=>void;unit:Unit}){
  return <label className="room-measure"><span>{label}</span><div><input aria-label={label} inputMode="decimal" type="text" value={value} onChange={e=>onChange(e.target.value)}/><span>{unitName(unit)}</span></div></label>;
}
export function ErrorMessage({message}:{message:string}){return message?<p className="room-error" role="alert">{message}</p>:null;}
