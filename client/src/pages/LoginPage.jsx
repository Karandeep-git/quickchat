import { useContext, useState } from "react";
import BrandMark from "../components/BrandMark";
import { AuthContext } from "../../context/AuthContext";

const LoginPage = () => {
  const [currentState, setCurrentState] = useState("Sign up");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const { login } = useContext(AuthContext);

  const onSubmitHandler = (event) => {
    event.preventDefault();

    if (!acceptedTerms) {
      return;
    }

    if (currentState === "Sign up" && !isDataSubmitted) {
      setIsDataSubmitted(true);
      return;
    }

    login(currentState === "Sign up" ? "signup" : "login", {
      fullName,
      email,
      password,
      bio,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-[28px] border p-7 shadow-[0_18px_60px_var(--shadow-color)] sm:p-8"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="mb-8 text-center">
          <BrandMark />
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to continue your conversations.
          </p>
        </div>

        <form onSubmit={onSubmitHandler}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {currentState === "Sign up" ? "Create account" : "Login"}
              </p>
            </div>
            {isDataSubmitted && (
              <button
                type="button"
                onClick={() => setIsDataSubmitted(false)}
                className="rounded-full px-3 py-1 text-sm"
                style={{
                  background: "var(--panel-muted)",
                  color: "var(--text-primary)",
                }}
              >
                Back
              </button>
            )}
          </div>

          <div className="space-y-4">
            {currentState === "Sign up" && !isDataSubmitted && (
              <input
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
                type="text"
                placeholder="Full name"
                required
                className="w-full rounded-2xl border px-4 py-3 outline-none"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              />
            )}

            {!isDataSubmitted && (
              <>
                <input
                  onChange={(event) => setEmail(event.target.value)}
                  value={email}
                  type="email"
                  placeholder="Email address"
                  required
                  className="w-full rounded-2xl border px-4 py-3 outline-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  onChange={(event) => setPassword(event.target.value)}
                  value={password}
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full rounded-2xl border px-4 py-3 outline-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
              </>
            )}

            {currentState === "Sign up" && isDataSubmitted && (
              <textarea
                onChange={(event) => setBio(event.target.value)}
                value={bio}
                rows={4}
                placeholder="Short bio"
                required
                className="w-full rounded-2xl border px-4 py-3 outline-none"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              ></textarea>
            )}
          </div>

          <label
            className="mt-4 flex items-center gap-3 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={() => setAcceptedTerms((prev) => !prev)}
            />
            I agree to the terms and privacy policy.
          </label>

          <button
            type="submit"
            className="mt-6 w-full rounded-full px-4 py-3 font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            {currentState === "Sign up"
              ? isDataSubmitted
                ? "Create account"
                : "Continue"
              : "Login"}
          </button>

          <p
            className="mt-5 text-center text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {currentState === "Sign up" ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentState("Login");
                    setIsDataSubmitted(false);
                  }}
                  className="font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentState("Sign up")}
                  className="font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
