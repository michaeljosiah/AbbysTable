/** The approved eight-second Undo window, paused by real hover/keyboard focus. */
export class RemovalWindow {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private deadline = 0;
  private remaining = 8000;
  private active = false;

  constructor(
    private readonly expire: () => void,
    private readonly now = Date.now,
  ) {}

  start() {
    this.clear();
    this.active = true;
    this.remaining = 8000;
    this.arm();
  }

  private arm() {
    this.deadline = this.now() + this.remaining;
    this.timer = setTimeout(() => {
      this.clear();
      this.expire();
    }, this.remaining);
  }

  pause() {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.remaining = Math.max(0, this.deadline - this.now());
  }

  resume() {
    if (!this.active || this.timer !== null) return;
    this.remaining = Math.max(2500, this.remaining);
    this.arm();
  }

  clear() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.active = false;
  }
}
