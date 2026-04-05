import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { ChatContext } from "./chat-context";

export { ChatContext } from "./chat-context";

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  const getUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/messages/users");

      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  }, [axios]);

  const getMessages = useCallback(
    async (userId) => {
      try {
        const { data } = await axios.get(`/api/messages/${userId}`);

        if (data.success) {
          setMessages(data.messages);
          setUnseenMessages((prev) => ({ ...prev, [userId]: 0 }));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios],
  );

  const sendMessage = useCallback(
    async (messageData) => {
      if (!selectedUser?._id) {
        return;
      }

      try {
        const { data } = await axios.post(
          `/api/messages/send/${selectedUser._id}`,
          messageData,
        );

        if (data.success) {
          setMessages((prevMessages) => [...prevMessages, data.newMessage]);
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message);
      }
    },
    [axios, selectedUser],
  );

  const subscribeToMessages = useCallback(() => {
    if (!socket) {
      return;
    }

    socket.on("newMessage", (newMessage) => {
      const senderId = newMessage.senderId?.toString
        ? newMessage.senderId.toString()
        : String(newMessage.senderId);

      if (selectedUser && senderId === String(selectedUser._id)) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`).catch(() => {});
        return;
      }

      setUnseenMessages((prevUnseenMessages) => ({
        ...prevUnseenMessages,
        [senderId]: prevUnseenMessages[senderId]
          ? prevUnseenMessages[senderId] + 1
          : 1,
      }));
    });
  }, [axios, selectedUser, socket]);

  const unsubscribeFromMessages = useCallback(() => {
    if (socket) {
      socket.off("newMessage");
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  const value = {
    messages,
    getMessages,
    users,
    selectedUser,
    getUsers,
    setMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
