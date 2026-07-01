import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/react";

type AuthControlsProps = {
  className?: string;
};

export function AuthControls({ className }: AuthControlsProps) {
  return (
    <div className={className}>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="home__btn home__btn--ghost">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="home__btn home__btn--primary">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton afterSignOutUrl="/" />
      </Show>
    </div>
  );
}
