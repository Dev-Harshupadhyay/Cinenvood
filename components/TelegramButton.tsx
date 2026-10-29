const TG_LINK = 'https://t.me/+DvSgQwffeiwxMzg1';

/** Telegram channel button — brand logo, solid fill, no image request. */
export default function TelegramButton({
  label = 'Join on Telegram',
  sub,
  href = TG_LINK,
  small = false
}: {
  label?: string;
  sub?: string;
  href?: string;
  small?: boolean;
}) {
  return (
    <a
      className="tg-btn"
      href={href}
      target="_blank"
      rel="noreferrer"
      style={small ? { padding: '8px 14px', fontSize: 12.5 } : undefined}
    >
      <svg width={small ? 16 : 20} height={small ? 16 : 20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.94.46l.34-4.77 8.68-7.84c.38-.34-.08-.52-.58-.19L6.99 12.94l-4.62-1.45c-1-.31-1.02-1 .21-1.48l18.09-6.98c.83-.3 1.56.2 1.27 1.27z" />
      </svg>
      <span>
        {label}
        {sub ? <span className="tg-sub">{sub}</span> : null}
      </span>
    </a>
  );
}
