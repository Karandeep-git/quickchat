import { useState } from "react";

const encodeFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

const StatusComposerModal = ({ isOpen, onClose, onSubmit }) => {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsSubmitting(true);

    let image = "";
    if (imageFile) {
      image = await encodeFile(imageFile);
    }

    const created = await onSubmit({
      text,
      image,
    });

    setIsSubmitting(false);

    if (created) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15, 23, 42, 0.42)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-[30px] border p-6 shadow-[0_24px_80px_var(--shadow-color)] sm:p-7"
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
              Status
            </p>
            <h2
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Share an update
            </h2>
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

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          placeholder="What do you want to share?"
          className="mt-6 w-full rounded-[24px] border px-4 py-4 outline-none"
          style={{
            background: "var(--input-bg)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        ></textarea>

        <label
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed px-4 py-6 text-center"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
          }}
        >
          <input
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
          />
          {imageFile ? (
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Status preview"
              className="max-h-56 rounded-[22px] object-cover"
            />
          ) : (
            <div
              className="rounded-full px-4 py-2 text-sm"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              Add image
            </div>
          )}
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {imageFile ? imageFile.name : "Upload a photo for your status"}
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Statuses disappear automatically after 24 hours.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full px-5 py-3 font-medium text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {isSubmitting ? "Sharing..." : "Share status"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StatusComposerModal;
