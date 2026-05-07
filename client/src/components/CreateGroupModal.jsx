import { useMemo, useState } from "react";
import assets from "../assets/assets";

const encodeFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

const CreateGroupModal = ({
  isOpen,
  onClose,
  users,
  onSubmit,
  mode = "create",
  initialGroup = null,
}) => {
  const [name, setName] = useState(initialGroup?.name || "");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupImage, setGroupImage] = useState(null);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      if (!query) {
        return true;
      }

      return (
        user.fullName.toLowerCase().includes(query) ||
        `${user.bio || ""}`.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  if (!isOpen) {
    return null;
  }

  const isCreateMode = mode === "create";
  const title = isCreateMode ? "Create a group" : "Manage group";
  const ctaLabel = isCreateMode ? "Create group" : "Save changes";
  const initialGroupMemberIds = initialGroup?.memberIds || [];

  const resetAndClose = () => {
    setName("");
    setSelectedUserIds([]);
    setGroupImage(null);
    setSearch("");
    onClose();
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prevIds) =>
      prevIds.includes(userId)
        ? prevIds.filter((id) => id !== userId)
        : [...prevIds, userId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    let encodedGroupImage = "";
    if (groupImage) {
      encodedGroupImage = await encodeFile(groupImage);
    }

    const payload = {};

    if (name.trim()) {
      payload.name = name.trim();
    }

    if (selectedUserIds.length > 0) {
      payload.memberIds = selectedUserIds;
    }

    if (encodedGroupImage) {
      payload.groupImage = encodedGroupImage;
    }

    const createdOrUpdated = await onSubmit(payload);

    if (createdOrUpdated) {
      resetAndClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15, 23, 42, 0.42)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-[30px] border p-6 shadow-[0_24px_80px_var(--shadow-color)] sm:p-7"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-[0.24em]"
              style={{ color: "var(--accent)" }}
            >
              Group chat
            </p>
            <h2
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full px-4 py-2 text-sm"
            style={{
              background: "var(--panel-muted)",
              color: "var(--text-primary)",
            }}
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[160px_1fr]">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[26px] border border-dashed p-4 text-center"
            style={{
              background: "var(--panel-subtle)",
              borderColor: "var(--border-color)",
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(event) => setGroupImage(event.target.files?.[0] || null)}
            />
            <img
              src={
                groupImage
                  ? URL.createObjectURL(groupImage)
                  : initialGroup?.groupImage || assets.avatar_icon
              }
              alt="Group avatar"
              className="h-20 w-20 rounded-[24px] object-cover"
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Upload group photo
            </span>
          </label>

          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Group name"
              className="w-full rounded-2xl border px-4 py-3 outline-none"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
              required={isCreateMode}
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isCreateMode ? "Search people to add" : "Search more members to add"
              }
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>

        {!isCreateMode && initialGroupMemberIds.length > 0 && (
          <div className="mt-5">
            <p
              className="mb-3 text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Current members
            </p>
            <div className="flex flex-wrap gap-2">
              {users
                .filter((user) => initialGroupMemberIds.includes(user._id))
                .map((user) => (
                  <span
                    key={user._id}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      background: "var(--panel-muted)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {user.fullName}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid max-h-72 gap-3 overflow-y-auto pr-1">
          {filteredUsers.map((user) => {
            const isAlreadyMember = initialGroupMemberIds.includes(user._id);
            const isSelected = selectedUserIds.includes(user._id);

            return (
              <button
                key={user._id}
                type="button"
                onClick={() => !isAlreadyMember && handleToggleUser(user._id)}
                disabled={isAlreadyMember}
                className="flex items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition"
                style={{
                  background: isSelected
                    ? "var(--accent-soft)"
                    : "var(--panel-subtle)",
                  borderColor: isSelected
                    ? "var(--accent-border)"
                    : "var(--border-color)",
                  opacity: isAlreadyMember ? 0.72 : 1,
                }}
              >
                <img
                  src={user.profilePic || assets.avatar_icon}
                  alt={user.fullName}
                  className="h-11 w-11 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {user.fullName}
                  </p>
                  <p
                    className="truncate text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {user.bio || "Available to chat"}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: isAlreadyMember
                      ? "var(--panel-muted)"
                      : isSelected
                        ? "var(--accent)"
                        : "var(--panel-muted)",
                    color: isAlreadyMember
                      ? "var(--text-secondary)"
                      : isSelected
                        ? "#ffffff"
                        : "var(--text-secondary)",
                  }}
                >
                  {isAlreadyMember ? "Added" : isSelected ? "Selected" : "Add"}
                </span>
              </button>
            );
          })}

          {filteredUsers.length === 0 && (
            <div
              className="rounded-[22px] border px-4 py-8 text-center text-sm"
              style={{
                background: "var(--panel-subtle)",
                borderColor: "var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              No users matched your search.
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {selectedUserIds.length} new member
            {selectedUserIds.length === 1 ? "" : "s"} selected
          </p>
          <button
            type="submit"
            className="rounded-full px-5 py-3 font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            {ctaLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupModal;
