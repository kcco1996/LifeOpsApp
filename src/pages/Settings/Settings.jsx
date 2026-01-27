import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "../../utils/firebase"; // adjust path if needed
import { useAuth } from "../../hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      {!user ? (
        <button onClick={() => signInWithPopup(auth, provider)}>
          Sign in with Google
        </button>
      ) : (
        <>
          <div>Signed in as: {user.email}</div>
          <button onClick={() => signOut(auth)}>Sign out</button>
        </>
      )}
    </div>
  );
}