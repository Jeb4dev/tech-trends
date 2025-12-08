"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  CopyIcon,
  GlobeIcon,
  RefreshCcwIcon,
  DatabaseIcon,
  TerminalIcon,
  CheckCircle2Icon,
  BrainCircuitIcon
} from "lucide-react";
import { Loader } from "@/components/ai-elements/loader";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";

const models = [
  { name: "GPT-5", value: "gpt-5" },
  { name: "GPT-5 Mini", value: "gpt-5-mini" },
  { name: "GPT-5 Nano", value: "gpt-5-nano" },
];

export default function ChatBot() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);

  const { messages, sendMessage, status, regenerate, error } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) return;

    sendMessage(
      {
        text: message.text || "Sent with attachments",
        files: message.files,
      },
      {
        body: { model, webSearch },
      }
    );
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 relative size-full h-screen">
      <div className="flex flex-col h-full bg-card shadow-sm rounded-xl border border-border overflow-hidden">

        {/* Chat Area */}
        <Conversation className="h-full">
          <ConversationContent className="p-4 md:p-6 space-y-6">

            {messages.map((message) => (
              <div key={message.id} className="w-full">

                {/* 1. Sources */}
                {message.role === "assistant" &&
                  message.parts?.some((part) => part.type === "source-url") && (
                    <div className="mb-2 ml-1">
                      <Sources>
                        <SourcesTrigger
                          count={message.parts.filter((p) => p.type === "source-url").length}
                        />
                        {message.parts
                          .filter((part) => part.type === "source-url")
                          .map((part: any, i) => (
                            <SourcesContent key={`${message.id}-source-${i}`}>
                              <Source href={part.url} title={part.url} />
                            </SourcesContent>
                          ))}
                      </Sources>
                    </div>
                  )}

                {/* 2. Message Parts (Strictly using .parts) */}
                {message.parts?.map((part: any, i) => {
                  switch (part.type) {

                    // --- TEXT ---
                    case "text":
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role} className="mb-2">
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                          {message.role === "assistant" &&
                            i === message.parts.length - 1 && (
                              <MessageActions>
                                <MessageAction onClick={() => regenerate()} label="Retry">
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  onClick={() => navigator.clipboard.writeText(part.text)}
                                  label="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                        </Message>
                      );

                    // --- REASONING (Thoughts extracted visibly) ---
                    case "reasoning":
                      // We render this as a visible block instead of the collapsible component
                      // to "get the thoughts out".
                      return (
                        <div key={`${message.id}-${i}`} className="ml-2 mb-2 pl-3 border-l-2 border-primary/20">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase mb-1">
                            <BrainCircuitIcon className="size-3" />
                            <span>Reasoning Process</span>
                          </div>
                          <div className="text-sm text-muted-foreground italic">
                            {part.text}
                          </div>
                        </div>
                      );

                    // --- STEP START ---
                    case "step-start":
                      if (i === 0) return null;
                      return (
                        <div key={`${message.id}-${i}`} className="flex items-center gap-4 my-4 opacity-30 px-2">
                          <div className="h-px bg-border flex-1" />
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Step</span>
                          <div className="h-px bg-border flex-1" />
                        </div>
                      );

                    // --- TOOL INVOCATION (Fixed for v5: 'tool-toolName') ---
                    // V5 parts use specific types like 'tool-queryDatabase'
                    default: {
                      if (part.type.startsWith('tool-')) {
                        const toolName = part.type.replace('tool-', '');
                        // In v5, arguments are in 'input', not 'args'
                        const query = (part.input as any)?.query;
                        const isError = part.state === 'result' && !!part.result?.error;
                        const isComplete = part.state === 'result' || part.state === 'output-available'; // v5 state check

                        return (
                          <div key={`${message.id}-${i}`} className="my-2 ml-2">
                            <div className={`
                               inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border font-medium transition-colors
                               ${isError
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : isComplete
                                ? 'bg-secondary border-border text-foreground'
                                : 'bg-blue-50 border-blue-100 text-blue-700 animate-pulse'}
                             `}>
                              {isError ? <TerminalIcon className="size-3.5" /> :
                                isComplete ? <CheckCircle2Icon className="size-3.5" /> :
                                  <DatabaseIcon className="size-3.5" />}

                              <span>
                                 {toolName === 'queryDatabase' ? 'Running SQL...' : `Using ${toolName}`}
                               </span>
                            </div>

                            {/* Show the SQL Query if available */}
                            {query && (
                              <div className="mt-2 ml-1 text-[10px] font-mono text-muted-foreground bg-muted p-2 rounded-md border border-border whitespace-pre-wrap">
                                {query}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }
                  }
                })}
              </div>
            ))}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <div className="size-2 bg-destructive rounded-full animate-pulse" />
                <span className="font-semibold">Error:</span> {error.message}
              </div>
            )}

            {status === "submitted" && (
              <div className="py-4 ml-1">
                <Loader />
              </div>
            )}

          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="border-t bg-secondary p-4" globalDrop multiple>
          {/* Input Components remain the same... */}
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder="Ask about jobs (e.g., 'Python jobs in Kuopio')..."
              className="min-h-[60px]"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>

              <PromptInputButton
                variant={webSearch ? "default" : "ghost"}
                onClick={() => setWebSearch(!webSearch)}
                className={webSearch ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""}
              >
                <GlobeIcon size={16} />
                <span className="ml-2">Web Search</span>
              </PromptInputButton>

              <PromptInputSelect onValueChange={setModel} value={model}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {models.map((m) => (
                    <PromptInputSelectItem key={m.value} value={m.value}>
                      {m.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}