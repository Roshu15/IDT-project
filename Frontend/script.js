function byId(id) {
  return document.getElementById(id);
}

function bindLoginForm() {
  const form = byId('loginForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = byId('email')?.value.trim() || '';
    const password = byId('password')?.value || '';
    const feedback = byId('loginFeedback');

    if (!email.includes('@')) {
      if (feedback) feedback.textContent = 'Please enter a valid email address.';
      return;
    }

    if (password.length < 6) {
      if (feedback) feedback.textContent = 'Password must be at least 6 characters.';
      return;
    }

    localStorage.setItem('smartClassroomUser', email);
    if (feedback) feedback.textContent = 'Login successful. Redirecting to dashboard...';
    window.setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  });
}

function bindContactForm() {
  const form = byId('contactForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = byId('contactName')?.value.trim() || '';
    const email = byId('contactEmail')?.value.trim() || '';
    const message = byId('contactMessage')?.value.trim() || '';
    const feedback = byId('contactFeedback');

    if (!name || !email || !message) {
      if (feedback) feedback.textContent = 'Please fill in all fields before sending your message.';
      return;
    }

    if (!email.includes('@')) {
      if (feedback) feedback.textContent = 'Please enter a valid email address.';
      return;
    }

    if (feedback) feedback.textContent = 'Message received. We will get back to you soon.';
    form.reset();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindLoginForm();
  bindContactForm();
});
