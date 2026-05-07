import { useContext, useMemo, useState } from "react";
import BrandMark from "./BrandMark";
import StatusComposerModal from "./StatusComposerModal";
import StatusViewerModal from "./StatusViewerModal";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatConversationDate } from "../lib/utils";

const StatusWorkspace = ({ initialEntry = null, onEntryHandled }) => {
  const {
    myStatuses,
    statusContacts,
    createStatus,
    deleteStatus,
    markStatusViewed,
  } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(initialEntry);

  const myEntry = useMemo(
    () => ({
      userId: authUser?._id,
      user: authUser,
      statuses: myStatuses,
      hasUnviewed: false,
      latestStatusAt: myStatuses[0]?.createdAt || null,
    }),
    [authUser, myStatuses],
  );

  return (
    <>
      <section
        className="flex h-full min-h-0 flex-col"
        style={{ background: "var(--chat-bg)" }}
      >
        <div className="border-b px-4 py-5 md:px-6" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                Status
              </p>
              <h2
                className="mt-1 text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Daily updates
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="rounded-full px-5 py-3 font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              New status
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div
              className="min-w-0 rounded-[28px] border p-5"
              style={{
                background: "var(--panel-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                    My status
                  </p>
                  <h3
                    className="mt-2 text-xl font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Share a quick update
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="rounded-full px-4 py-2 text-sm"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  Add
                </button>
              </div>

              {myStatuses.length > 0 ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {myStatuses.map((status) => (
                    <button
                      key={status._id}
                      type="button"
                      onClick={() => setSelectedEntry(myEntry)}
                      className="rounded-[24px] border p-4 text-left"
                      style={{
                        background: "var(--panel-subtle)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      {status.image && (
                        <img
                          src={status.image}
                          alt="My status"
                          className="mb-3 h-44 w-full rounded-[20px] object-cover"
                        />
                      )}
                      <p
                        className="line-clamp-2 text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {status.text || "Photo update"}
                      </p>
                      <div
                        className="mt-3 flex items-center justify-between text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span>{formatConversationDate(status.createdAt)}</span>
                        <span>{status.viewerCount || 0} views</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="mt-5 rounded-[24px] border px-5 py-10 text-center"
                  style={{
                    background: "var(--panel-subtle)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <BrandMark compact />
                  <p
                    className="mt-4 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Share text or a photo and it will stay live for 24 hours.
                  </p>
                </div>
              )}
            </div>

            <div
              className="min-w-0 rounded-[28px] border p-5"
              style={{
                background: "var(--panel-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                    Recent updates
                  </p>
                  <h3
                    className="mt-2 text-xl font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    View your contacts' statuses
                  </h3>
                </div>
                <span
                  className="shrink-0 text-right text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {statusContacts.length} active
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {statusContacts.length > 0 ? (
                  statusContacts.map((entry) => (
                    <button
                      key={entry.userId}
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                      className="block w-full max-w-full overflow-hidden rounded-[24px] border p-4 text-left"
                      style={{
                        background: entry.hasUnviewed
                          ? "var(--accent-soft)"
                          : "var(--panel-subtle)",
                        borderColor: entry.hasUnviewed
                          ? "var(--accent-border)"
                          : "var(--border-color)",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={entry.user?.profilePic}
                          alt={entry.user?.fullName}
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className="min-w-0 truncate font-medium"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {entry.user?.fullName}
                            </p>
                            <span
                              className="shrink-0 text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
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
                    className="rounded-[24px] border px-5 py-10 text-center text-sm"
                    style={{
                      background: "var(--panel-subtle)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    No recent statuses from your contacts yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isComposerOpen && (
        <StatusComposerModal
          key="status-composer"
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onSubmit={createStatus}
        />
      )}

      {selectedEntry && (
        <StatusViewerModal
          key={`${selectedEntry.userId}-${selectedEntry.statuses?.[0]?._id || "status"}`}
          isOpen={Boolean(selectedEntry)}
          entry={selectedEntry}
          onClose={() => {
            setSelectedEntry(null);
            onEntryHandled?.();
          }}
          onViewStatus={markStatusViewed}
          onDeleteStatus={deleteStatus}
        />
      )}
    </>
  );
};

export default StatusWorkspace;
