import { useEffect, useMemo, useState } from "react";
import { formatConversationDate, formatMessageTime } from "../lib/utils";

const StatusViewerModal = ({
  isOpen,
  entry,
  onClose,
  onViewStatus,
  onDeleteStatus,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const statuses = entry?.statuses || [];
  const currentStatus = statuses[currentIndex];

  useEffect(() => {
    if (!isOpen || !currentStatus || currentStatus.isMine || currentStatus.hasViewed) {
      return;
    }

    onViewStatus?.(currentStatus._id);
  }, [currentStatus, isOpen, onViewStatus]);

  const viewerSummary = useMemo(() => {
    if (!currentStatus?.isMine) {
      return [];
    }

    return [...(currentStatus.viewers || [])].sort(
      (viewerA, viewerB) => new Date(viewerB.viewedAt) - new Date(viewerA.viewedAt),
    );
  }, [currentStatus]);

  if (!isOpen || !entry || !currentStatus) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(15, 23, 42, 0.72)" }}
    >
      <div
        className="grid w-full max-w-5xl gap-6 rounded-[32px] border p-5 shadow-[0_32px_120px_rgba(15,23,42,0.45)] lg:grid-cols-[minmax(0,1fr)_320px]"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                {entry.user?.fullName || "Status"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {formatConversationDate(currentStatus.createdAt)} at{" "}
                {formatMessageTime(currentStatus.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm"
              style={{
                background: "var(--panel-muted)",
                color: "var(--text-primary)",
              }}
            >
              Close
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {statuses.map((status, index) => (
              <span
                key={status._id}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background:
                    index <= currentIndex ? "var(--accent)" : "var(--border-color)",
                }}
              ></span>
            ))}
          </div>

          <div
            className="flex min-h-[420px] flex-col justify-between rounded-[30px] border p-6"
            style={{
              background: "var(--panel-subtle)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="space-y-4">
              {currentStatus.image && (
                <img
                  src={currentStatus.image}
                  alt="Status"
                  className="max-h-[360px] w-full rounded-[24px] object-cover"
                />
              )}

              {currentStatus.text && (
                <p
                  className="whitespace-pre-wrap text-lg leading-8"
                  style={{ color: "var(--text-primary)" }}
                >
                  {currentStatus.text}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  className="rounded-full px-4 py-2 text-sm disabled:opacity-50"
                  style={{
                    background: "var(--panel-muted)",
                    color: "var(--text-primary)",
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentIndex === statuses.length - 1}
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      Math.min(prev + 1, statuses.length - 1),
                    )
                  }
                  className="rounded-full px-4 py-2 text-sm disabled:opacity-50"
                  style={{
                    background: "var(--panel-muted)",
                    color: "var(--text-primary)",
                  }}
                >
                  Next
                </button>
              </div>

              {currentStatus.isMine && (
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteStatus?.(currentStatus._id);
                    onClose();
                  }}
                  className="rounded-full px-4 py-2 text-sm text-white"
                  style={{ background: "var(--accent)" }}
                >
                  Delete status
                </button>
              )}
            </div>
          </div>
        </div>

        <aside
          className="rounded-[28px] border p-5"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
          }}
        >
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {currentStatus.isMine ? "Seen by" : "Status details"}
          </h3>

          {currentStatus.isMine ? (
            viewerSummary.length > 0 ? (
              <div className="mt-4 space-y-3">
                {viewerSummary.map((viewer) => (
                  <div
                    key={`${viewer.userId}-${viewer.viewedAt}`}
                    className="rounded-[22px] border px-4 py-3"
                    style={{
                      background: "var(--panel-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <p
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {viewer.fullName || "Viewer"}
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Viewed {formatConversationDate(viewer.viewedAt)} at{" "}
                      {formatMessageTime(viewer.viewedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                No one has viewed this status yet.
              </p>
            )
          ) : (
            <div className="mt-4 space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <p>
                {currentStatus.hasViewed
                  ? "You have already viewed this update."
                  : "This update will be marked as viewed when opened."}
              </p>
              <p>
                Expires {formatConversationDate(currentStatus.expiresAt)} at{" "}
                {formatMessageTime(currentStatus.expiresAt)}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default StatusViewerModal;
