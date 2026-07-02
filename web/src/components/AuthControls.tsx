import { Show, SignInButton, UserButton } from "@clerk/react";

type AuthControlsProps = {
  className?: string;
};

export function AuthControls({ className }: AuthControlsProps) {
  return (
    <div className={className}>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="home__btn home__btn--primary">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton afterSignOutUrl="/" />
      </Show>
    </div>
  );
}
