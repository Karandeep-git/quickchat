import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { AuthContext } from "./auth-context";

export { AuthContext } from "./auth-context";

const backendUrl =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

axios.defaults.baseURL = backendUrl;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const connectSocket = useCallback((userData, authToken) => {
    if (!userData) {
      return;
    }

    setSocket((currentSocket) => {
      if (currentSocket?.connected) {
        return currentSocket;
      }

      const nextSocket = io(backendUrl, {
        autoConnect: false,
        auth: { token: authToken },
      });

      nextSocket.on("getOnlineUsers", (userIds) => {
        setOnlineUsers(userIds);
      });

      nextSocket.connect();
      return nextSocket;
    });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    delete axios.defaults.headers.common.token;
    setSocket((currentSocket) => {
      currentSocket?.disconnect();
      return null;
    });
  }, []);

  const checkAuth = useCallback(async () => {
    if (!token) {
      setAuthUser(null);
      setOnlineUsers([]);
      delete axios.defaults.headers.common.token;
      setIsAuthReady(true);
      return;
    }

    try {
      const { data } = await axios.get("/api/auth/check");

      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user, token);
      }
    } catch {
      clearSession();
    } finally {
      setIsAuthReady(true);
    }
  }, [clearSession, connectSocket, token]);

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);

      if (data.success) {
        setAuthUser(data.userData);
        axios.defaults.headers.common.token = data.token;
        setToken(data.token);
        localStorage.setItem("token", data.token);
        connectSocket(data.userData, data.token);
        setIsAuthReady(true);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const logout = () => {
    clearSession();
    setIsAuthReady(true);
    toast.success("Logout successfully!");
  };

  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);

      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.token = token;
    }

    checkAuth();
  }, [checkAuth, token]);

  useEffect(() => {
    return () => socket?.disconnect();
  }, [socket]);

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    isAuthReady,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
