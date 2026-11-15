/** Signup is closed unless ALLOW_SIGNUP=true, so a deployment isn't open to the internet by default. */
export const signupOpen = () => process.env.ALLOW_SIGNUP === "true";
