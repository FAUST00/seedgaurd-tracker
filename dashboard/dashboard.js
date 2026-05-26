(function () {
  const profileKey = "seedguard_profile";
  const relapsesKey = "seedguard_relapses";
  const journalsKey = "seedguard_journals";
  const currentUserKey = "seedguard_current_user";

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getProfile() {
    const profile = readJson(profileKey, null);
    if (!profile) {
      window.location.replace("../onboarding/index.html");
      return null;
    }
    return profile;
  }

  function latestRelapse() {
    const relapses = readJson(relapsesKey, []);
    return relapses.length
      ? [...relapses].sort((a, b) => new Date(b.relapse_time) - new Date(a.relapse_time))[0]
      : null;
  }

  function streakStart(profile) {
    const relapse = latestRelapse();
    return new Date(relapse ? relapse.relapse_time : profile.created_at);
  }

  function diffParts(fromDate) {
    const seconds = Math.max(0, Math.floor((Date.now() - fromDate.getTime()) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { days, hours, minutes, seconds: secs, totalDays: seconds / 86400 };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateTimer(profile) {
    const parts = diffParts(streakStart(profile));
    document.getElementById("daysValue").textContent = parts.days;
    document.getElementById("hoursValue").textContent = pad(parts.hours);
    document.getElementById("minutesValue").textContent = pad(parts.minutes);
    document.getElementById("secondsValue").textContent = pad(parts.seconds);

    const goal = Number(profile.goal_days || profile.goalDays || 90);
    const percent = Math.min(100, Math.floor((parts.totalDays / goal) * 100));
    document.getElementById("progressFill").style.width = `${percent}%`;
    document.getElementById("progressCopy").textContent = `${Math.floor(parts.totalDays)} / ${goal} days complete - ${percent}%`;
  }

  function setTheme(theme) {
    localStorage.setItem("seedguard_timer_theme", theme);
    document.querySelector(".timer-panel").classList.toggle("cyber", theme === "cyber");
    document.querySelectorAll("[data-timer-theme]").forEach((button) => {
      button.classList.toggle("active", button.dataset.timerTheme === theme);
    });
  }

  function logRelapse() {
    const relapses = readJson(relapsesKey, []);
    relapses.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      relapse_time: new Date().toISOString(),
      reason: "Manual reset from dashboard",
    });
    writeJson(relapsesKey, relapses);
    document.getElementById("actionStatus").textContent = "Streak reset logged. Timer restarted.";
  }

  function saveNote() {
    const note = document.getElementById("noteBox").value.trim();
    if (!note) {
      document.getElementById("actionStatus").textContent = "Write a note first, then save it.";
      return;
    }
    const journals = readJson(journalsKey, []);
    journals.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      note,
      created_at: new Date().toISOString(),
    });
    writeJson(journalsKey, journals);
    document.getElementById("noteBox").value = "";
    document.getElementById("actionStatus").textContent = "Note saved to this browser.";
  }

  function logout() {
    localStorage.removeItem(currentUserKey);
    window.location.href = "../index.html";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const profile = getProfile();
    if (!profile) return;

    document.getElementById("userName").textContent = profile.username || profile.name || "Guest";
    document.getElementById("userMode").textContent = profile.account_mode === "guest" ? "Guest mode" : "Signed in";
    document.getElementById("goalLabel").textContent = `${profile.goal_days || 90} day target`;

    setTheme(localStorage.getItem("seedguard_timer_theme") || "default");
    updateTimer(profile);
    setInterval(() => updateTimer(profile), 1000);

    document.querySelectorAll("[data-timer-theme]").forEach((button) => {
      button.addEventListener("click", () => setTheme(button.dataset.timerTheme));
    });
    document.getElementById("relapseButton").addEventListener("click", logRelapse);
    document.getElementById("saveNoteButton").addEventListener("click", saveNote);
    document.getElementById("panicButton").addEventListener("click", () => {
      document.getElementById("panicText").textContent = "Pause. Breathe for 30 seconds. The urge is temporary; the record is yours to keep.";
    });
    document.getElementById("logoutButton").addEventListener("click", logout);
  });
})();
