'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverConfig } from '@/lib/serverConfig';

export default function ResetPasswordPage() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const config = serverConfig();
    if (!config || config.kind !== 'supabase') {
      setMessage('Supabase 연결 설정을 찾지 못했습니다.');
      setChecking(false);
      return;
    }

    const auth = createBrowserClient(config.url, config.anonKey);
    setClient(auth);
    let active = true;
    const { data: { subscription } } = auth.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        setAllowed(true);
        setChecking(false);
      }
    });
    void auth.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(error.message);
      setAllowed(!!data.session?.user);
      setChecking(false);
    }).catch(() => {
      if (active) {
        setMessage('인증 상태를 불러오지 못했습니다. 새 재설정 메일을 요청해 주세요.');
        setChecking(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || saving) return;
    if (password.length < 8) {
      setMessage('새 비밀번호는 8자 이상으로 입력해 주세요.');
      return;
    }
    if (password !== confirm) {
      setMessage('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setSaving(true);
    setMessage('');
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      setMessage(`변경 실패: ${error.message}`);
      setSaving(false);
      return;
    }
    setPassword('');
    setConfirm('');
    setComplete(true);
    setSaving(false);
    await client.auth.signOut();
  }

  return (
    <section className="page" style={{ padding: '40px 16px' }}>
      <div className="panel" style={{ maxWidth: 460, margin: '0 auto', padding: 28 }}>
        <h1 style={{ textAlign: 'center', letterSpacing: '.12em', marginBottom: 16 }}>비밀번호 재설정</h1>
        {complete ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <p>새 비밀번호가 저장되었습니다. 이제 새 비밀번호로 로그인해 주세요.</p>
            <a href="/login" className="btn btn-dark" style={{ justifyContent: 'center' }}>로그인 화면으로</a>
          </div>
        ) : checking ? (
          <p>이메일 인증 링크를 확인하고 있습니다...</p>
        ) : !allowed ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <p>유효한 재설정 세션을 찾지 못했습니다. O.Home 로그인 화면에서 비밀번호 찾기로 새 이메일을 요청한 다음, 가장 최근에 받은 링크를 열어 주세요.</p>
            <a href="/login" className="btn btn-dark" style={{ justifyContent: 'center' }}>로그인 화면으로</a>
          </div>
        ) : (
          <form onSubmit={changePassword} style={{ display: 'grid', gap: 12 }}>
            <p>변경할 비밀번호를 입력해 주세요.</p>
            <input className="k-input" type="password" placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required />
            <input className="k-input" type="password" placeholder="새 비밀번호 확인" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            <button className="btn btn-dark" type="submit" disabled={saving} style={{ justifyContent: 'center' }}>{saving ? '저장 중...' : '새 비밀번호 저장'}</button>
          </form>
        )}
        {message && <p role="alert" style={{ marginTop: 12, color: 'var(--accent, crimson)' }}>{message}</p>}
      </div>
    </section>
  );
}
