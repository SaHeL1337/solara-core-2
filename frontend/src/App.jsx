import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import './App.css'

function App() {

  return (
    <>
      <header>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main>
        <SignedIn>
          <p>Hellooo  2223 Welcome, you are signed in.</p>
        </SignedIn>
        <SignedOut>
          <p>You are signed out.</p>
        </SignedOut>
      </main>
    </>
  )
}

export default App
