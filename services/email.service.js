// your services code here
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_dev_key");

const sendOTPEmail = async ({ to, otp, purpose }) => {
  const isSignup = purpose === "SIGNUP";

  const subject = isSignup
    ? "Verify your college email | Begin"
    : "Your login verification code | Begin";

  const heading = isSignup
    ? "Welcome to Begin!"
    : "Welcome back!";

  const message = isSignup
    ? "Verify your college email to join our student founders community."
    : "Use this code to securely log in to your Begin account.";

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [to],
    subject,

    html: `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 40px 16px;
          background: #f5f5f5;
          font-family: Arial, sans-serif;
        ">
          <div style="
            max-width: 460px;
            margin: auto;
            padding: 36px;
            background: #ffffff;
            border-radius: 14px;
          ">
            <h1 style="color: #111;">
              ${heading}
            </h1>

            <p style="
              color: #666;
              font-size: 15px;
              line-height: 1.7;
            ">
              ${message}
            </p>

            <div style="
              margin: 30px 0;
              padding: 24px;
              background: #f5f5f5;
              border-radius: 10px;
              text-align: center;
            ">
              <h1 style="
                margin: 0;
                font-size: 36px;
                letter-spacing: 10px;
                color: #111;
              ">
                ${otp}
              </h1>
            </div>

            <p style="color: #777; font-size: 14px;">
              This code expires in 5 minutes.
            </p>

            <p style="color: #777; font-size: 14px;">
              Never share this code with anyone.
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #eee;
              margin: 30px 0;
            " />

            <p style="
              color: #999;
              font-size: 13px;
              text-align: center;
            ">
              Begin — Built for student founders.
            </p>
          </div>
        </body>
      </html>
    `,

    text: `
      ${heading}

      ${message}

      Your verification code is: ${otp}

      This code expires in 5 minutes.
      Never share this code with anyone.
    `,
  });

  if (error) {
    console.error("Resend API error:", error);
    throw new Error("Unable to send verification email.");
  }

  console.log("Email sent successfully:", data.id);

  return data;
};

export default sendOTPEmail;
