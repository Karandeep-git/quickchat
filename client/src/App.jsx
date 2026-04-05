import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import assets from "./assets/assets";

const App = () => {
  const { authUser, isAuthReady } = useContext(AuthContext);

  if (!isAuthReady) {
    return (
      <div
        className="min-h-screen bg-cover bg-no-repeat bg-center flex items-center justify-center text-white"
        style={{ backgroundImage: `url(${assets.bgImage})` }}
      >
        <p className="rounded-full border border-white/20 bg-black/20 px-5 py-2 backdrop-blur-md">
          Loading chat...
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-[url('/bgImage.svg)] min-h-screen bg-cover bg-no-repeat bg-center"
    >
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};

export default App;
