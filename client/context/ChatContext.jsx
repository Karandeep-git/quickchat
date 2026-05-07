import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { ChatContext } from "./chat-context";

export { ChatContext } from "./chat-context";

const PINNED_STORAGE_KEY = "quickchat:pinned-conversations";
const MUTED_STORAGE_KEY = "quickchat:muted-conversations";

const normalizeConversation = (conversation) => ({
  ...conversation,
  id: String(conversation._id || conversation.id),
  type: conversation.type || "direct",
});

const sortConversations = (conversations, pinnedConversationIds) =>
  [...conversations].sort((conversationA, conversationB) => {
    const isPinnedA = pinnedConversationIds.includes(conversationA.id);
    const isPinnedB = pinnedConversationIds.includes(conversationB.id);

    if (isPinnedA !== isPinnedB) {
      return isPinnedA ? -1 : 1;
    }

    const timeA = conversationA.lastMessageAt
      ? new Date(conversationA.lastMessageAt).getTime()
      : 0;
    const timeB = conversationB.lastMessageAt
      ? new Date(conversationB.lastMessageAt).getTime()
      : 0;

    return timeB - timeA;
  });

const readStorageArray = (key) => {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : [];
  } catch {
    return [];
  }
};

export const ChatProvider = ({ children }) => {
  const [directConversations, setDirectConversations] = useState([]);
  const [groupConversations, setGroupConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [statusContacts, setStatusContacts] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [pinnedConversationIds, setPinnedConversationIds] = useState(() =>
    readStorageArray(PINNED_STORAGE_KEY),
  );
  const [mutedConversationIds, setMutedConversationIds] = useState(() =>
    readStorageArray(MUTED_STORAGE_KEY),
  );

  const typingTimeoutRef = useRef(null);
  const currentTypingTargetRef = useRef(null);

  const { socket, axios, authUser } = useContext(AuthContext);

  const markMessageSeen = useCallback(
    async (messageId) => {
      try {
        await axios.put(`/api/messages/mark/${messageId}`);
      } catch {
        // Ignore best-effort seen sync failures.
      }
    },
    [axios],
  );

  const conversations = useMemo(
    () =>
      sortConversations(
        [
          ...directConversations.map(normalizeConversation),
          ...groupConversations.map(normalizeConversation),
        ],
        pinnedConversationIds,
      ),
    [directConversations, groupConversations, pinnedConversationIds],
  );

  const upsertConversation = useCallback((conversation) => {
    if (!conversation) {
      return;
    }

    const normalizedConversation = normalizeConversation(conversation);
    const setter =
      normalizedConversation.type === "group"
        ? setGroupConversations
        : setDirectConversations;

    setter((prevConversations) => {
      const existingIndex = prevConversations.findIndex(
        (entry) => String(entry._id) === normalizedConversation.id,
      );

      if (existingIndex === -1) {
        return [{ ...normalizedConversation, _id: normalizedConversation.id }, ...prevConversations];
      }

      const nextConversations = [...prevConversations];
      nextConversations[existingIndex] = {
        ...nextConversations[existingIndex],
        ...normalizedConversation,
      };
      return nextConversations;
    });
  }, []);

  const removeConversation = useCallback((conversationId) => {
    setGroupConversations((prevConversations) =>
      prevConversations.filter(
        (conversation) => String(conversation._id) !== String(conversationId),
      ),
    );
    setPinnedConversationIds((prevIds) =>
      prevIds.filter((id) => String(id) !== String(conversationId)),
    );
    setMutedConversationIds((prevIds) =>
      prevIds.filter((id) => String(id) !== String(conversationId)),
    );
    setUnseenMessages((prev) => {
      const next = { ...prev };
      delete next[String(conversationId)];
      return next;
    });
  }, []);

  const updateConversationMeta = useCallback((conversationId, updates, type) => {
    const setter = type === "group" ? setGroupConversations : setDirectConversations;

    setter((prevConversations) =>
      prevConversations.map((conversation) =>
        String(conversation._id) === String(conversationId)
          ? { ...conversation, ...updates }
          : conversation,
      ),
    );
  }, []);

  const getStatuses = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/status");

      if (data.success) {
        setMyStatuses(data.myStatuses || []);
        setStatusContacts(data.contacts || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  }, [axios]);

  const getUsers = useCallback(async () => {
    try {
      const [directResponse, groupResponse] = await Promise.all([
        axios.get("/api/messages/users"),
        axios.get("/api/conversations/groups"),
      ]);

      if (directResponse.data.success) {
        setDirectConversations(
          directResponse.data.users.map((user) => ({
            ...user,
            type: "direct",
          })),
        );
      }

      if (groupResponse.data.success) {
        setGroupConversations(groupResponse.data.groups);
      }

      setUnseenMessages({
        ...(directResponse.data.unseenMessages || {}),
        ...Object.fromEntries(
          (groupResponse.data.groups || []).map((group) => [
            String(group._id),
            group.unseenCount || 0,
          ]),
        ),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  }, [axios]);

  const getMessages = useCallback(
    async (conversation) => {
      if (!conversation) {
        setMessages([]);
        return;
      }

      setIsFetchingMessages(true);

      try {
        const { data } =
          conversation.type === "group"
            ? await axios.get(`/api/conversations/groups/${conversation.id}/messages`)
            : await axios.get(`/api/messages/${conversation.id}`);

        if (data.success) {
          setMessages(data.messages || []);
          setUnseenMessages((prev) => ({
            ...prev,
            [conversation.id]: 0,
          }));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      } finally {
        setIsFetchingMessages(false);
      }
    },
    [axios],
  );

  const selectConversation = useCallback(
    (conversation) => {
      const normalizedConversation = normalizeConversation(conversation);
      setSelectedConversation(normalizedConversation);
      getMessages(normalizedConversation);
    },
    [getMessages],
  );

  const sendMessage = useCallback(
    async (messageData) => {
      if (!selectedConversation?.id) {
        return;
      }

      try {
        const { data } =
          selectedConversation.type === "group"
            ? await axios.post(
                `/api/conversations/groups/${selectedConversation.id}/messages`,
                messageData,
              )
            : await axios.post(
                `/api/messages/send/${selectedConversation.id}`,
                messageData,
              );

        if (data.success) {
          setMessages((prevMessages) => [...prevMessages, data.newMessage]);
          updateConversationMeta(
            selectedConversation.id,
            {
              lastMessageAt: data.newMessage.createdAt,
              lastMessagePreview: data.newMessage.image && !data.newMessage.text
                ? "Photo"
                : data.newMessage.text || "Attachment",
            },
            selectedConversation.type,
          );
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios, selectedConversation, updateConversationMeta],
  );

  const editMessage = useCallback(
    async (messageId, text) => {
      try {
        const { data } = await axios.put(`/api/messages/${messageId}`, { text });

        if (data.success) {
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              String(message._id) === String(messageId) ? data.message : message,
            ),
          );
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios],
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      try {
        const { data } = await axios.delete(`/api/messages/${messageId}`);

        if (data.success) {
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              String(message._id) === String(messageId) ? data.message : message,
            ),
          );
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios],
  );

  const createGroup = useCallback(
    async (groupData) => {
      try {
        const { data } = await axios.post("/api/conversations/groups", groupData);

        if (data.success) {
          upsertConversation(data.group);
          toast.success("Group created successfully");
          return data.group;
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }

      return null;
    },
    [axios, upsertConversation],
  );

  const updateGroup = useCallback(
    async (conversationId, updates) => {
      try {
        const { data } = await axios.put(
          `/api/conversations/groups/${conversationId}`,
          updates,
        );

        if (data.success) {
          upsertConversation(data.group);
          if (String(selectedConversation?.id) === String(conversationId)) {
            setSelectedConversation((prev) => ({ ...prev, ...data.group }));
          }
          toast.success("Group updated");
          return data.group;
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }

      return null;
    },
    [axios, selectedConversation, upsertConversation],
  );

  const removeGroupMember = useCallback(
    async (conversationId, memberId) => {
      try {
        const { data } = await axios.delete(
          `/api/conversations/groups/${conversationId}/members/${memberId}`,
        );

        if (data.success) {
          upsertConversation(data.group);
          if (String(selectedConversation?.id) === String(conversationId)) {
            setSelectedConversation((prev) => ({ ...prev, ...data.group }));
          }
          toast.success("Member removed");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios, selectedConversation, upsertConversation],
  );

  const stopTyping = useCallback(() => {
    if (!socket || !currentTypingTargetRef.current) {
      return;
    }

    socket.emit("typing:stop", currentTypingTargetRef.current);
    currentTypingTargetRef.current = null;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket]);

  const startTyping = useCallback(
    (conversation) => {
      if (!socket || !conversation) {
        return;
      }

      const payload =
        conversation.type === "group"
          ? {
              type: "group",
              conversationId: conversation.id,
            }
          : {
              type: "direct",
              toUserId: conversation.id,
            };

      currentTypingTargetRef.current = payload;
      socket.emit("typing:start", payload);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing:stop", payload);
        currentTypingTargetRef.current = null;
      }, 1200);
    },
    [socket],
  );

  const togglePinnedConversation = useCallback((conversationId) => {
    setPinnedConversationIds((prevIds) => {
      const nextIds = prevIds.includes(conversationId)
        ? prevIds.filter((id) => id !== conversationId)
        : [conversationId, ...prevIds];
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  }, []);

  const toggleMutedConversation = useCallback((conversationId) => {
    setMutedConversationIds((prevIds) => {
      const nextIds = prevIds.includes(conversationId)
        ? prevIds.filter((id) => id !== conversationId)
        : [conversationId, ...prevIds];
      localStorage.setItem(MUTED_STORAGE_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  }, []);

  const createStatus = useCallback(
    async (statusData) => {
      try {
        const { data } = await axios.post("/api/status", statusData);

        if (data.success) {
          await getStatuses();
          toast.success("Status shared");
          return data.status;
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }

      return null;
    },
    [axios, getStatuses],
  );

  const deleteStatus = useCallback(
    async (statusId) => {
      try {
        const { data } = await axios.delete(`/api/status/${statusId}`);

        if (data.success) {
          await getStatuses();
          toast.success("Status deleted");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios, getStatuses],
  );

  const markStatusViewed = useCallback(
    async (statusId) => {
      try {
        const { data } = await axios.post(`/api/status/${statusId}/view`);

        if (data.success) {
          const updatedStatus = data.status;
          setStatusContacts((prevContacts) =>
            prevContacts.map((contact) =>
              contact.statuses.some((status) => String(status._id) === String(statusId))
                ? {
                    ...contact,
                    hasUnviewed: contact.statuses.some(
                      (status) =>
                        String(status._id) !== String(statusId) && !status.hasViewed,
                    ),
                    statuses: contact.statuses.map((status) =>
                      String(status._id) === String(statusId) ? updatedStatus : status,
                    ),
                  }
                : contact,
            ),
          );
        }
      } catch {
        // Ignore best-effort read tracking failures for statuses.
      }
    },
    [axios],
  );

  useEffect(() => {
    if (!authUser) {
      setDirectConversations([]);
      setGroupConversations([]);
      setStatusContacts([]);
      setMyStatuses([]);
      setSelectedConversation(null);
      setMessages([]);
      setUnseenMessages({});
      setTypingUsers({});
      return;
    }

    getUsers();
    getStatuses();
  }, [authUser, getStatuses, getUsers]);

  useEffect(() => {
    if (!socket || !selectedConversation || selectedConversation.type !== "group") {
      return undefined;
    }

    socket.emit("join:conversation", selectedConversation.id);

    return () => {
      socket.emit("leave:conversation", selectedConversation.id);
    };
  }, [selectedConversation, socket]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNewMessage = (newMessage) => {
      const isGroupMessage = Boolean(newMessage.conversationId);
      const conversationId = isGroupMessage
        ? String(newMessage.conversationId)
        : String(newMessage.senderId);

      const isCurrentConversation =
        selectedConversation &&
        String(selectedConversation.id) === conversationId;

      if (isCurrentConversation) {
        setMessages((prevMessages) =>
          prevMessages.some(
            (message) => String(message._id) === String(newMessage._id),
          )
            ? prevMessages
            : [...prevMessages, newMessage],
        );

        if (!isGroupMessage) {
          markMessageSeen(newMessage._id);
        }
      } else {
        setUnseenMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));
      }

      updateConversationMeta(
        conversationId,
        {
          lastMessageAt: newMessage.createdAt,
          lastMessagePreview:
            newMessage.image && !newMessage.text
              ? "Photo"
              : newMessage.text || "Attachment",
        },
        isGroupMessage ? "group" : "direct",
      );

      const isMuted = mutedConversationIds.includes(conversationId);
      if (!isCurrentConversation && !isMuted) {
        toast.success(
          isGroupMessage ? "New group message received" : "New message received",
        );
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          String(message._id) === String(updatedMessage._id)
            ? updatedMessage
            : message,
        ),
      );
    };

    const handleMessageSeen = ({ messageId, seenAt }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          String(message._id) === String(messageId)
            ? { ...message, seen: true, seenAt }
            : message,
        ),
      );
    };

    const handleTypingUpdate = (payload) => {
      if (payload.userId === authUser?._id) {
        return;
      }

      const typingKey =
        payload.type === "group" ? payload.conversationId : payload.userId;

      setTypingUsers((prev) => ({
        ...prev,
        [typingKey]: payload.isTyping ? payload.userId : null,
      }));
    };

    const handleGroupUpdated = ({ action, group, conversationId }) => {
      if (action === "removed") {
        removeConversation(conversationId);
        if (String(selectedConversation?.id) === String(conversationId)) {
          setSelectedConversation(null);
          setMessages([]);
        }
        return;
      }

      upsertConversation(group);
      if (String(selectedConversation?.id) === String(group.id || group._id)) {
        setSelectedConversation((prev) => ({ ...prev, ...group }));
      }
    };

    const handleStatusUpdated = () => {
      getStatuses();
    };

    const handleStatusViewed = ({ statusId, viewer }) => {
      setMyStatuses((prevStatuses) =>
        prevStatuses.map((status) => {
          if (String(status._id) !== String(statusId)) {
            return status;
          }

          const hasViewer = status.viewers.some(
            (entry) => String(entry.userId) === String(viewer.userId),
          );

          if (hasViewer) {
            return status;
          }

          return {
            ...status,
            viewerCount: (status.viewerCount || 0) + 1,
            viewers: [...status.viewers, viewer],
          };
        }),
      );
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:seen", handleMessageSeen);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("group:updated", handleGroupUpdated);
    socket.on("conversation:updated", getUsers);
    socket.on("status:updated", handleStatusUpdated);
    socket.on("status:viewed", handleStatusViewed);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:seen", handleMessageSeen);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("group:updated", handleGroupUpdated);
      socket.off("conversation:updated", getUsers);
      socket.off("status:updated", handleStatusUpdated);
      socket.off("status:viewed", handleStatusViewed);
    };
  }, [
    authUser,
    getStatuses,
    getUsers,
    markMessageSeen,
    mutedConversationIds,
    removeConversation,
    selectedConversation,
    socket,
    updateConversationMeta,
    upsertConversation,
  ]);

  const value = {
    conversations,
    directConversations,
    groupConversations,
    messages,
    statusContacts,
    myStatuses,
    selectedConversation,
    unseenMessages,
    typingUsers,
    isFetchingMessages,
    pinnedConversationIds,
    mutedConversationIds,
    getUsers,
    getStatuses,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    setMessages,
    selectConversation,
    setSelectedConversation,
    createGroup,
    updateGroup,
    removeGroupMember,
    createStatus,
    deleteStatus,
    markStatusViewed,
    startTyping,
    stopTyping,
    togglePinnedConversation,
    toggleMutedConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
