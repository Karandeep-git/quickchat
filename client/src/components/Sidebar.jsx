import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "./BrandMark";
import CreateGroupModal from "./CreateGroupModal";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { ThemeContext } from "../../context/ThemeContext";
import {
  formatConversationDate,
  getConversationAvatar,
  getConversationTitle,
} from "../lib/utils";

const Sidebar = ({ activeView, onChangeView, onOpenStatusEntry }) => {
  const {
    conversations,
    directConversations,
    selectedConversation,
    selectConversation,
    unseenMessages,
    createGroup,
    myStatuses,
    statusContacts,
  } = useContext(ChatContext);
  const { logout, onlineUsers, authUser } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  const [input, setInput] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const navigate = useNavigate();

  const filteredConversations = useMemo(() => {
    if (!input.trim()) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      getConversationTitle(conversation)
        .toLowerCase()
        .includes(input.toLowerCase()),
    );
  }, [conversations, input]);

  const filteredStatusContacts = useMemo(() => {
    if (!input.trim()) {
      return statusContacts;
    }

    return statusContacts.filter((entry) =>
      `${entry.user?.fullName || ""}`.toLowerCase().includes(input.toLowerCase()),
    );
  }, [input, statusContacts]);

  const handleCreateGroup = async (groupData) => {
    const createdGroup = await createGroup(groupData);

    if (createdGroup) {
      onChangeView?.("chats");
      selectConversation(createdGroup);
      return createdGroup;
    }

    return null;
  };

  const renderChats = () => (
    <div className="grid gap-2">
      {filteredConversations.map((conversation) => {
        const conversationId = String(conversation.id || conversation._id);
        const unreadCount = unseenMessages?.[conversationId] || 0;
        const isSelected =
          String(selectedConversation?.id) === String(conversationId);
        const isOnline =
          conversation.type === "direct" &&
          onlineUsers.includes(String(conversationId));

        return (
          <button
            key={conversationId}
            type="button"
            onClick={() => {
              onChangeView?.("chats");
              selectConversation(conversation);
            }}
            className="rounded-[22px] border p-3 text-left transition"
            style={{
              background: isSelected
                ? "var(--accent-soft)"
                : "var(--panel-subtle)",
              borderColor: isSelected
                ? "var(--accent-border)"
                : "var(--border-color)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <img
                  src={getConversationAvatar(conversation, assets.avatar_icon)}
                  alt={getConversationTitle(conversation)}
                  className="h-12 w-12 rounded-full object-cover"
                />
                {conversation.type === "direct" ? (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
                    style={{
                      background: isOnline
                        ? "var(--presence-online)"
                        : "var(--presence-offline)",
                      borderColor: "var(--panel-subtle)",
                    }}
                  ></span>
                ) : (
                  <span
                    className="absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    Group
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="truncate font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {getConversationTitle(conversation)}
                  </p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatConversationDate(conversation.lastMessageAt)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p
                    className="truncate text-sm"
                    style={{
                      color:
                        unreadCount > 0
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {conversation.lastMessagePreview ||
                      (conversation.type === "group"
                        ? "Group conversation"
                        : conversation.bio || "Start chatting")}
                  </p>

                  {unreadCount > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {filteredConversations.length === 0 && (
        <div
          className="rounded-[22px] border px-5 py-8 text-center text-sm"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
        >
          No conversations found.
        </div>
      )}
    </div>
  );

  const renderStatuses = () => (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => onChangeView?.("status")}
        className="rounded-[24px] border p-4 text-left"
        style={{
          background: "var(--panel-subtle)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src={authUser?.profilePic || assets.avatar_icon}
            alt={authUser?.fullName || "My status"}
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>
              My status
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {myStatuses.length > 0
                ? `${myStatuses.length} active update${myStatuses.length === 1 ? "" : "s"}`
                : "Tap into Status to share an update"}
            </p>
          </div>
        </div>
      </button>

      {filteredStatusContacts.length > 0 ? (
        filteredStatusContacts.map((entry) => (
          <button
            key={entry.userId}
            type="button"
            onClick={() => {
              onChangeView?.("status");
              onOpenStatusEntry?.(entry);
            }}
            className="rounded-[22px] border p-3 text-left"
            style={{
              background: entry.hasUnviewed
                ? "var(--accent-soft)"
                : "var(--panel-subtle)",
              borderColor: entry.hasUnviewed
                ? "var(--accent-border)"
                : "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={entry.user?.profilePic || assets.avatar_icon}
                alt={entry.user?.fullName || "Status"}
                className="h-12 w-12 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p
                    className="truncate font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {entry.user?.fullName}
                  </p>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatConversationDate(entry.latestStatusAt)}
                  </span>
                </div>
                <p
                  className="mt-1 truncate text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {entry.statuses[0]?.text || "Photo update"}
                </p>
              </div>
            </div>
          </button>
        ))
      ) : (
        <div
          className="rounded-[22px] border px-5 py-8 text-center text-sm"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
            color: "var(--text-secondary)",
          }}
        >
          No statuses found.
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`flex h-full min-h-0 flex-col border-r px-4 py-4 ${selectedConversation && activeView === "chats" ? "max-lg:hidden" : ""}`}
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <BrandMark compact />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full px-3 py-2 text-xs font-medium"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border px-2 py-2"
                style={{
                  background: "var(--panel-subtle)",
                  borderColor: "var(--border-color)",
                }}
              >
                <img
                  src={authUser?.profilePic || assets.avatar_icon}
                  alt={authUser?.fullName || "Profile"}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <img src={assets.menu_icon} alt="" className="h-4 w-4 opacity-70" />
              </button>

              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 top-14 z-30 w-52 rounded-3xl border p-2 shadow-xl"
                  style={{
                    background: "var(--panel-bg)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateGroupOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Create group
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/profile");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-2xl px-4 py-3 text-left text-sm"
                    style={{ color: "var(--accent)" }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <img src={assets.search_icon} alt="Search" className="h-4 w-4" />
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                activeView === "status" ? "Search statuses" : "Search conversations"
              }
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            ["chats", "Chats"],
            ["status", "Status"],
          ].map(([view, label]) => {
            const isActive = activeView === view;

            return (
              <button
                key={view}
                type="button"
                onClick={() => onChangeView?.(view)}
                className="rounded-full px-4 py-2 text-sm font-medium"
                style={{
                  background: isActive ? "var(--accent)" : "var(--panel-muted)",
                  color: isActive ? "#ffffff" : "var(--text-primary)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          {activeView === "status" ? renderStatuses() : renderChats()}
        </div>
      </aside>

      {isCreateGroupOpen && (
        <CreateGroupModal
          key="create-group"
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          users={directConversations}
          onSubmit={handleCreateGroup}
        />
      )}
    </>
  );
};

export default Sidebar;
