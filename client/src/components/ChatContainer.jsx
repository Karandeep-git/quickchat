import { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import assets from "../assets/assets";
import BrandMark from "./BrandMark";
import {
  formatConversationDate,
  formatMessageTime,
  getConversationAvatar,
  getConversationSubtitle,
  getConversationTitle,
} from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";

const ChatContainer = () => {
  const {
    messages,
    selectedConversation,
    setSelectedConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    typingUsers,
    isFetchingMessages,
    startTyping,
    stopTyping,
  } = useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const scrollEndRef = useRef(null);
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [query, setQuery] = useState("");

  const conversationTypingKey = selectedConversation?.id;
  const isTyping = Boolean(typingUsers?.[conversationTypingKey]);

  const filteredMessages = useMemo(() => {
    if (!query.trim()) {
      return messages;
    }

    return messages.filter((message) =>
      `${message.text || ""}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [messages, query]);

  const handleSendMessage = async (event) => {
    event?.preventDefault();

    if (!selectedConversation || input.trim() === "") {
      return;
    }

    if (editingMessageId) {
      await editMessage(editingMessageId, input.trim());
      setEditingMessageId(null);
      setInput("");
      stopTyping();
      return;
    }

    await sendMessage({ text: input.trim() });
    setInput("");
    stopTyping();
  };

  const handleSendImage = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }

    const encodedImage = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    await sendMessage({ image: encodedImage });
    event.target.value = "";
  };

  const handleInputChange = (event) => {
    setInput(event.target.value);

    if (!selectedConversation) {
      return;
    }

    if (event.target.value.trim()) {
      startTyping(selectedConversation);
    } else {
      stopTyping();
    }
  };

  const handleEdit = (message) => {
    setEditingMessageId(message._id);
    setInput(message.text || "");
  };

  const getDeliveryStatus = (message) => {
    if (selectedConversation?.type === "group") {
      return message.editedAt ? "Edited" : "";
    }

    const senderId = String(message.senderId?._id || message.senderId);
    if (senderId !== String(authUser?._id)) {
      return message.editedAt ? "Edited" : "";
    }

    if (message.seen) {
      return "Seen";
    }

    if (message.deliveredAt) {
      return "Delivered";
    }

    return "Sent";
  };

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages, isTyping]);

  if (!selectedConversation) {
    return (
      <section
        className="hidden h-full min-h-0 items-center justify-center border-r p-8 text-center lg:flex"
        style={{
          background: "var(--chat-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="max-w-md">
          <BrandMark />
          <p
            className="mt-4 text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            Select a conversation to start messaging.
          </p>
        </div>
      </section>
    );
  }

  const isDirectConversation = selectedConversation.type === "direct";
  const isConversationOnline =
    isDirectConversation &&
    onlineUsers.includes(String(selectedConversation.id));

  return (
    <section
      className="flex h-full min-h-0 flex-col"
      style={{ background: "var(--chat-bg)" }}
    >
      <header
        className="border-b px-4 py-4 md:px-6"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedConversation(null)}
            className="rounded-full px-3 py-2 text-sm lg:hidden"
            style={{
              background: "var(--panel-muted)",
              color: "var(--text-primary)",
            }}
          >
            Back
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={getConversationAvatar(selectedConversation, assets.avatar_icon)}
              alt={getConversationTitle(selectedConversation)}
              className="h-11 w-11 rounded-full object-cover"
            />
            <div className="min-w-0">
              <h2
                className="truncate text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {getConversationTitle(selectedConversation)}
              </h2>
              <p
                className="truncate text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {isTyping
                  ? "Typing..."
                  : isConversationOnline
                    ? "Online"
                    : getConversationSubtitle(selectedConversation)}
              </p>
            </div>
          </div>

          <div
            className="flex w-full items-center gap-2 rounded-2xl border px-3 py-2 md:w-72"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <img src={assets.search_icon} alt="" className="h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        {isFetchingMessages ? (
          <div
            className="flex h-full items-center justify-center"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading messages...
          </div>
        ) : filteredMessages.length > 0 ? (
          <div className="space-y-4">
            {filteredMessages.map((message, index) => {
              const senderId = String(message.senderId?._id || message.senderId);
              const isMine = senderId === String(authUser?._id);
              const showDateDivider =
                index === 0 ||
                new Date(filteredMessages[index - 1].createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();

              return (
                <div key={message._id || `${message.createdAt}-${index}`}>
                  {showDateDivider && (
                    <div className="mb-4 flex justify-center">
                      <span
                        className="rounded-full px-4 py-1 text-xs"
                        style={{
                          background: "var(--panel-muted)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {formatConversationDate(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-3 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {!isMine && (
                      <img
                        src={
                          message.senderId?.profilePic ||
                          getConversationAvatar(selectedConversation, assets.avatar_icon)
                        }
                        alt={
                          message.senderId?.fullName ||
                          getConversationTitle(selectedConversation)
                        }
                        className="hidden h-8 w-8 rounded-full object-cover sm:block"
                      />
                    )}

                    <div
                      className="max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm md:max-w-[70%]"
                      style={{
                        background: isMine
                          ? "var(--sender-bubble)"
                          : "var(--receiver-bubble)",
                        color: isMine
                          ? "var(--sender-text)"
                          : "var(--receiver-text)",
                      }}
                    >
                      {selectedConversation.type === "group" && !isMine && (
                        <p
                          className="mb-2 text-xs font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          {message.senderId?.fullName || "Teammate"}
                        </p>
                      )}

                      {message.image && (
                        <img
                          src={message.image}
                          alt="Shared attachment"
                          className="mb-3 max-h-72 w-full rounded-2xl object-cover"
                        />
                      )}

                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.text}
                      </p>

                      <div
                        className="mt-3 flex items-center justify-between gap-4 text-[11px]"
                        style={{
                          color: isMine
                            ? "rgba(255,255,255,0.82)"
                            : "var(--text-secondary)",
                        }}
                      >
                        <span>{formatMessageTime(message.createdAt)}</span>
                        <div className="flex items-center gap-3">
                          <span>{getDeliveryStatus(message)}</span>
                          {isMine && !message.deletedForEveryone && (
                            <>
                              <button type="button" onClick={() => handleEdit(message)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => deleteMessage(message._id)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ background: "var(--accent)" }}
                ></span>
                Typing...
              </div>
            )}

            <div ref={scrollEndRef}></div>
          </div>
        ) : (
          <div
            className="flex h-full flex-col items-center justify-center text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            <p
              className="text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Start the conversation
            </p>
            <p className="mt-2 text-sm">Send a message to begin chatting.</p>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="border-t px-4 py-4 md:px-6"
        style={{ borderColor: "var(--border-color)" }}
      >
        {editingMessageId && (
          <div
            className="mb-3 flex items-center justify-between rounded-2xl px-4 py-3 text-sm"
            style={{
              background: "var(--accent-soft)",
              color: "var(--text-primary)",
            }}
          >
            <p>Editing a message</p>
            <button
              type="button"
              onClick={() => {
                setEditingMessageId(null);
                setInput("");
              }}
              style={{ color: "var(--accent)" }}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <label
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl"
            style={{ background: "var(--panel-muted)" }}
          >
            <input
              onChange={handleSendImage}
              type="file"
              accept="image/png, image/jpeg"
              hidden
            />
            <img src={assets.gallery_icon} alt="Upload" className="h-5 w-5" />
          </label>

          <div
            className="flex-1 rounded-[24px] border px-4 py-3"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <textarea
              value={input}
              onChange={handleInputChange}
              onBlur={stopTyping}
              rows={1}
              placeholder={
                selectedConversation.type === "group"
                  ? "Message the group..."
                  : "Write a message..."
              }
              className="max-h-32 min-h-[28px] w-full resize-none bg-transparent text-sm leading-6 outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <button
            type="submit"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--accent)" }}
          >
            <img src={assets.send_button} alt="Send" className="h-5 w-5" />
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChatContainer;
