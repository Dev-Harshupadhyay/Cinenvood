import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '90px 0', textAlign: 'center' }}>
      <div className="eyebrow" style={{ justifyContent: 'center' }}>404</div>
      <h1 style={{ fontSize: 'clamp(30px,5vw,54px)', marginBottom: 10 }}>Ye scene cut ho gaya</h1>
      <p className="faint" style={{ marginBottom: 22 }}>Jo page dhoondh rahe ho wo exist nahi karta (ya hata diya gaya).</p>
      <Link href="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
