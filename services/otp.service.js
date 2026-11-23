import { requestOTP } from "../src/modules/auth/auth.service.js";

const sendVerificationOTP = async (email, purpose) => {
  return await requestOTP(email, purpose);
};

export default sendVerificationOTP;
