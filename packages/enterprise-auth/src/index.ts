export { OktaIdentityProvider } from "./okta-identity-provider.js";
export { EnterpriseAuthPlugin } from "./enterprise-auth-plugin.js";

// Default export for dynamic loading via loadEnterprisePlugin("auth")
import { EnterpriseAuthPlugin } from "./enterprise-auth-plugin.js";
export default new EnterpriseAuthPlugin();
