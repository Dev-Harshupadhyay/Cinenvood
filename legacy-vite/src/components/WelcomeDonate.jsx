import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const UPI='upi://pay?pa=pmharsh%40fam&pn=Harsh%20Dev&am=25.00&cu=INR&tn=Support%20CINE-MOOD%20AI';
export default function WelcomeDonate({onClose,onMore}){
 const [qr,setQr]=useState('');
 useEffect(()=>{QRCode.toDataURL(UPI,{width:180,margin:1,errorCorrectionLevel:'M'}).then(setQr)},[]);
 return <aside className="welcome-donate"><button className="wd-close" onClick={onClose}>×</button><div className="wd-qr">{qr&&<img src={qr} alt="FamPay UPI QR"/>}</div><div className="wd-copy"><small>WELCOME TO CINE·MOOD</small><b>Support Harsh Dev with ₹25</b><span>FamPay · pmharsh@fam</span><div><a href={UPI}>Pay ₹25 via UPI ↗</a><button onClick={onMore}>Custom amount</button></div></div><i className="wd-timer"/></aside>
}
