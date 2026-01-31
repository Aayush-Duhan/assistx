import { makeObservable, computed } from "mobx";

export type SerializedTranscriptEntry = { createdAt: Date; role: "mic" | "system"; text: string };

class EndOfParagraphMarker {
  constructor(
    readonly role: "mic" | "system",
    readonly createdAt: Date,
  ) {}
}

export class TranscriptionEntry {
  constructor(
    public readonly text: string,
    public readonly role: "mic" | "system",
    public readonly createdAt: Date,
  ) {
    makeObservable(this);
  }
  get roledTranscript() {
    const roleLabel = this.role === "mic" ? "Me" : "Them";
    return `[${roleLabel}]\nTranscription: ${this.text}`;
  }

  get serialized(): SerializedTranscriptEntry {
    return {
      createdAt: this.createdAt,
      role: this.role,
      text: this.text,
    };
  }
}

export class FullContext {
  constructor(
    private readonly audioTranscriptionsWithParagraphBreaks: (
      | TranscriptionEntry
      | EndOfParagraphMarker
    )[] = [],
  ) {
    makeObservable(this, {
      audioTranscriptions: computed.struct,
    });
  }
  addAudioTranscription(transcription: TranscriptionEntry) {
    this.audioTranscriptionsWithParagraphBreaks.push(transcription);
  }
  clearAudioTranscriptions() {
    this.audioTranscriptionsWithParagraphBreaks.length = 0;
  }

  get audioTranscriptions() {
    return this.audioTranscriptionsWithParagraphBreaks.filter(
      (t) => t instanceof TranscriptionEntry,
    );
  }

  markEndOfParagraph(role: "mic" | "system") {
    this.audioTranscriptionsWithParagraphBreaks.push(new EndOfParagraphMarker(role, new Date()));
  }

  get paragraphTranscripts() {
    const transcripts: TranscriptionEntry[] = [];
    let micTextBuffer = "";
    let systemTextBuffer = "";
    for (const entry of this.audioTranscriptionsWithParagraphBreaks) {
      switch (entry.role) {
        case "mic":
          if (entry instanceof TranscriptionEntry) {
            micTextBuffer = `${micTextBuffer} ${entry.text}`.trim();
          }
          if (
            micTextBuffer.length > 100 || // either we hit the paragraph length limit
            (entry instanceof EndOfParagraphMarker && micTextBuffer.length > 0) // or we hit the end of paragraph sequence and have some text
          ) {
            transcripts.push(new TranscriptionEntry(micTextBuffer, "mic", entry.createdAt));
            micTextBuffer = "";
          }
          break;
        case "system":
          if (entry instanceof TranscriptionEntry) {
            systemTextBuffer = `${systemTextBuffer} ${entry.text}`.trim();
          }
          if (
            systemTextBuffer.length > 100 || // either we hit the paragraph length limit
            (entry instanceof EndOfParagraphMarker && systemTextBuffer.length > 0) // or we hit the end of paragraph sequence and have some text
          ) {
            transcripts.push(new TranscriptionEntry(systemTextBuffer, "system", entry.createdAt));
            systemTextBuffer = "";
          }
          break;
      }
    }
    return {
      transcripts,
      remainingMicText: micTextBuffer,
      remainingSystemText: systemTextBuffer,
    };
  }

  get audioContextAsText() {
    if (!this.audioTranscriptions.length) {
      return "";
    }
    return `Audio:\n\n${this.audioTranscriptions.map((t) => t.roledTranscript).join("\n")}`;
  }

  getNewAudioContextAsText(skipAudioContextBefore: Date | null) {
    const newTranscriptions = skipAudioContextBefore
      ? this.audioTranscriptions.filter((t) => t.createdAt > skipAudioContextBefore)
      : this.audioTranscriptions;
    return {
      newAudioContextAsText: new FullContext(newTranscriptions).audioContextAsText,
      includesAudioContextBefore: new Date(),
    };
  }
}
