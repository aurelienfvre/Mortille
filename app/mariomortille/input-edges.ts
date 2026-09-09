/** Keep brief taps until the next simulation tick, independent of key release. */
export class InputEdges {
  private pending = new Set<'jump' | 'down' | 'power' | 'dash' | 'switch' | 'trio'>();
  press(action: 'jump' | 'down' | 'power' | 'dash' | 'switch' | 'trio') { this.pending.add(action); }
  consume() {
    const result = { jumpPressed: this.pending.has('jump'), downPressed: this.pending.has('down'), powerPressed: this.pending.has('power'), ...(this.pending.has('dash') ? { dashPressed: true } : {}), ...(this.pending.has('switch') ? {switchPressed:true} : {}), ...(this.pending.has('trio') ? {trioPressed:true} : {}) };
    this.clear();
    return result;
  }
  clear() { this.pending.clear(); }
}
