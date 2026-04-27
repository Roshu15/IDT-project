function byId(id) {
  return document.getElementById(id);
}

const THEME_STORAGE_KEY = "smartClassroomTheme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function bindThemeToggle() {
  const toggle = byId("themeToggle");
  const setToggleLabel = (theme) => {
    if (!toggle) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    const nextLabel = nextTheme === "dark" ? "Dark Theme" : "Light Theme";
    toggle.textContent = nextLabel;
    toggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  };

  const activeTheme = getPreferredTheme();
  applyTheme(activeTheme);
  setToggleLabel(activeTheme);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setToggleLabel(next);
  });
}

function formatUserName(email) {
  if (!email) return "Demo User";
  const [namePart] = email.split("@");
  if (!namePart) return "Demo User";
  return namePart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function bindPasswordToggle() {
  const toggles = document.querySelectorAll("[data-password-target]");
  if (!toggles.length) return;

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-password-target");
      const passwordInput = targetId ? byId(targetId) : null;
      if (!passwordInput) return;

      const shouldShow = passwordInput.type === "password";
      passwordInput.type = shouldShow ? "text" : "password";
      toggle.textContent = shouldShow ? "Hide" : "Show";
      toggle.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    });
  });
}

function setFeedback(id, message, isError = false) {
  const feedback = byId(id);
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
}

function storeLoggedInUser(user) {
  localStorage.setItem("smartClassroomUser", user.email);
  localStorage.setItem("smartClassroomUserName", user.name || formatUserName(user.email));
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function bindAuthTabs() {
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const loginForm = byId("loginForm");
  const signupForm = byId("signupForm");
  const authEyebrow = byId("authEyebrow");
  const authTitle = byId("authTitle");
  const authDescription = byId("authDescription");
  if (!tabs.length || !loginForm || !signupForm) return;

  const updateAuthCopy = (showLogin) => {
    if (authEyebrow) {
      authEyebrow.textContent = showLogin ? "Log In" : "Sign Up";
    }

    if (authTitle) {
      authTitle.textContent = showLogin ? "Welcome back" : "Create your account";
    }

    if (authDescription) {
      authDescription.textContent = showLogin
        ? "Log in to continue to the dashboard."
        : "Create your account to continue to the dashboard.";
    }
  };

  updateAuthCopy(true);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-auth-tab");
      const showLogin = mode === "login";
      loginForm.hidden = !showLogin;
      signupForm.hidden = showLogin;
      loginForm.classList.toggle("active", showLogin);
      signupForm.classList.toggle("active", !showLogin);

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      updateAuthCopy(showLogin);
    });
  });
}

function bindAuthForms() {
  const loginForm = byId("loginForm");
  const signupForm = byId("signupForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = byId("loginEmail")?.value.trim() || "";
      const password = byId("loginPassword")?.value || "";

      if (!email.includes("@")) {
        setFeedback("loginFeedback", "Please enter a valid email address.", true);
        return;
      }

      if (password.length < 6) {
        setFeedback("loginFeedback", "Password must be at least 6 characters.", true);
        return;
      }

      setFeedback("loginFeedback", "Checking your account...");

      try {
        const result = await postJson("/api/auth/login", { email, password });
        storeLoggedInUser(result.user);
        setFeedback("loginFeedback", "Login successful. Redirecting to dashboard...");
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);
      } catch (error) {
        setFeedback("loginFeedback", error.message, true);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = byId("signupName")?.value.trim() || "";
      const email = byId("signupEmail")?.value.trim() || "";
      const password = byId("signupPassword")?.value || "";

      if (!name || !email || !password) {
        setFeedback("signupFeedback", "Please fill in all fields.", true);
        return;
      }

      if (!email.includes("@")) {
        setFeedback("signupFeedback", "Please enter a valid email address.", true);
        return;
      }

      if (password.length < 6) {
        setFeedback("signupFeedback", "Password must be at least 6 characters.", true);
        return;
      }

      setFeedback("signupFeedback", "Creating your account...");

      try {
        const result = await postJson("/api/auth/signup", { name, email, password });
        storeLoggedInUser(result.user);
        setFeedback("signupFeedback", "Account created. Redirecting to dashboard...");
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);
      } catch (error) {
        setFeedback("signupFeedback", error.message, true);
      }
    });
  }
}

function bindContactForm() {
  const form = byId("contactForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = byId("contactName")?.value.trim() || "";
    const email = byId("contactEmail")?.value.trim() || "";
    const message = byId("contactMessage")?.value.trim() || "";
    const feedback = byId("contactFeedback");

    if (!name || !email || !message) {
      if (feedback) feedback.textContent = "Please fill in all fields before sending your message.";
      return;
    }

    if (!email.includes("@")) {
      if (feedback) feedback.textContent = "Please enter a valid email address.";
      return;
    }

    if (feedback) feedback.textContent = "Message received. We will get back to you soon.";
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindThemeToggle();
  bindPasswordToggle();
  bindAuthTabs();
  bindAuthForms();
  bindContactForm();
});
