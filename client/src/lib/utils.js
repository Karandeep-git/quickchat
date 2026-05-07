export function formatMessageTime(date) {
  if (!date) {
    return "";
  }

  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatConversationDate(date) {
  if (!date) {
    return "";
  }

  const messageDate = new Date(date);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return formatMessageTime(messageDate);
  }

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getConversationTitle(conversation) {
  return conversation?.type === "group"
    ? conversation.name
    : conversation?.fullName || "";
}

export function getConversationAvatar(conversation, fallback) {
  return conversation?.type === "group"
    ? conversation.groupImage || fallback
    : conversation?.profilePic || fallback;
}

export function getConversationSubtitle(conversation) {
  if (!conversation) {
    return "";
  }

  if (conversation.type === "group") {
    return `${conversation.memberIds?.length || 0} members`;
  }

  return conversation.bio || "Start a conversation";
}
