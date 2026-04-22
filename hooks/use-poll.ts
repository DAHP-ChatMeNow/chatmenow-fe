import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat";
import { Poll } from "@/types/message";

// ─── Create Poll ───────────────────────────────────────────────────────────────
export interface CreatePollPayload {
  conversationId: string;
  question: string;
  options: { text: string }[];
  allowMultipleChoices?: boolean;
  allowAddOptions?: boolean;
  hideResultsBeforeVote?: boolean;
  hideVoters?: boolean;
  deadline?: string | null;
  pinToTop?: boolean;
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, ...rest }: CreatePollPayload) =>
      chatService.createPoll(conversationId, rest),
    onSuccess: (_data, variables) => {
      // Invalidate messages so the new poll message appears
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
    },
  });
}

// ─── Vote on a Poll ───────────────────────────────────────────────────────────
export function useVotePoll() {
  return useMutation({
    mutationFn: ({
      pollId,
      optionIds,
    }: {
      pollId: string;
      optionIds: string[];
    }) => chatService.votePoll(pollId, optionIds),
  });
}

// ─── Add Poll Option ──────────────────────────────────────────────────────────
export function useAddPollOption() {
  return useMutation({
    mutationFn: ({ pollId, text }: { pollId: string; text: string }) =>
      chatService.addPollOption(pollId, text),
  });
}

// ─── Close Poll ───────────────────────────────────────────────────────────────
export function useClosePoll() {
  return useMutation({
    mutationFn: ({ pollId }: { pollId: string }) =>
      chatService.closePoll(pollId),
  });
}
