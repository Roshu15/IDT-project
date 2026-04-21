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
  const passwordInput = byId("password");
  const toggle = byId("passwordToggle");
  if (!passwordInput || !toggle) return;

  toggle.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    toggle.textContent = shouldShow ? "Hide" : "Show";
    toggle.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
  });
}

function bindLoginForm() {
  const form = byId("loginForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = byId("email")?.value.trim() || "";
    const password = byId("password")?.value || "";
    const feedback = byId("loginFeedback");

    if (!email.includes("@")) {
      if (feedback) feedback.textContent = "Please enter a valid email address.";
      return;
    }

    if (password.length < 6) {
      if (feedback) feedback.textContent = "Password must be at least 6 characters.";
      return;
    }

    localStorage.setItem("smartClassroomUser", email);
    localStorage.setItem("smartClassroomUserName", formatUserName(email));

    if (feedback) feedback.textContent = "Login successful. Redirecting to dashboard...";
    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  });
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
  bindLoginForm();
  bindContactForm();
});
