'use client';
/* oxlint-disable next/no-img-element -- Exact pixel PNG crop with nearest-neighbor sampling. */
import styles from './life-hud.module.css';
export type LifeHudProps = { health: number; maxHealth?: number; className?: string };
export default function LifeHud({ health, maxHealth = 3, className = '' }: LifeHudProps) {
 const total = Math.max(1, Math.min(12, Math.floor(Number.isFinite(maxHealth) ? maxHealth : 3)));
 const remaining = Math.max(0, Math.min(total, Math.floor(Number.isFinite(health) ? health : 0)));
 return <span className={`${styles.lives} ${className}`} role="img" aria-label={`${remaining} vie${remaining === 1 ? '' : 's'} sur ${total}`}>
  {Array.from({ length: total }, (_, index) => <img key={index} src="/mariomortille/hud/aurelien-life.png" width="40" height="36" alt="" aria-hidden="true" draggable={false} className={index < remaining ? styles.full : styles.empty} />)}
 </span>;
}
