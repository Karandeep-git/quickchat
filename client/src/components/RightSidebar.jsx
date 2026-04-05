import { useContext, useMemo } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);
  const sharedImages = useMemo(
    () =>
      messages
        .filter((message) => Boolean(message.image))
        .map((message) => ({
          id: message._id,
          url: message.image,
          createdAt: message.createdAt,
        }))
        .reverse(),
    [messages],
  );

  if (!selectedUser) {
    return null;
  }

  return selectedUser && (
    <div className="bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll max-md:hidden">
      <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt={selectedUser.fullName}
          className="w-20 aspect-square rounded-full"
        />
        <div className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${onlineUsers.includes(selectedUser._id) ? "bg-green-500" : "bg-gray-500"}`}
          ></span>
          {selectedUser.fullName}
        </div>
        <p className="px-10 mx-auto text-center">{selectedUser.bio}</p>
      </div>

      <hr className="border-[#ffffff50] my-4" />

      <div className="px-5 pb-24 text-xs">
        <p>Media</p>
        <div className="mt-2 max-h-50 overflow-y-scroll grid grid-cols-2 gap-4 opacity-80">
          {sharedImages.length > 0 ? (
            sharedImages.map((image) => (
              <button
                key={image.id || `${image.url}-${image.createdAt}`}
                type="button"
                onClick={() =>
                  window.open(image.url, "_blank", "noopener,noreferrer")
                }
                className="cursor-pointer overflow-hidden rounded-md"
              >
                <img
                  src={image.url}
                  alt="Shared media preview"
                  className="aspect-square h-full w-full rounded-md object-cover"
                />
              </button>
            ))
          ) : (
            <p className="col-span-2 text-gray-300">No shared media yet.</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer"
      >
        Logout
      </button>
    </div>
  );
};

export default RightSidebar;
