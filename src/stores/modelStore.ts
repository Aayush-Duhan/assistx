import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';
import { ChatModel } from "@/types/chat";

export type ChatModelType = ChatModel | undefined;

export const chatModelAtom = atomWithStorage<ChatModelType>(
  'chatModel',
  undefined
);

export const setChatModelAtom = atom(
  null,
  (_get, set, newModel: ChatModelType) => {
    set(chatModelAtom, newModel);
  }
);