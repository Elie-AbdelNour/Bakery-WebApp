const API_BASE_URL = "/api";
let userEmail = "";

// ELEMENTS
const emailInput = document.getElementById("email");
const otpInput = document.getElementById("otp");

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const messageEl = document.getElementById("message");

// Show message
function showMessage(msg, type = "error") {
  if (!messageEl) return;
  messageEl.innerText = msg;

  messageEl.className =
    type === "success"
      ? "text-green-600 font-medium text-center mt-4"
      : "text-red-600 font-medium text-center mt-4";
}

// STEP SWITCHING
function goToStep(step) {
  if (step === "otp") {
    step1.classList.add("hidden");
    step2.classList.remove("hidden");
  } else {
    step2.classList.add("hidden");
    step1.classList.remove("hidden");
  }
}

// GO BACK TO EMAIL STEP
function goBackToEmail() {
  otpInput.value = "";
  showMessage("");
  goToStep("email");
}

// SEND OTP
async function requestOtp() {
  const email = emailInput.value.trim();
  if (!email) return showMessage("Please enter your email.");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 🔥 IMPORTANT FIX
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      userEmail = email;
      goToStep("otp");
      showMessage("OTP sent successfully!", "success");
      otpInput.focus();
    } else {
      showMessage(data.message || "Failed to send OTP");
    }
  } catch (err) {
    console.error(err);
    showMessage("Network error while sending OTP");
  }
}

// VERIFY OTP
async function verifyOtp() {
  const otp = otpInput.value.trim();
  if (!otp) return showMessage("Please enter OTP.");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✔ MUST HAVE to save JWT cookie
      body: JSON.stringify({ email: userEmail, otp }),
    });

    const data = await res.json();

    if (res.ok) {
      const role = data.user?.role?.toLowerCase();

      let redirect = "/home";
      if (role === "admin") redirect = "/admin";
      if (role === "driver") redirect = "/driver";

      showMessage("Login successful! Redirecting...", "success");

      setTimeout(() => (window.location.href = redirect), 900);
    } else {
      showMessage(data.message || "Invalid OTP");
    }
  } catch (err) {
    console.error(err);
    showMessage("Network error while verifying OTP");
  }
}
