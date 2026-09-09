type Keyboard = { manager: { enabled: boolean; queue?: unknown[] }; resetKeys: () => unknown };
/** Outdoor and interior are separate Phaser Games listening to the same document.
 * Pausing physics alone leaves the outdoor manager consuming keyboard events. */
export function setRoomKeyboardActive(keyboard: Keyboard | null | undefined, active: boolean) {
 if (!keyboard || keyboard.manager.enabled === active) return;
 keyboard.resetKeys();
 // Phaser's queue exists at runtime but is omitted from its public type surface.
 if (keyboard.manager.queue) keyboard.manager.queue.length = 0;
 keyboard.manager.enabled = active;
}
