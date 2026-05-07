import { useContext, useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import StatusWorkspace from "../components/StatusWorkspace";
import { ChatContext } from "../../context/ChatContext";

const HomePage = () => {
  const { selectedConversation } = useContext(ChatContext);
  const [activeView, setActiveView] = useState("chats");
  const [statusPreviewEntry, setStatusPreviewEntry] = useState(null);

  const showConversationDetails =
    activeView === "chats" && Boolean(selectedConversation);

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-16 top-8 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "var(--home-glow-primary)" }}
        ></div>
        <div
          className="absolute right-0 top-1/3 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "var(--home-glow-secondary)" }}
        ></div>
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "var(--home-glow-tertiary)" }}
        ></div>
      </div>

      <div
        className={`relative mx-auto grid h-[calc(100vh-1.5rem)] max-w-[1700px] overflow-hidden rounded-[28px] border shadow-[0_18px_60px_var(--shadow-color)] backdrop-blur-xl sm:h-[calc(100vh-2rem)] ${
          showConversationDetails
            ? "grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.35fr)_minmax(300px,1fr)]"
            : "grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_minmax(0,1.35fr)]"
        }`}
        style={{
          background: "var(--shell-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          onOpenStatusEntry={setStatusPreviewEntry}
        />
        {activeView === "status" ? (
          <StatusWorkspace
            key={statusPreviewEntry?.userId || "status-workspace"}
            initialEntry={statusPreviewEntry}
            onEntryHandled={() => setStatusPreviewEntry(null)}
          />
        ) : (
          <ChatContainer />
        )}
        {showConversationDetails && <RightSidebar />}
      </div>
    </div>
  );
};

export default HomePage;
