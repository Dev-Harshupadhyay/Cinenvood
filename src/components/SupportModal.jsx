import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

const UPI_ID='pmharsh@fam';
const presets=[25,50,100,200];
export default function SupportModal({onClose}){
 const [amount,setAmount]=useState(50),[qr,setQr]=useState(''),[copied,setCopied]=useState(false);
 const valid=Math.max(1,Math.min(100000,Number(amount)||50));
 const upi=useMemo(()=>`upi://pay?${new URLSearchParams({pa:UPI_ID,pn:'Harsh Dev',am:valid.toFixed(2),cu:'INR',tn:'Support CINE-MOOD AI'}).toString()}`,[valid]);
 useEffect(()=>{QRCode.toDataURL(upi,{width:420,margin:2,color:{dark:'#09090B',light:'#FFFFFF'},errorCorrectionLevel:'M'}).then(setQr)},[upi]);
 const copy=async()=>{try{await navigator.clipboard.writeText(UPI_ID);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{prompt('Copy UPI ID',UPI_ID)}};
 return <div className="support-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="support-modal"><button className="support-close" onClick={onClose}>×</button><div className="support-glow"/><header><span>♥</span><small>SUPPORT THE CREATOR</small><h2>Fuel the next frame.</h2><p>CineMood free rahega. Aapka support naye features aur better movie experiences banane mein help karta hai.</p></header><div className="support-grid"><div className="support-options"><label>CHOOSE AN AMOUNT</label><div className="amounts">{presets.map(n=><button className={valid===n?'on':''} onClick={()=>setAmount(n)} key={n}>₹{n}</button>)}</div><label>CUSTOM AMOUNT</label><div className="custom-amount"><span>₹</span><input type="number" min="1" max="100000" value={amount} onChange={e=>setAmount(e.target.value)}/></div><a className="pay-upi" href={upi}>Pay ₹{valid} via UPI <span>↗</span></a><div className="upi-copy"><div><small>UPI ID</small><b>{UPI_ID}</b></div><button onClick={copy}>{copied?'COPIED ✓':'COPY'}</button></div></div><div className="qr-panel"><div className="qr-wrap">{qr&&<img src={qr} alt={`UPI QR for ₹${valid}`}/>}<i>◈</i></div><b>SCAN WITH ANY UPI APP</b><small>GPay · PhonePe · Paytm · BHIM</small></div></div><footer><span>⌾ Secure UPI intent</span><span>•</span><span>No payment details are stored</span></footer></section></div>
}
