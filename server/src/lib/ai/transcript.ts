import { Compaction } from "./compaction";
import { Context } from "./context";

export namespace Transcript {
  /*
   * We cannot block the main process, to do so:
   * - transcript is not overflowing and no prev compacted => return full
   * - transcript is not overflowing and prev compacted => return compacted + tail
   * - transcript is overflowing and no prev compacted => return a long tail
   * - transcript is overflowing prev compacted => return compaction + tail
   * */
  export function run(params: {
    full: string;
    compacted: string | null;
    compactionCounter: number;
  }) {
    const tail = Compaction.tail({
      input: params.full,
      take: Context.MaxSize.Transcript * 0.2,
    });

    const compacted = params.compacted
      ? ["<compacted>", params.compacted, "</compacted>", "[...]", tail].join("\n")
      : params.full;

    const isOverflow = Compaction.isOverflow({
      input: params.full,
      budget: Context.MaxSize.Transcript * (params.compactionCounter + 1),
    });

    if (isOverflow && params.compactionCounter === 0) {
      const longTail = Compaction.tail({
        input: params.full,
        take: Context.MaxSize.Transcript * 0.4,
      });

      return {
        isOverflow,
        transcript: longTail,
        compact: async () => Compaction.run({ input: params.full }),
      };
    }

    return {
      isOverflow,
      transcript: compacted,
      compact: async () => Compaction.run({ input: params.full }),
    };
  }
}
