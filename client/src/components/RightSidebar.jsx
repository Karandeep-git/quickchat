import { useContext, useMemo, useState } from "react";
import assets from "../assets/assets";
import CreateGroupModal from "./CreateGroupModal";
import {
  getConversationAvatar,
  getConversationSubtitle,
  getConversationTitle,
} from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";

const RightSidebar = () => {
  const {
    selectedConversation,
    messages,
    directConversations,
    updateGroup,
    removeGroupMember,
  } = useContext(ChatContext);
  const { onlineUsers, authUser } = useContext(AuthContext);

  const [isManageGroupOpen, setIsManageGroupOpen] = useState(false);

  const sharedImages = useMemo(
    () =>
      messages
        .filter((message) => Boolean(message.image))
        .map((message) => ({
          id: message._id,
          url: message.image,
        }))
        .reverse(),
    [messages],
  );

  if (!selectedConversation) {
    return null;
  }

  const isGroup = selectedConversation.type === "group";
  const isDirectOnline =
    !isGroup && onlineUsers.includes(String(selectedConversation.id));
  const isAdmin =
    isGroup &&
    String(selectedConversation.adminId) === String(authUser?._id);
  const availableUsers = directConversations.filter(
    (user) => !selectedConversation.memberIds?.includes(user._id),
  );

  const handleUpdateGroup = async (payload) => {
    return updateGroup(selectedConversation.id, payload);
  };

  return (
    <>
      <aside
        className="hidden h-full min-h-0 overflow-y-auto border-l p-5 lg:block"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div
          className="rounded-[24px] border p-5"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex flex-col items-center text-center">
            <img
              src={getConversationAvatar(selectedConversation, assets.avatar_icon)}
              alt={getConversationTitle(selectedConversation)}
              className="h-24 w-24 rounded-full object-cover"
            />
            <p
              className="mt-4 text-xs font-medium uppercase tracking-[0.24em]"
              style={{ color: "var(--accent)" }}
            >
              {isGroup ? "Group" : isDirectOnline ? "Online" : "Profile"}
            </p>
            <h3
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {getConversationTitle(selectedConversation)}
            </h3>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              {getConversationSubtitle(selectedConversation)}
            </p>

            {isGroup && isAdmin && (
              <button
                type="button"
                onClick={() => setIsManageGroupOpen(true)}
                className="mt-4 rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                Manage group
              </button>
            )}
          </div>
        </div>

        {isGroup && (
          <div
            className="mt-5 rounded-[24px] border p-5"
            style={{
              background: "var(--panel-subtle)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center justify-between">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Members
              </p>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selectedConversation.memberIds?.length || 0}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {(selectedConversation.members || []).map((member) => {
                const isMemberAdmin =
                  String(member._id) === String(selectedConversation.adminId);

                return (
                  <div
                    key={member._id}
                    className="rounded-[22px] border px-4 py-3"
                    style={{
                      background: "var(--panel-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.profilePic || assets.avatar_icon}
                        alt={member.fullName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {member.fullName}
                          </p>
                          {isMemberAdmin && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                              style={{ background: "var(--accent)" }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <p
                          className="truncate text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {member.bio || member.email}
                        </p>
                      </div>

                      {isAdmin && !isMemberAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            removeGroupMember(selectedConversation.id, member._id)
                          }
                          className="rounded-full px-3 py-1 text-xs font-medium"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="mt-5 rounded-[24px] border p-5"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Shared media
            </p>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sharedImages.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {sharedImages.length > 0 ? (
              sharedImages.map((image) => (
                <button
                  key={image.id || image.url}
                  type="button"
                  onClick={() =>
                    window.open(image.url, "_blank", "noopener,noreferrer")
                  }
                  className="overflow-hidden rounded-2xl"
                >
                  <img
                    src={image.url}
                    alt="Shared attachment"
                    className="aspect-square h-full w-full object-cover"
                  />
                </button>
              ))
            ) : (
              <p
                className="col-span-2 rounded-2xl px-4 py-8 text-center text-sm"
                style={{
                  background: "var(--panel-muted)",
                  color: "var(--text-secondary)",
                }}
              >
                No media shared yet.
              </p>
            )}
          </div>
        </div>
      </aside>

      {isManageGroupOpen && (
        <CreateGroupModal
          key={`manage-group-${selectedConversation.id}`}
          isOpen={isManageGroupOpen}
          onClose={() => setIsManageGroupOpen(false)}
          users={availableUsers}
          mode="manage"
          initialGroup={selectedConversation}
          onSubmit={handleUpdateGroup}
        />
      )}
    </>
  );
};

export default RightSidebar;
