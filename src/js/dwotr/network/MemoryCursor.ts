// import { FeedOptions, OnClose, OnDone } from './WOTPubSub';
// import { ITCursor } from './types';

// class MemoryCursor<T> implements ITCursor<T> {
//   limit = 50;

//   delta: number = 0; // Not needed
//   since: number = 0; // Not needed

//   done: boolean = false;
//   feedOptions: FeedOptions;

//   buffer: Array<T> = [];

//   valuePointer: IterableIterator<T>; // Pointer to the current value in the notes map
//   authors = new Set<string>();
//   kinds = new Set<number>();
//   ids = new Set<string>();


//   constructor(opt: FeedOptions, valuePointer: IterableIterator<T>, size = 50) {
//     this.limit = size;
//     this.feedOptions = opt;
//     this.valuePointer = valuePointer; // Get an iterator 
//     this.authors = new Set<string>(opt.filter.authors);
//     this.kinds = new Set<number>(opt.filter.kinds);
//     this.ids = new Set<string>(opt.filter.ids);
//   }

//   async load(): Promise<number> {
//     if (this.done) return 0;

//     let { since, until } = this.feedOptions.filter;
//     until ??= Number.MAX_SAFE_INTEGER;
//     since ??= 0;

//     const { onClose, onDone } = this.feedOptions;

//     let found = 0;
//     let remaning = this.limit - this.buffer.length;

//     while (remaning > 0 && !this.done) {
//       let item = this.valuePointer.next().value as T;
//       if (item === undefined) {
//         // If the iterator is done, we're done
//         this.#done(onClose, onDone);
//         break;
//       }

//       if(!this.accept(item, until)) continue;

//       this.buffer.push(item); // Add the note to the buffer to save the next() value, iterator cannot be rewound
//       remaning--;

//       if(this.isDone(item, since)) {
//         this.#done(onClose, onDone);
//         break;
//       }

//       found++;
//       //onEvent?.(item, false, '');
//     }

//     return Promise.resolve(found);
//   }

//   accept(item: T, until: number): boolean {
//     return true;
//   }

//   isDone(item: T, since: number): boolean {
//     return false;
//   }


//   take(count: number): T[] {
//     return this.buffer.splice(0, count) as T[];
//   }

//   count(): number {
//     return this.buffer.length;
//   }

//   peek(): T | undefined {
//     return this.buffer[0];
//   }

//   pop(): T | undefined {
//     return this.buffer.shift();
//   }

//   #done(onClose?: OnClose, onDone?: OnDone) {
//     this.done = true;
//     onClose?.(-1);
//     onDone?.(-1);
//   }
// }

// export default MemoryCursor;
