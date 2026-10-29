'use client';

import { useState } from 'react';

const UPI = 'pmharsh@fam';
const NAME = 'Harsh Upadhyay';
const PRESETS = [25, 50, 100];

function upiUrl(amount?: number) {
  const p = new URLSearchParams({ pa: UPI, pn: NAME, cu: 'INR', tn: 'Support CINE-MOOD' });
  if (amount) p.set('am', String(amount));
  return `upi://pay?${p.toString()}`;
}

/**
 * Donation panel — UPI first (zero fees, works from every Indian app),
 * Razorpay for cards/UPI-intent on desktop. Nothing is stored server-side:
 * the amount only ever lives in the link you tap.
 */
export default function SupportPanel() {
  const [amount, setAmount] = useState<number | 'custom'>(50);
  const [custom, setCustom] = useState('');
  const [copied, setCopied] = useState('');

  const value = amount === 'custom' ? Math.max(1, Math.min(100000, Number(custom) || 0)) : amount;
  const link = upiUrl(value || undefined);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  }

  return (
    <div className="sup-grid">
      <div className="panel sup-card">
        <div className="panel-title">
          <span>Send a tip · UPI</span>
          <span className="faint mono" style={{ fontSize: 10 }}>instantly · 0% fee</span>
        </div>

        <div className="sup-amounts" role="group" aria-label="Amount">
          {PRESETS.map((p) => (
            <button key={p} type="button" data-on={amount === p} onClick={() => setAmount(p)}>
              ₹{p}
            </button>
          ))}
          <button type="button" data-on={amount === 'custom'} onClick={() => setAmount('custom')}>
            Custom
          </button>
        </div>

        {amount === 'custom' ? (
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="amt">Apni amount (₹)</label>
            <input
              id="amt"
              className="input"
              type="number"
              min={1}
              max={100000}
              inputMode="numeric"
              placeholder="e.g. 500"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
        ) : null}

        <div className="sup-pay">
          <div className="sup-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/upi-qr.png" alt={`UPI QR code for ${UPI}`} width={168} height={168} />
            <span className="sup-qr-note">Scan with any UPI app</span>
          </div>

          <div className="sup-side">
            <div className="sup-upi">
              <div>
                <div className="sup-label">UPI ID</div>
                <div className="sup-upi-id mono">{UPI}</div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(UPI, 'upi')}>
                {copied === 'upi' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <a className="btn btn-primary sup-pay-btn" href={link}>
              {value ? `Pay ₹${value} with UPI` : 'Open UPI app'}
            </a>
            <p className="sup-hint">
              Phone par button dabao — GPay / PhonePe / Paytm seedha khul jaayega, amount pehle se bhara hoga.
            </p>

            <a
              className="btn btn-ghost sup-pay-btn"
              href="https://razorpay.me/@pmharsh"
              target="_blank"
              rel="noreferrer"
            >
              Pay with Razorpay (card / netbanking) ↗
            </a>
          </div>
        </div>

        <p className="sup-foot">
          Ye donations optional hain aur site ko free rakhne ke liye hain. Koi ad nahi, koi data nahi, koi subscription nahi.
        </p>
      </div>
    </div>
  );
}
