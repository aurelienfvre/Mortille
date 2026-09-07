'use client';
import Mariomortille from '../../mariomortille/player';
export default function Page() { return <Mariomortille onExit={() => { window.location.href = '/'; }} />; }
