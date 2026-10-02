type Job = { id: number; run: () => Promise<void>; resolve: () => void };

export class PdfRenderQueue {
  private readonly queue: Job[] = [];
  private active = 0;
  constructor(private readonly concurrency = 1) {}

  enqueue(id: number, run: () => Promise<void>) {
    return new Promise<void>((resolve) => { this.queue.push({ id, run, resolve }); this.pump(); });
  }

  cancelExcept(keep: Set<number>) { for (let index = this.queue.length - 1; index >= 0; index -= 1) if (!keep.has(this.queue[index].id)) { const [job] = this.queue.splice(index, 1); job?.resolve(); } }
  clear() { while (this.queue.length) this.queue.shift()?.resolve(); }

  private pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const job = this.queue.shift()!; this.active += 1;
      void job.run().finally(() => { this.active -= 1; job.resolve(); this.pump(); });
    }
  }
}
