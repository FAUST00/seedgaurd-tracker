(function () {
  const accountKey = "seedguard_accounts";
  const currentUserKey = "seedguard_current_user";
  const profileKey = "seedguard_profile";
  const apiBase = window.SEEDGUARD_API_BASE || "/api";
  const inOnboarding = window.location.pathname.includes("/onboarding/");
  const dashboardPath = inOnboarding ? "../dashboard/index.html" : "dashboard/index.html";
  const state = { mode: "signup" };

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(accountKey) || "[]");
    } catch {
      return [];
    }
  }

  function saveAccounts(accounts) {
    localStorage.setItem(accountKey, JSON.stringify(accounts));
  }

  function encodePassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
  }

  function setStatus(message, isError) {
    const status = document.querySelector("[data-auth-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("error", Boolean(isError));
  }

  function setProfile(user) {
    const goalDays = Number(user.goalDays || user.goal_days || 90);
    const createdAt = user.createdAt || user.created_at || new Date().toISOString();
    localStorage.setItem(
      profileKey,
      JSON.stringify({
        user_id: user.id || user.email || "guest",
        name: user.name || "Guest",
        email: user.email || "",
        goal_days: goalDays,
        created_at: createdAt,
        account_mode: user.accountMode || "account",
      })
    );
    localStorage.setItem(currentUserKey, user.email || "guest");
  }

  async function callApi(path, payload) {
    try {
      const response = await fetch(apiBase + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error || "Server error." };
      return data;
    } catch {
      return { networkError: true };
    }
  }

  function localSignup(name, email, password, goalDays) {
    const accounts = getAccounts();
    if (accounts.some((account) => account.email === email)) {
      return { error: "That email already has a local SeedGuard account." };
    }
    const account = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      email,
      password: encodePassword(password),
      goalDays,
      createdAt: new Date().toISOString(),
    };
    accounts.push(account);
    saveAccounts(accounts);
    return { user: account };
  }

  function localLogin(email, password) {
    const account = getAccounts().find((item) => item.email === email);
    if (!account) return { error: "No local account was found for that email." };
    if (account.password !== encodePassword(password)) {
      return { error: "Incorrect password. Please try again." };
    }
    return { user: account };
  }

  function renderForm() {
    const form = document.querySelector("[data-auth-form]");
    if (!form) return;
    const isSignup = state.mode === "signup";
    form.innerHTML = isSignup
      ? `
        <div class="goal-title">
          <div class="goal-icon" aria-hidden="true">◎</div>
          <div>
            <h2>Set Your Goal</h2>
            <p>Create an account or start privately on this device.</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="signupName">Name</label>
            <input id="signupName" autocomplete="name" required placeholder="Your name" />
          </div>
          <div class="field">
            <label for="signupEmail">Email</label>
            <input id="signupEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
          </div>
          <div class="field">
            <label for="signupPassword">Password</label>
            <input id="signupPassword" type="password" autocomplete="new-password" required placeholder="Create a password" />
          </div>
          <div class="field">
            <label for="signupGoal">Target Streak</label>
            <input id="signupGoal" type="number" min="1" max="3650" value="90" required />
          </div>
          <button class="submit-button" type="submit">Create Account</button>
          <button class="ghost-button" type="button" data-skip-account>Continue Without Account</button>
        </div>
        <p class="privacy-note">GitHub Pages cannot store accounts by itself. SeedGuard uses the backend API if it is deployed, and otherwise saves this profile locally in this browser.</p>
        <div class="status" data-auth-status></div>
      `
      : `
        <div class="goal-title">
          <div class="goal-icon" aria-hidden="true">↗</div>
          <div>
            <h2>Welcome Back</h2>
            <p>Sign in to restore your saved SeedGuard profile.</p>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
          </div>
          <div class="field">
            <label for="loginPassword">Password</label>
            <input id="loginPassword" type="password" autocomplete="current-password" required placeholder="Enter your password" />
          </div>
          <button class="submit-button" type="submit">Sign In</button>
          <button class="ghost-button" type="button" data-skip-account>Continue Without Account</button>
        </div>
        <p class="privacy-note">If the hosted backend is not connected yet, sign-in uses the account saved on this device.</p>
        <div class="status" data-auth-status></div>
      `;
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.authMode === mode);
    });
    renderForm();
  }

  function goToDashboard(user) {
    setProfile(user);
    window.location.href = dashboardPath;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("Saving your SeedGuard profile...", false);
    if (state.mode === "signup") {
      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim().toLowerCase();
      const password = document.getElementById("signupPassword").value;
      const goalDays = Number(document.getElementById("signupGoal").value || 90);
      if (!name || !email || !password) {
        setStatus("Fill in name, email, and password before continuing.", true);
        return;
      }
      const remote = await callApi("/signup", { name, email, password, goalDays });
      if (!remote.networkError && remote.error) {
        setStatus(remote.error, true);
        return;
      }
      const result = remote.user ? remote : localSignup(name, email, password, goalDays);
      if (result.error) {
        setStatus(result.error, true);
        return;
      }
      setStatus(remote.user ? "Account created. Entering SeedGuard..." : "Local profile created. Entering SeedGuard...", false);
      setTimeout(() => goToDashboard({ ...result.user, goalDays }), 450);
      return;
    }
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const remote = await callApi("/login", { email, password });
    if (!remote.networkError && remote.error) {
      setStatus(remote.error, true);
      return;
    }
    const result = remote.user ? remote : localLogin(email, password);
    if (result.error) {
      setStatus(result.error, true);
      return;
    }
    setStatus(remote.user ? "Signed in. Loading dashboard..." : "Local login restored. Loading dashboard...", false);
    setTimeout(() => goToDashboard(result.user), 450);
  }

  function skipAccount() {
    const goalInput = document.getElementById("signupGoal");
    const goalDays = Number(goalInput ? goalInput.value : 90) || 90;
    goToDashboard({
      id: "guest",
      name: "Guest",
      email: "",
      goalDays,
      createdAt: new Date().toISOString(),
      accountMode: "guest",
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-auth-mode]").forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.authMode));
    });
    const form = document.querySelector("[data-auth-form]");
    if (form) {
      form.addEventListener("submit", handleSubmit);
      form.addEventListener("click", (event) => {
        if (event.target.matches("[data-skip-account]")) skipAccount();
      });
    }
    setMode("signup");
  });
})();
