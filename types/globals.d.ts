export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: "CLIENT" | "ACCOUNTANT";
      onboarded?: boolean;
    };
  }
}
