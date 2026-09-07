'use client';
import { useEffect, useState } from 'react';
import { quartierLevels } from './levels';
import { arcadeRequest } from './ranked-run';
type Entry = { pseudo: string; score: number; ticks: number; secrets: number };
type Profile = { id: string; pseudo: string };
export default function RankingsPanel() {
  const [level, setLevel] = useState(quartierLevels[0].id), [order, setOrder] = useState('score');
  const [entries, setEntries] = useState<Entry[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null), [pseudo, setPseudo] = useState('');
  const [saving, setSaving] = useState(false), [profileMessage, setProfileMessage] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void arcadeRequest<{ player: Profile | null }>('session', undefined, controller.signal).then(data => { setProfile(data.player); setPseudo(data.player?.pseudo ?? ''); }).catch(() => { if (!controller.signal.aborted) setProfileMessage('Connexion au classement indisponible pour le moment.'); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void arcadeRequest<{ entries: Entry[] }>(`leaderboard?game=mario&level=${encodeURIComponent(level)}&order=${order}`, undefined, controller.signal)
      .then(data => { setEntries(data.entries); setLoading(false); })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => controller.abort();
  }, [level, order, refresh]);
  const inputStyle = { padding: '7px', font: 'inherit', color: '#fff6d6', background: '#233d45', border: '2px solid #779295', maxWidth: '100%' };
  return <div style={{ textAlign: 'left', fontSize: 'clamp(11px,1.3vw,16px)' }}>
    <form onSubmit={async event => {
      event.preventDefault(); if (saving) return; setSaving(true); setProfileMessage('');
      try { const data = await arcadeRequest<{ player: Profile }>('session', { pseudo }); setProfile(data.player); setProfileMessage('Pseudo enregistré. Tes prochaines parties seront classées.'); setRefresh(x => x + 1); }
      catch (e) { setProfileMessage(e instanceof Error ? e.message : 'Enregistrement indisponible.'); }
      finally { setSaving(false); }
    }}>
      <label style={{ display: 'block', marginBottom: 7 }}>Ton pseudo {profile ? `· ${profile.pseudo}` : ''}<br/><input style={inputStyle} aria-label="Ton pseudo de classement" value={pseudo} onChange={e => setPseudo(e.target.value)} minLength={2} maxLength={20} required autoComplete="nickname" /></label>
      <button style={inputStyle} disabled={saving}>{saving ? 'ENREGISTREMENT…' : profile ? 'MODIFIER LE PSEUDO' : 'ENREGISTRER MON PSEUDO'}</button>
      {profileMessage && <p role="status">{profileMessage}</p>}
    </form>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '18px 0 12px' }}>
      <label>Niveau<br/><select style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>{quartierLevels.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Trier par<br/><select style={inputStyle} value={order} onChange={e => setOrder(e.target.value)}><option value="score">Score</option><option value="time">Temps</option></select></label>
    </div>
    {loading ? <p role="status">Chargement du classement…</p> : error ? <p role="alert">{error} <button style={inputStyle} onClick={() => setRefresh(x => x + 1)}>RÉESSAYER</button></p> : entries.length === 0 ? <p>Aucun score pour ce niveau. À toi d’ouvrir le classement !</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: 1.9 }}>
      <caption style={{ textAlign: 'left', color: '#ffcc76' }}>Meilleure partie de chaque joueur</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Joueur</th><th scope="col">Score</th><th scope="col">Temps</th><th scope="col">Secrets</th></tr></thead>
      <tbody>{entries.map((entry, i) => <tr key={`${entry.pseudo}-${i}`} style={{ borderTop: '1px solid #49616b' }}><td>{i + 1}</td><td>{entry.pseudo}</td><td>{entry.score}</td><td style={{ whiteSpace: 'nowrap' }}>{Math.floor(entry.ticks / 3600)}:{String(Math.floor(entry.ticks / 60) % 60).padStart(2, '0')}.{String(Math.floor(entry.ticks % 60 * 100 / 60)).padStart(2, '0')}</td><td>{entry.secrets}/3</td></tr>)}</tbody>
    </table></div>}
  </div>;
}
