import authRoutes from "./auth.routes.js";
import Auth from "./models/auth.model.js";
import EmailOTP from "./models/otp.model.js";
import * as authService from "./auth.service.js";

export { authRoutes, Auth, EmailOTP, authService };
export default authRoutes;
