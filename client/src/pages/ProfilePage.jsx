import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import BrandMark from "../components/BrandMark";
import { AuthContext } from "../../context/AuthContext";

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState(null);
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, [authUser, navigate]);

  const previewImage = useMemo(
    () =>
      selectedImage
        ? URL.createObjectURL(selectedImage)
        : authUser?.profilePic || assets.avatar_icon,
    [authUser?.profilePic, selectedImage],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    let encodedImage = "";

    if (selectedImage) {
      encodedImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(selectedImage);
      });
    }

    await updateProfile({
      fullName: name,
      bio,
      profilePic: encodedImage || undefined,
    });

    navigate("/");
  };

  if (!authUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border shadow-[0_18px_60px_var(--shadow-color)] lg:grid-cols-[0.95fr_1.05fr]"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <section
          className="border-b p-8 lg:border-b-0 lg:border-r"
          style={{
            background: "var(--panel-subtle)",
            borderColor: "var(--border-color)",
          }}
        >
          <BrandMark compact />
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Keep your profile updated so your chats stay personal and clear.
          </p>

          <div
            className="mt-8 rounded-[24px] p-5"
            style={{ background: "var(--panel-muted)" }}
          >
            <img
              src={previewImage}
              alt={authUser.fullName}
              className="h-28 w-28 rounded-full object-cover"
            />
            <h2
              className="mt-4 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {name || authUser.fullName}
            </h2>
            <p
              className="mt-2 text-sm leading-6"
              style={{ color: "var(--text-secondary)" }}
            >
              {bio || "Add a short bio to introduce yourself in conversations."}
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-4">
              <h3
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Edit profile
              </h3>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full px-4 py-2 text-sm"
                style={{
                  background: "var(--panel-muted)",
                  color: "var(--text-primary)",
                }}
              >
                Back
              </button>
            </div>

            <label
              className="mt-7 flex cursor-pointer items-center gap-4 rounded-[24px] border p-4"
              style={{
                background: "var(--panel-subtle)",
                borderColor: "var(--border-color)",
              }}
            >
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                hidden
                onChange={(event) =>
                  setSelectedImage(event.target.files?.[0] || null)
                }
              />
              <img
                src={previewImage}
                alt="Profile preview"
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <p
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Upload profile image
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  PNG or JPG works best.
                </p>
              </div>
            </label>

            <div className="mt-6 space-y-4">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Your full name"
                required
                className="w-full rounded-2xl border px-4 py-3 outline-none"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Write a short bio"
                required
                rows={5}
                className="w-full rounded-2xl border px-4 py-3 outline-none"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              ></textarea>
            </div>

            <button
              type="submit"
              className="mt-6 rounded-full px-5 py-3 font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Save changes
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
