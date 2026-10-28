import { cookies } from 'next/headers';
import { LANG_COOKIE, type Lang } from './i18n';

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const v = jar.get(LANG_COOKIE)?.value;
  return v === 'hi' || v === 'hinglish' || v === 'en' ? v : 'en';
}
