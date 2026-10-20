/*
 * Sign-in, own account and user management (server mode).
 *   (any page when signed out)   sign-in form
 *   #/account                    change own password
 *   #/users                      admin: add, edit, reset password, delete users
 */
(function () {
  "use strict";

  const { app, routes, esc, setActiveNav, formatDate, toast, loading, nav, store } = window.AVCIS;

  const ROLE_LABELS = { admin: "Admin", consultant: "Consultant", viewer: "Viewer (read-only)" };

  function renderLogin() {
    setActiveNav("");
    app.innerHTML = `
      <div class="login-wrap">
        <form class="panel login" id="login-form" novalidate>
          <h1>Sign in</h1>
          <p class="lead">Alphavito CIS Controls workspace</p>
          <label class="field">Username
            <input name="username" autocomplete="username" required autofocus>
          </label>
          <label class="field">Password
            <input name="password" type="password" autocomplete="current-password" required>
          </label>
          <button class="btn primary" type="submit">Sign in</button>
          <p class="form-error" id="login-error" role="alert"></p>
        </form>
      </div>`;
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const err = document.getElementById("login-error");
      const btn = form.querySelector("button");
      err.textContent = "";
      btn.disabled = true;
      try {
        await store.login(form.elements.username.value.trim(), form.elements.password.value);
        window.AVCIS.rerender();
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
        form.elements.password.select();
      }
    });
  }

  function passwordFields(prefix) {
    return `
      <label class="field">New password (min 10 characters)
        <input name="${prefix}new" type="password" autocomplete="new-password" minlength="10" required>
      </label>
      <label class="field">Repeat new password
        <input name="${prefix}repeat" type="password" autocomplete="new-password" minlength="10" required>
      </label>`;
  }

  function renderAccount() {
    setActiveNav("account");
    if (store.mode !== "server") return routes.notFound();
    const u = store.user;
    app.innerHTML = `
      <h1>My account</h1>
      <p class="lead">${esc(u.name || u.username)} · ${esc(u.username)} · ${esc(ROLE_LABELS[u.role] || u.role)}</p>
      <form class="panel form narrow" id="pw-form" novalidate>
        <h2>Change password</h2>
        <label class="field">Current password
          <input name="current" type="password" autocomplete="current-password" required>
        </label>
        ${passwordFields("")}
        <div class="form-actions">
          <button class="btn primary" type="submit">Change password</button>
          <span class="form-error" id="pw-error" role="alert"></span>
        </div>
      </form>`;
    const form = document.getElementById("pw-form");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const err = document.getElementById("pw-error");
      const f = form.elements;
      err.textContent = "";
      if (f.new.value !== f.repeat.value) { err.textContent = "New passwords do not match."; return; }
      try {
        await store.changePassword(f.current.value, f.new.value);
        form.reset();
        toast("Password changed.");
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
  }

  async function renderUsers() {
    setActiveNav("users");
    if (!store.isAdmin()) return routes.notFound();
    const t = nav.current();
    app.innerHTML = loading();
    let users;
    try {
      users = await store.users.list();
    } catch (ex) {
      if (t === nav.current()) app.innerHTML = `<h1>Users</h1><div class="panel warn">${esc(ex.message)}</div>`;
      return;
    }
    if (t !== nav.current()) return;

    const roleSelect = (name, selected) => `<select name="${name}">${Object.keys(ROLE_LABELS).map(r =>
      `<option value="${r}" ${r === selected ? "selected" : ""}>${esc(ROLE_LABELS[r])}</option>`).join("")}</select>`;

    app.innerHTML = `
      <h1>Users</h1>
      <p class="lead">Admins manage users. Consultants create and edit assessments. Viewers can only read.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Username</th><th>Name</th><th>Role</th><th class="hide-sm">Created</th><th></th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr data-user="${esc(u.id)}">
                <td class="title">${esc(u.username)}${u.id === store.user.id ? ` <span class="badge">You</span>` : ""}</td>
                <td><input class="inline-input" name="name" value="${esc(u.name)}" maxlength="200" aria-label="Name"></td>
                <td>${roleSelect("role", u.role)}</td>
                <td class="hide-sm">${formatDate(u.createdAt)}</td>
                <td class="row-actions">
                  <button class="btn sm" type="button" data-act="save">Save</button>
                  <button class="btn sm" type="button" data-act="reset">Reset password</button>
                  ${u.id === store.user.id ? "" : `<button class="btn sm danger" type="button" data-act="delete">Delete</button>`}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <form class="panel form narrow" id="add-user" novalidate>
        <h2>Add user</h2>
        <div class="grid2">
          <label class="field">Username
            <input name="username" required maxlength="64" placeholder="e.g. j.doe" autocomplete="off">
          </label>
          <label class="field">Full name
            <input name="name" maxlength="200">
          </label>
          <label class="field">Role ${roleSelect("role", "consultant")}</label>
          <label class="field">Initial password (min 10 characters)
            <input name="password" type="password" minlength="10" required autocomplete="new-password">
          </label>
        </div>
        <div class="form-actions">
          <button class="btn primary" type="submit">Add user</button>
          <span class="form-error" id="add-error" role="alert"></span>
        </div>
      </form>`;

    app.querySelectorAll("tr[data-user] [data-act]").forEach(btn => btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      const id = row.dataset.user;
      const username = row.querySelector(".title").firstChild.textContent;
      try {
        if (btn.dataset.act === "save") {
          await store.users.update(id, { name: row.querySelector("[name=name]").value, role: row.querySelector("[name=role]").value });
          toast("User saved.");
        } else if (btn.dataset.act === "reset") {
          const pw = prompt(`New password for ${username} (min 10 characters):`);
          if (!pw) return;
          await store.users.update(id, { password: pw });
          toast("Password reset. Share it with the user securely.");
        } else if (btn.dataset.act === "delete") {
          if (!confirm(`Delete user ${username}? Their assessments are kept.`)) return;
          await store.users.remove(id);
          toast("User deleted.");
          renderUsers();
        }
      } catch (ex) {
        toast(ex.message);
      }
    }));

    const form = document.getElementById("add-user");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const err = document.getElementById("add-error");
      err.textContent = "";
      const f = form.elements;
      try {
        await store.users.create({ username: f.username.value.trim(), name: f.name.value.trim(), role: f.role.value, password: f.password.value });
        toast("User added.");
        renderUsers();
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
  }

  routes.login = renderLogin;
  routes.account = renderAccount;
  routes.users = renderUsers;
})();
